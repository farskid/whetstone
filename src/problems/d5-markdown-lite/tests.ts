import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Blocks';
const G2 = 'Inline';
const G3 = 'Links';
const G4 = 'Lists and quotes';

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'headings and paragraphs',
    run({ render }, { expect }) {
      expect(render('# Title\n\nFirst line\n  second line  \n\n\n### Third ')).toBe('<h1>Title</h1>\n<p>First line\nsecond line</p>\n<h3>Third</h3>');
      expect(render('#nope\n####### seven\n######')).toBe('<p>#nope\n####### seven</p>\n<h6></h6>');
      expect(render('para\n## interrupts')).toBe('<p>para</p>\n<h2>interrupts</h2>');
      expect(render('')).toBe('');
    },
  },
  {
    group: G1,
    title: 'text is HTML-escaped; CRLF is normalized',
    run({ render }, { expect }) {
      expect(render('<script>alert("x")</script> & co')).toBe('<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; co</p>');
      expect(render('# A\r\n\r\nb\r\nc\rd')).toBe('<h1>A</h1>\n<p>b\nc\nd</p>');
    },
  },
  {
    group: G1,
    title: 'fenced code keeps content verbatim',
    run({ render }, { expect }) {
      expect(render('```ts\nconst a = 1 < 2;\n\n*not em*\n```\nafter')).toBe('<pre><code class="language-ts">const a = 1 &lt; 2;\n\n*not em*\n</code></pre>\n<p>after</p>');
      expect(render('text\n```\n# not heading')).toBe('<p>text</p>\n<pre><code># not heading\n</code></pre>');
      expect(render('```\n```')).toBe('<pre><code></code></pre>');
    },
  },
  {
    group: G2,
    title: 'emphasis, strong and nesting',
    run({ render }, { expect }) {
      expect(render('*em* _em_ **strong** __strong__')).toBe('<p><em>em</em> <em>em</em> <strong>strong</strong> <strong>strong</strong></p>');
      expect(render('*a **b** c* and **a *b* c**')).toBe('<p><em>a <strong>b</strong> c</em> and <strong>a <em>b</em> c</strong></p>');
      expect(render('a*b*c')).toBe('<p>a<em>b</em>c</p>');
      expect(render('*a**b**c*')).toBe('<p><em>a<strong>b</strong>c</em></p>');
    },
  },
  {
    group: G2,
    title: 'things that are not emphasis',
    run({ render }, { expect }) {
      expect(render('snake_case_name and 2 * 3 * 4')).toBe('<p>snake_case_name and 2 * 3 * 4</p>');
      expect(render('file_name_ here, a * b*')).toBe('<p>file_name_ here, a * b*</p>');
      expect(render('**unclosed and *also')).toBe('<p>**unclosed and *also</p>');
      expect(render('\\*literal\\* \\_x\\_ C:\\path')).toBe('<p>*literal* _x_ C:\\path</p>');
      expect(render('* not a list?')).toBe('<ul>\n<li>not a list?</li>\n</ul>');
    },
  },
  {
    group: G2,
    title: 'code spans',
    run({ render }, { expect }) {
      expect(render('use `a*b*` and `<b>`')).toBe('<p>use <code>a*b*</code> and <code>&lt;b&gt;</code></p>');
      expect(render('``has ` tick`` and `unclosed')).toBe('<p><code>has ` tick</code> and `unclosed</p>');
      expect(render('*em `*` em*')).toBe('<p><em>em <code>*</code> em</em></p>');
    },
  },
  {
    group: G3,
    title: 'links render text inline and escape the href',
    run({ render }, { expect }) {
      expect(render('see [the *docs*](https://x.dev/a?b=1&c="2") now')).toBe('<p>see <a href="https://x.dev/a?b=1&amp;c=&quot;2&quot;">the <em>docs</em></a> now</p>');
      expect(render('[rel](/path) [mail](mailto:a@b.c) [a [b] c](x)')).toBe('<p><a href="/path">rel</a> <a href="mailto:a@b.c">mail</a> <a href="x">a [b] c</a></p>');
      expect(render('[no](has space) [no] (x) [unclosed](x')).toBe('<p>[no](has space) [no] (x) [unclosed](x</p>');
      expect(render('[outer [inner](a)](b)')).toBe('<p><a href="b">outer [inner](a)</a></p>');
    },
  },
  {
    group: G3,
    title: 'unsafe URL schemes become #',
    run({ render }, { expect }) {
      expect(render('[a](javascript:alert`1`)')).toBe('<p><a href="#">a</a></p>');
      expect(render('[a](JaVaScRiPt:x) [b](data:text/html,x) [c](vbscript:x)')).toBe('<p><a href="#">a</a> <a href="#">b</a> <a href="#">c</a></p>');
      expect(render('[a](java\u0001script:x) [b](HTTPS://ok.dev)')).toBe('<p><a href="#">a</a> <a href="HTTPS://ok.dev">b</a></p>');
    },
  },
  {
    group: G4,
    title: 'lists: kinds, start numbers, and what ends them',
    run({ render }, { expect }) {
      expect(render('- a\n+ b\n* c')).toBe('<ul>\n<li>a</li>\n<li>b</li>\n<li>c</li>\n</ul>');
      expect(render('3. x\n4. **y**\n- z')).toBe('<ol start="3">\n<li>x</li>\n<li><strong>y</strong></li>\n</ol>\n<ul>\n<li>z</li>\n</ul>');
      expect(render('1. one\n\npara\n- a\n\n- b')).toBe('<ol>\n<li>one</li>\n</ol>\n<p>para</p>\n<ul>\n<li>a</li>\n</ul>\n<ul>\n<li>b</li>\n</ul>');
    },
  },
  {
    group: G4,
    title: 'nested lists and blockquotes',
    run({ render }, { expect }) {
      expect(render('- a\n- b\n  - c\n    1. d\n- e')).toBe('<ul>\n<li>a</li>\n<li>b\n<ul>\n<li>c\n<ol>\n<li>d</li>\n</ol>\n</li>\n</ul>\n</li>\n<li>e</li>\n</ul>');
      expect(render('- item\n    > quoted\n    # head')).toBe('<ul>\n<li>item\n<blockquote>\n<p>quoted</p>\n</blockquote>\n<h1>head</h1>\n</li>\n</ul>');
      expect(render('- item\n   odd indent')).toBe('<ul>\n<li>item\n<p>odd indent</p>\n</li>\n</ul>');
      expect(render('> # Q\n> - li\n>\n> > deep\nafter')).toBe('<blockquote>\n<h1>Q</h1>\n<ul>\n<li>li</li>\n</ul>\n<blockquote>\n<p>deep</p>\n</blockquote>\n</blockquote>\n<p>after</p>');
      expect(render('>no space')).toBe('<blockquote>\n<p>no space</p>\n</blockquote>');
    },
  },
];
