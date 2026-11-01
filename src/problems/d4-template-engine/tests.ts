import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Variables';
const G2 = 'Sections';
const G3 = 'Partials and helpers';
const G4 = 'compile and errors';

function catchErr(fn: () => unknown): { message: string; line?: number; column?: number; name?: string } {
  try { fn(); } catch (e) { return e as Error & { line: number; column: number }; }
  return { message: 'no error' };
}

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'variables are escaped; raw tags are not; missing renders empty',
    run({ render }, { expect }) {
      const d = { name: `<b>"Tom" & 'Jerry'</b>`, html: '<i>hi</i>', zero: 0, no: false, nil: null };
      expect(render('Hi {{name}}!', d)).toBe('Hi &lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;!');
      expect(render('{{{html}}}|{{& html}}|{{ html }}', d)).toBe('<i>hi</i>|<i>hi</i>|&lt;i&gt;hi&lt;/i&gt;');
      expect(render('[{{missing}}][{{nil}}][{{zero}}][{{no}}][{{! a comment }}]', d)).toBe('[][][0][false][]');
      expect(render('no tags\n  kept  ', d)).toBe('no tags\n  kept  ');
    },
  },
  {
    group: G1,
    title: 'dotted paths follow own properties only',
    run({ render }, { expect }) {
      const d = { user: { name: 'Ada', address: { city: 'London' } } };
      expect(render('{{user.name}} from {{user.address.city}}{{user.address.zip.code}}', d)).toBe('Ada from London');
      expect(render('[{{constructor}}][{{user.constructor.name}}][{{__proto__}}][{{user.toString}}]', d)).toBe('[][][][]');
      expect(render('[{{__proto__.x}}]', JSON.parse('{"__proto__":{"x":"leak"}}'))).toBe('[]');
    },
  },
  {
    group: G2,
    title: 'loops push each item; {{.}} is the current item',
    run({ render }, { expect }) {
      expect(render('{{#xs}}<{{.}}>{{/xs}}', { xs: ['a', 'b', 3] })).toBe('<a><b><3>');
      expect(render('{{#people}}{{name}}:{{#pets}}{{.}},{{/pets}};{{/people}}', {
        people: [{ name: 'A', pets: ['cat', 'dog'] }, { name: 'B', pets: [] }],
      })).toBe('A:cat,dog,;B:;');
    },
  },
  {
    group: G2,
    title: 'the context stack falls back to outer scopes',
    run({ render }, { expect }) {
      const d = { author: 'anon', site: { name: 'S' }, items: [{ name: 'Dune', author: 'Herbert' }, { name: 'Untitled' }] };
      expect(render('{{#items}}{{name}} by {{author}} on {{site.name}}. {{/items}}', d)).toBe('Dune by Herbert on S. Untitled by anon on S. ');
      expect(render('{{#a}}{{#b}}{{x}}{{y}}{{z}}{{/b}}{{/a}}', { z: 3, a: { y: 2, x: 'outer', b: { x: 1 } } })).toBe('123');
      expect(render('{{#a}}{{b.c}}{{/a}}', { b: { c: 'outer' }, a: { b: {} } }), 'only the first segment is searched up the stack').toBe('');
    },
  },
  {
    group: G2,
    title: 'truthiness, objects and inverted sections',
    run({ render }, { expect }) {
      const t = '{{#v}}yes{{/v}}{{^v}}no{{/v}}';
      for (const [v, out] of [[true, 'yes'], [false, 'no'], [0, 'no'], ['', 'no'], [[], 'no'], [null, 'no'], [undefined, 'no'], ['x', 'yes'], [[0], 'yes']] as const) {
        expect(render(t, { v }), JSON.stringify(v)).toBe(out);
      }
      expect(render('{{#user}}{{name}}{{/user}}', { user: { name: 'Ada' } })).toBe('Ada');
      expect(render('{{#a.b}}{{c}}{{/a.b}}', { a: { b: { c: 'deep' } } })).toBe('deep');
    },
  },
  {
    group: G3,
    title: 'partials see the current context; missing partials render empty',
    run({ render }, { expect }) {
      const partials = { header: '<h1>{{title}}</h1>', item: '<li>{{name}}</li>' };
      expect(render('{{> header}}<ul>{{#items}}{{> item}}{{/items}}</ul>{{> nope}}', { title: 'T', items: [{ name: 'a' }, { name: 'b' }] }, { partials }))
        .toBe('<h1>T</h1><ul><li>a</li><li>b</li></ul>');
      const tree = { name: 'root', kids: [{ name: 'a', kids: [{ name: 'b', kids: [] }] }, { name: 'c', kids: [] }] };
      expect(render('{{> node}}', tree, { partials: { node: '{{name}}({{#kids}}{{> node}}{{/kids}})' } })).toBe('root(a(b())c())');
    },
  },
  {
    group: G3,
    title: 'infinitely recursive partials hit the depth limit',
    run({ render }, { expect }) {
      const e = catchErr(() => render('x{{> loop}}', {}, { partials: { loop: '-{{> loop}}' } }));
      expect(e.message).toContain('Partial depth limit exceeded');
      expect(e.name).toBe('TemplateError');
      const deep = render('{{> d}}', { n: 1 }, { partials: { d: '{{#n}}.{{/n}}' } });
      expect(deep).toBe('.');
    },
  },
  {
    group: G3,
    title: 'helpers take literal and looked-up arguments, beat data, and are escaped',
    run({ render }, { expect }) {
      const helpers = {
        upper: (s: unknown) => String(s).toUpperCase(),
        join: (...a: unknown[]) => a.join('|'),
        now: () => '<now>',
        name: () => 'helper wins',
      };
      expect(render('{{upper user.first}} {{join "a b" \'c\' 2 -1.5 user.first missing}}', { user: { first: 'ada' } }, { helpers })).toBe('ADA a b|c|2|-1.5|ada|');
      expect(render('{{now}} {{{now}}} {{name}}', { name: 'data' }, { helpers })).toBe('&lt;now&gt; <now> helper wins');
      expect(render('{{#xs}}{{upper .}}{{/xs}}', { xs: ['a', 'b'] }, { helpers })).toBe('AB');
      const e = catchErr(() => render('ok\n {{lower name}}', {}, { helpers }));
      expect(e.message).toBe('Unknown helper "lower" (line 2, column 2)');
    },
  },
  {
    group: G4,
    title: 'compile returns a reusable function',
    run({ compile }, { expect }) {
      const t = compile('{{#xs}}{{.}}{{/xs}}-{{> p}}', { partials: { p: '{{n}}' } });
      expect(t({ xs: [1, 2], n: 'a' })).toBe('12-a');
      expect(t({ xs: [], n: 'b' })).toBe('-b');
    },
  },
  {
    group: G4,
    title: 'syntax errors carry line and column of the responsible tag',
    run({ compile, render }, { expect }) {
      let e = catchErr(() => compile('<ul>\n  {{#items}}\n    <li>{{name}}</li>\n</ul>'));
      expect(e.message).toBe('Unclosed section "items" (line 2, column 3)');
      expect([e.line, e.column]).toEqual([2, 3]);
      e = catchErr(() => compile('{{#a}}{{#b}}x{{/a}}{{/b}}'));
      expect(e.message).toBe('Unexpected closing tag "a" (line 1, column 14)');
      e = catchErr(() => compile('text {{/a}}'));
      expect(e.message).toBe('Unexpected closing tag "a" (line 1, column 6)');
      e = catchErr(() => render('a\nb {{name', {}));
      expect(e.message).toBe('Unclosed tag (line 2, column 3)');
      e = catchErr(() => compile('{{{raw}}'));
      expect(e.message).toBe('Unclosed tag (line 1, column 1)');
    },
  },
];
