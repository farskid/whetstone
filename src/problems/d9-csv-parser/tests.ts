import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Rows and fields';
const G2 = 'RFC 4180 quoting';
const G3 = 'Headers and typing';
const G4 = 'Streaming';

function collect(mod: M, chunks: string[], delimiter?: string) {
  const rows: Array<[number, string[]]> = [];
  const errors: unknown[] = [];
  const p = mod.createParser({ delimiter, onRow: (f, r) => rows.push([r, f]), onError: (e) => errors.push(e) });
  for (const c of chunks) p.write(c);
  p.end();
  return { rows, errors };
}

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'rows and fields; trailing newline adds nothing; empty lines skipped',
    run({ parse }, { expect }) {
      expect(parse('a,b,c\n1,2,3\n').data).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
      expect(parse('a,b\n\n\nc,d').data).toEqual([['a', 'b'], ['c', 'd']]);
      expect(parse('a,\n,\nx').data).toEqual([['a', ''], ['', ''], ['x']]);
      expect(parse('').data).toEqual([]);
    },
  },
  {
    group: G1,
    title: 'CRLF, lone CR and a custom delimiter',
    run({ parse }, { expect }) {
      expect(parse('a,b\r\nc,d\re,f\r\n').data).toEqual([['a', 'b'], ['c', 'd'], ['e', 'f']]);
      expect(parse('a\tb\tc', { delimiter: '\t' }).data).toEqual([['a', 'b', 'c']]);
    },
  },
  {
    group: G2,
    title: 'quoted delimiters, newlines and "" escapes',
    run({ parse }, { expect }) {
      const r = parse('id,text\n1,"x, y"\n2,"line1\r\nline2"\n3,"say ""hi"""\n4,""\n');
      expect(r.data).toEqual([['id', 'text'], ['1', 'x, y'], ['2', 'line1\r\nline2'], ['3', 'say "hi"'], ['4', '']]);
      expect(r.errors).toEqual([]);
    },
  },
  {
    group: G2,
    title: 'quotes inside unquoted fields and text after a closing quote are literal; BOM stripped',
    run({ parse }, { expect }) {
      expect(parse('\uFEFFa"b,5" tall\n"q"tail,x').data).toEqual([['a"b', '5" tall'], ['qtail', 'x']]);
    },
  },
  {
    group: G2,
    title: 'an unclosed quote is reported with its row and the record is still emitted',
    run({ parse }, { expect }) {
      const r = parse('a,b\nc,"never closed\nd,e');
      expect(r.data).toEqual([['a', 'b'], ['c', 'never closed\nd,e']]);
      expect(r.errors).toEqual([{ row: 2, message: 'Unclosed quote' }]);
    },
  },
  {
    group: G3,
    title: 'header rows become object keys; ragged rows are reported by row number',
    run({ parse }, { expect }) {
      const r = parse('name,age\nAda,36\nBob\nCy,1,extra\n"Hopper, Grace",85', { header: true });
      expect(r.data).toEqual([{ name: 'Ada', age: '36' }, { name: 'Hopper, Grace', age: '85' }]);
      expect(r.errors).toEqual([{ row: 3, message: 'Expected 2 fields, got 1' }, { row: 4, message: 'Expected 2 fields, got 3' }]);
    },
  },
  {
    group: G3,
    title: 'dynamic typing: numbers, booleans and empty as null',
    run({ parse }, { expect }) {
      const r = parse('n,f,b,e,s\n-12,3.5,true,,007x\n1e3,.5,false,"",0x1F', { header: true, dynamicTyping: true });
      expect(r.data).toEqual([
        { n: -12, f: 3.5, b: true, e: null, s: '007x' },
        { n: 1000, f: 0.5, b: false, e: null, s: '0x1F' },
      ]);
      expect(parse('1,x', { dynamicTyping: true }).data).toEqual([[1, 'x']]);
    },
  },
  {
    group: G3,
    title: 'delimiter detection uses the first record and ignores quoted text',
    run({ parse }, { expect }) {
      expect(parse('a;b;c\n1;2;3', { delimiter: 'auto' }).data).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
      expect(parse('"x,y,z"|b\n1|2', { delimiter: 'auto' }).data).toEqual([['x,y,z', 'b'], ['1', '2']]);
      expect(parse('a\tb\n1,2,3,4,5', { delimiter: 'auto' }).data).toEqual([['a', 'b'], ['1,2,3,4,5']]);
      expect(parse('single\nrow', { delimiter: 'auto' }).data).toEqual([['single'], ['row']]);
      expect(parse('a,b;c', { delimiter: 'auto' }).data, 'ties go to the earlier candidate').toEqual([['a', 'b;c']]);
    },
  },
  {
    group: G4,
    title: 'rows are emitted as soon as their line break arrives',
    run(mod, { expect }) {
      const rows: string[][] = [];
      const p = mod.createParser({ onRow: (f) => rows.push(f) });
      p.write('a,b\nc,');
      expect(rows).toEqual([['a', 'b']]);
      p.write('d\r');
      expect(rows.length, 'a CR ends the row immediately').toBe(2);
      p.write('\ne');
      expect(rows.length, 'the following LF is not a new empty row').toBe(2);
      p.end();
      expect(rows).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
    },
  },
  {
    group: G4,
    title: 'splits mid-quote, mid-escape and mid-CRLF give the same records',
    run(mod, { expect }) {
      const { rows } = collect(mod, ['a,"b', '""', 'c\r', '\nd"', ',e\r', '\n', 'f']);
      expect(rows).toEqual([[1, ['a', 'b"c\r\nd', 'e']], [2, ['f']]]);
    },
  },
  {
    group: G4,
    title: 'every one- and two-cut split matches the one-shot parse',
    run(mod, { expect }) {
      const input = '\uFEFFid,"na,me"\r\n1,"a ""q""\r\nb"\r\r\n2,x"y\n\n3,\n';
      const whole = collect(mod, [input]);
      expect(whole.rows.length).toBe(4);
      const chars = [...input];
      for (let i = 0; i <= chars.length; i++) {
        for (let j = i; j <= chars.length; j++) {
          const got = collect(mod, [chars.slice(0, i).join(''), chars.slice(i, j).join(''), chars.slice(j).join('')]);
          if (JSON.stringify(got) !== JSON.stringify(whole)) {
            expect(got, `split at ${i},${j}`).toEqual(whole);
            return;
          }
        }
      }
    },
  },
];
