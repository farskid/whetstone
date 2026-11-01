import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

type AnyMark = { type: string; href?: string; color?: string };
/** Spans as short strings, e.g. "Hel[bold]" or "x[link=/a,bold]". */
const show = (spans: { text: string; marks: AnyMark[] }[]) =>
  spans.map((s) => `${s.text}[${s.marks.map((m) => m.type + (m.href !== undefined ? `=${m.href}` : m.color !== undefined ? `=${m.color}` : '')).join(',')}]`);

const errorName = (f: () => void) => {
  try {
    f();
    return 'no error';
  } catch (e) {
    return (e as Error).name;
  }
};

const B = { type: 'bold' as const };
const I = { type: 'italic' as const };

export const tests: TestCase<M>[] = [
  {
    group: 'Spans and marks',
    title: 'addMark splits spans where the range starts and ends',
    run({ createEditor }, { expect }) {
      const ed = createEditor([{ text: 'Hello world', marks: [] }]);
      ed.addMark(0, 5, 'bold');
      expect(show(ed.getSpans())).toEqual(['Hello[bold]', ' world[]']);
      ed.addMark(3, 8, 'italic');
      expect(show(ed.getSpans())).toEqual(['Hel[bold]', 'lo[bold,italic]', ' wo[italic]', 'rld[]']);
      expect(ed.getText()).toBe('Hello world');
      ed.addMark(0, 11, { type: 'underline' });
      expect(show(ed.getSpans())).toEqual(['Hel[bold,underline]', 'lo[bold,italic,underline]', ' wo[italic,underline]', 'rld[underline]']);
    },
  },
  {
    group: 'Spans and marks',
    title: 'handles empty ranges, span edges and bad ranges',
    run({ createEditor }, { expect }) {
      const ed = createEditor([{ text: 'ab', marks: [B] }, { text: 'cd', marks: [] }]);
      ed.addMark(2, 2, 'italic');
      ed.removeMark(1, 1, 'bold');
      expect(show(ed.getSpans()), 'empty ranges change nothing').toEqual(['ab[bold]', 'cd[]']);
      ed.addMark(2, 4, 'bold');
      expect(show(ed.getSpans()), 'a range on a span edge merges cleanly').toEqual(['abcd[bold]']);
      ed.removeMark(0, 2, 'bold');
      expect(show(ed.getSpans())).toEqual(['ab[]', 'cd[bold]']);
      ed.addMark(4, 4, 'code');
      expect(show(ed.getSpans())).toEqual(['ab[]', 'cd[bold]']);
      expect(errorName(() => ed.addMark(3, 1, 'bold'))).toBe('RangeError');
      expect(errorName(() => ed.addMark(0, 5, 'bold'))).toBe('RangeError');
      expect(errorName(() => ed.removeMark(-1, 2, 'bold'))).toBe('RangeError');
      expect(errorName(() => ed.insertText(5, 'x'))).toBe('RangeError');
      const out = ed.getSpans();
      out[1].text = 'zz';
      out[1].marks.length = 0;
      expect(show(ed.getSpans()), 'getSpans returns copies').toEqual(['ab[]', 'cd[bold]']);
      expect(createEditor().getSpans()).toEqual([]);
    },
  },
  {
    group: 'Spans and marks',
    title: 'normalizes its input and is idempotent',
    run({ createEditor, normalize }, { expect }) {
      const messy = [
        { text: '', marks: [B] },
        { text: 'a', marks: [I, B] },
        { text: 'b', marks: [B, I, { type: 'italic' as const }] },
        { text: '', marks: [] },
        { text: 'c', marks: [{ type: 'code' as const }, { type: 'link' as const, href: '/x' }] },
        { text: 'd', marks: [{ type: 'link' as const, href: '/x' }, { type: 'code' as const }] },
      ];
      const once = normalize(messy);
      expect(show(once)).toEqual(['ab[bold,italic]', 'cd[link=/x,code]']);
      expect(normalize(once), 'normalizing twice changes nothing').toEqual(once);
      expect(createEditor(messy).getSpans()).toEqual(once);
      (once[1].marks[0] as { href: string }).href = '/changed';
      expect(show(messy.slice(1, 2).concat(messy.slice(4))), 'the input is not mutated or shared').toEqual(['a[italic,bold]', 'c[code,link=/x]', 'd[link=/x,code]']);
      expect(show(normalize([{ text: 'x', marks: [{ type: 'color', color: 'red' }, { type: 'color', color: 'blue' }] }])), 'one mark per type; the last wins').toEqual(['x[color=blue]']);
    },
  },
  {
    group: 'Toggle and normalize',
    title: 'toggleMark removes a mark the whole range has, otherwise adds it',
    run({ createEditor }, { expect }) {
      const ed = createEditor([{ text: 'one ', marks: [B] }, { text: 'two', marks: [] }]);
      ed.toggleMark(0, 7, 'bold');
      expect(show(ed.getSpans()), 'partly bold becomes all bold').toEqual(['one two[bold]']);
      ed.toggleMark(2, 5, 'bold');
      expect(show(ed.getSpans())).toEqual(['on[bold]', 'e t[]', 'wo[bold]']);
      ed.toggleMark(0, 7, 'italic');
      ed.toggleMark(0, 7, 'italic');
      expect(show(ed.getSpans())).toEqual(['on[bold]', 'e t[]', 'wo[bold]']);
      ed.toggleMark(0, 2, 'bold');
      ed.toggleMark(5, 7, 'bold');
      expect(show(ed.getSpans()), 'spans merge back into one').toEqual(['one two[]']);
    },
  },
  {
    group: 'Toggle and normalize',
    title: 'removing a middle mark merges the neighbours',
    run({ createEditor }, { expect }) {
      const ed = createEditor([
        { text: 'a', marks: [B] },
        { text: 'b', marks: [B, I] },
        { text: 'c', marks: [B, { type: 'link', href: '/l' }] },
        { text: 'd', marks: [B] },
      ]);
      ed.removeMark(0, 4, 'italic');
      expect(show(ed.getSpans())).toEqual(['ab[bold]', 'c[link=/l,bold]', 'd[bold]']);
      ed.removeMark(0, 4, 'link');
      expect(show(ed.getSpans())).toEqual(['abcd[bold]']);
      ed.deleteText(1, 3);
      expect(show(ed.getSpans())).toEqual(['ad[bold]']);
      ed.deleteText(0, 2);
      expect(ed.getSpans()).toEqual([]);
    },
  },
  {
    group: 'Typing',
    title: 'typed text takes the marks of the character before the cursor',
    run({ createEditor }, { expect }) {
      const ed = createEditor([{ text: 'ab', marks: [B] }, { text: 'cd', marks: [I] }]);
      ed.insertText(2, 'X');
      expect(show(ed.getSpans()), 'at a boundary the left side wins').toEqual(['abX[bold]', 'cd[italic]']);
      ed.insertText(0, 'Y');
      expect(show(ed.getSpans()), 'at the start it takes the first character’s marks').toEqual(['YabX[bold]', 'cd[italic]']);
      ed.insertText(6, 'Z');
      ed.insertText(5, '');
      expect(show(ed.getSpans())).toEqual(['YabX[bold]', 'cdZ[italic]']);
      expect(show([{ text: '', marks: ed.marksAt(5) }])).toEqual(['[italic]']);
      const empty = createEditor();
      empty.insertText(0, 'hi');
      expect(show(empty.getSpans())).toEqual(['hi[]']);
    },
  },
  {
    group: 'Typing',
    title: 'links are not inclusive at their edges',
    run({ createEditor }, { expect }) {
      const link = { type: 'link' as const, href: '/a' };
      const ed = createEditor([{ text: 'go', marks: [link, B] }, { text: '!', marks: [] }]);
      ed.insertText(2, 'X');
      expect(show(ed.getSpans()), 'typing at the end keeps bold but not the link').toEqual(['go[link=/a,bold]', 'X[bold]', '![]']);
      ed.insertText(0, 'Y');
      expect(show(ed.getSpans())).toEqual(['Y[bold]', 'go[link=/a,bold]', 'X[bold]', '![]']);
      ed.insertText(2, 'o');
      expect(show(ed.getSpans()), 'inside the link it is kept').toEqual(['Y[bold]', 'goo[link=/a,bold]', 'X[bold]', '![]']);
      const two = createEditor([{ text: 'a', marks: [link] }, { text: 'b', marks: [{ type: 'link', href: '/b' }] }]);
      expect(two.marksAt(1), 'between two different links').toEqual([]);
    },
  },
  {
    group: 'Typing',
    title: 'a collapsed toggle sets stored marks for the next typing at that spot',
    run({ createEditor }, { expect }) {
      const ed = createEditor([{ text: 'plain', marks: [] }]);
      ed.toggleMark(5, 5, 'bold');
      expect(show(ed.getSpans()), 'nothing changes yet').toEqual(['plain[]']);
      expect(show([{ text: '', marks: ed.marksAt(5) }])).toEqual(['[bold]']);
      expect(ed.marksAt(4)).toEqual([]);
      ed.toggleMark(5, 5, 'italic');
      ed.insertText(5, '!');
      expect(show(ed.getSpans())).toEqual(['plain[]', '![bold,italic]']);
      ed.insertText(6, '?');
      expect(show(ed.getSpans()), 'plain typing continues the marks').toEqual(['plain[]', '!?[bold,italic]']);
      ed.toggleMark(7, 7, 'bold');
      ed.insertText(7, 'x');
      expect(show(ed.getSpans()), 'toggling off a mark you are in').toEqual(['plain[]', '!?[bold,italic]', 'x[italic]']);
      ed.toggleMark(0, 0, 'code');
      ed.insertText(3, 'y');
      expect(show(ed.getSpans()), 'stored marks only apply at their position').toEqual(['playin[]', '!?[bold,italic]', 'x[italic]']);
      ed.toggleMark(0, 0, 'code');
      ed.deleteText(1, 2);
      ed.insertText(0, 'z');
      expect(show(ed.getSpans()), 'any edit clears them').toEqual(['zpayin[]', '!?[bold,italic]', 'x[italic]']);
      ed.toggleMark(0, 0, 'code');
      ed.toggleMark(0, 0, 'code');
      ed.insertText(0, 'w');
      expect(show(ed.getSpans()).slice(0, 1), 'toggling twice cancels').toEqual(['wzpayin[]']);
      const ed2 = createEditor([{ text: 'ab', marks: [] }]);
      ed2.toggleMark(1, 1, 'bold');
      ed2.insertText(1, 'X');
      ed2.insertText(1, 'Y');
      expect(show(ed2.getSpans()), 'stored marks are used once').toEqual(['aY[]', 'X[bold]', 'b[]']);
    },
  },
  {
    group: 'Attributes and HTML',
    title: 'marks with attributes replace marks of the same type',
    run({ createEditor }, { expect }) {
      const ed = createEditor([{ text: 'abcdef', marks: [] }]);
      ed.addMark(0, 6, { type: 'link', href: '/one' });
      ed.addMark(2, 4, { type: 'link', href: '/two' });
      expect(show(ed.getSpans())).toEqual(['ab[link=/one]', 'cd[link=/two]', 'ef[link=/one]']);
      ed.toggleMark(0, 6, { type: 'link', href: '/one' });
      expect(show(ed.getSpans()), 'not every character has /one, so it is applied').toEqual(['abcdef[link=/one]']);
      ed.toggleMark(0, 6, { type: 'link', href: '/one' });
      expect(show(ed.getSpans())).toEqual(['abcdef[]']);
      ed.addMark(0, 3, { type: 'color', color: 'red' });
      ed.addMark(1, 6, { type: 'color', color: 'blue' });
      ed.addMark(0, 6, 'bold');
      expect(show(ed.getSpans())).toEqual(['a[color=red,bold]', 'bcdef[color=blue,bold]']);
      ed.removeMark(0, 6, 'color');
      expect(show(ed.getSpans()), 'removeMark ignores attributes').toEqual(['abcdef[bold]']);
    },
  },
  {
    group: 'Attributes and HTML',
    title: 'serializes to HTML with shared outer tags and escaping',
    run({ createEditor, toHTML }, { expect }) {
      const ed = createEditor([
        { text: 'a', marks: [B] },
        { text: 'b', marks: [B, I] },
        { text: 'c', marks: [I] },
        { text: ' & ', marks: [] },
        { text: '<x>', marks: [{ type: 'code' }, { type: 'link', href: '/q?a=1&b="2"' }] },
        { text: 'y', marks: [{ type: 'color', color: 'red' }, { type: 'underline' }] },
      ]);
      expect(ed.toHTML()).toBe(
        '<strong>a<em>b</em></strong><em>c</em> &amp; <a href="/q?a=1&amp;b=&quot;2&quot;"><code>&lt;x&gt;</code></a><span style="color: red"><u>y</u></span>',
      );
      expect(toHTML([{ text: 'p', marks: [{ type: 'link', href: '/a' }] }, { text: 'q', marks: [{ type: 'link', href: '/b' }] }])).toBe('<a href="/a">p</a><a href="/b">q</a>');
      expect(toHTML([{ text: 'x', marks: [I, B] }, { text: 'y', marks: [B] }]), 'tags nest in a fixed order').toBe('<strong><em>x</em>y</strong>');
      expect(createEditor().toHTML()).toBe('');
    },
  },
  {
    group: 'Attributes and HTML',
    title: 'parseHTML reads the HTML back into the same spans',
    run({ createEditor, parseHTML }, { expect }) {
      const docs = [
        [{ text: 'a', marks: [B] }, { text: 'b', marks: [B, I] }, { text: 'c', marks: [I] }],
        [{ text: '1 < 2 & "q"', marks: [{ type: 'link' as const, href: '/s?x=1&y="2"' }, { type: 'code' as const }] }, { text: ' tail', marks: [] }],
        [{ text: 'red', marks: [{ type: 'color' as const, color: '#f00' }, { type: 'underline' as const }] }, { text: 'blue', marks: [{ type: 'color' as const, color: 'blue' }] }],
      ];
      for (const doc of docs) {
        const spans = createEditor(doc).getSpans();
        expect(parseHTML(createEditor(doc).toHTML()), 'round trip').toEqual(spans);
      }
      expect(show(parseHTML('<p><b>x</b><i>y<B>z</B></i> <a href="/h">l</a></p>'))).toEqual(['x[bold]', 'y[italic]', 'z[bold,italic]', ' []', 'l[link=/h]']);
      expect(show(parseHTML('<em>a<strong>b</strong>c</em>d'))).toEqual(['a[italic]', 'b[bold,italic]', 'c[italic]', 'd[]']);
      expect(show(parseHTML('a &lt;b&gt; &amp;lt; &#39;')), 'each entity is decoded once').toEqual(["a <b> &lt; '[]"]);
      expect(show(parseHTML('<b>x<i>y</b>z</i>w')), 'a closing tag closes everything opened inside it').toEqual(['x[bold]', 'y[bold,italic]', 'zw[]']);
    },
  },
];
