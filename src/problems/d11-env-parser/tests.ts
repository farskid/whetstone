import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'KEY=value';
const G2 = 'Quotes and comments';
const G3 = 'Expansion';

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'parses KEY=value lines and skips comments and blank lines',
    run({ parse }, { expect }) {
      expect(parse('A=1\n\n# comment\nB=hello world\n   C=3\nnot a pair\n')).toEqual({ A: '1', B: 'hello world', C: '3' });
    },
  },
  {
    group: G1,
    title: 'spaces around =, = inside values, empty values, later keys win',
    run({ parse }, { expect }) {
      expect(parse('A = spaced  \nURL=postgres://u:p@h/db?x=1\nEMPTY=\nA=again')).toEqual({ A: 'again', URL: 'postgres://u:p@h/db?x=1', EMPTY: '' });
    },
  },
  {
    group: G1,
    title: 'CRLF line endings, BOM and export prefixes',
    run({ parse }, { expect }) {
      expect(parse('\uFEFFexport A=1\r\nexport  B="two"\r\nexported=3\r\n')).toEqual({ A: '1', B: 'two', exported: '3' });
    },
  },
  {
    group: G2,
    title: 'single, double and backtick quotes; escapes only in double quotes',
    run({ parse }, { expect }) {
      const out = parse(`S='a\\nb'\nD="a\\nb"\nB=\`it's "fine"\`\nSP="  padded  "`);
      expect(out.S).toBe('a\\nb');
      expect(out.D).toBe('a\nb');
      expect(out.B).toBe(`it's "fine"`);
      expect(out.SP).toBe('  padded  ');
    },
  },
  {
    group: G2,
    title: 'inline comments: after whitespace in unquoted values, after the closing quote',
    run({ parse }, { expect }) {
      expect(parse('A=value # note\nB=a#b\nC="has # hash" # note\nD=#all comment\nE=\'x\'trailing')).toEqual({ A: 'value', B: 'a#b', C: 'has # hash', D: '', E: 'x' });
    },
  },
  {
    group: G2,
    title: 'multiline quoted values span lines; an unclosed quote is read as unquoted',
    run({ parse }, { expect }) {
      const out = parse('KEY="-----BEGIN-----\nline2\n-----END-----"\nNEXT=1\nBAD="open\nAFTER=2');
      expect(out.KEY).toBe('-----BEGIN-----\nline2\n-----END-----');
      expect(out.NEXT).toBe('1');
      expect(out.BAD).toBe('"open');
      expect(out.AFTER).toBe('2');
    },
  },
  {
    group: G3,
    title: '${VAR} and $VAR from the file, then env',
    run({ parse, expand }, { expect }) {
      const parsed = parse('HOST=localhost\nURL=http://${HOST}:$PORT/x\nHOME_DIR=${HOME}/app');
      const out = expand(parsed, { PORT: '8080', HOME: '/home/sam', HOST: 'from-env' });
      expect(out).toEqual({ HOST: 'localhost', URL: 'http://localhost:8080/x', HOME_DIR: '/home/sam/app' });
      expect(parsed.URL, 'input untouched').toBe('http://${HOST}:$PORT/x');
    },
  },
  {
    group: G3,
    title: 'defaults with :- for unset or empty; unset without default is empty',
    run({ parse, expand }, { expect }) {
      const out = expand(parse('EMPTY=\nA=${MISSING:-fallback}\nB=${EMPTY:-was empty}\nC=[${MISSING}]\nD=${SET:-unused}'), { SET: 'set' });
      expect(out.A).toBe('fallback');
      expect(out.B).toBe('was empty');
      expect(out.C).toBe('[]');
      expect(out.D).toBe('set');
    },
  },
  {
    group: G3,
    title: 'references resolve recursively and in any order; \\$ escapes',
    run({ parse, expand }, { expect }) {
      const out = expand(parse('A=${B}-a\nB=${C}-b\nC=c\nPRICE=\\$5 and \\${NOT}'));
      expect(out).toEqual({ A: 'c-b-a', B: 'c-b', C: 'c', PRICE: '$5 and ${NOT}' });
      expect(Object.keys(out)).toEqual(['A', 'B', 'C', 'PRICE']);
    },
  },
  {
    group: G3,
    title: 'cycles throw with the chain',
    run({ parse, expand }, { expect }) {
      expect(() => expand(parse('A=${B}\nB=${C}\nC=${A}'))).toThrow('Circular reference: A -> B -> C -> A');
      expect(() => expand(parse('X=1\nSELF=$SELF'))).toThrow('Circular reference: SELF -> SELF');
    },
  },
];
