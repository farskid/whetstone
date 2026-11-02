import type { CellError, ErrorCode, Sheet, Value } from './types';

type Node =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'bool'; v: boolean }
  | { t: 'ref'; a: string }
  | { t: 'name'; n: string }
  | { t: 'neg'; e: Node }
  | { t: 'bin'; op: string; l: Node; r: Node };


const err = (code: ErrorCode): CellError => ({ error: code });
const isErr = (v: unknown): v is CellError => typeof v === 'object' && v !== null && 'error' in v;

function colToNum(col: string): number {
  let n = 0;
  for (const ch of col) n = n * 26 + ch.charCodeAt(0) - 64;
  return n;
}
function numToCol(n: number): string {
  let s = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}
function splitAddr(a: string): [number, number] | null {
  const m = /^([A-Z]+)([1-9]\d*)$/.exec(a.toUpperCase());
  return m ? [colToNum(m[1]), Number(m[2])] : null;
}
function normalize(address: string): string {
  const p = splitAddr(address.trim());
  if (!p) throw new Error(`Invalid address: ${address}`);
  return numToCol(p[0]) + p[1];
}
// ---------- parser ----------
const TOKEN = /\s*(?:(\d+(?:\.\d+)?)|"((?:[^"]|"")*)"|([A-Za-z_][A-Za-z0-9_.]*)|(<>|<=|>=|[-+*/^&=<>(),:]))/y;

function parseFormula(src: string): Node {
  const toks: { k: 'num' | 'str' | 'id' | 'op'; v: string }[] = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < src.length) {
    if (/^\s*$/.test(src.slice(TOKEN.lastIndex))) break;
    const m = TOKEN.exec(src);
    if (!m) throw new SyntaxError('bad token');
    if (m[1] !== undefined) toks.push({ k: 'num', v: m[1] });
    else if (m[2] !== undefined) toks.push({ k: 'str', v: m[2].replace(/""/g, '"') });
    else if (m[3] !== undefined) toks.push({ k: 'id', v: m[3].toUpperCase() });
    else toks.push({ k: 'op', v: m[4] });
  }
  let i = 0;
  const peek = (v: string) => toks[i]?.k === 'op' && toks[i].v === v;
  const eat = (v: string) => {
    if (!peek(v)) throw new SyntaxError(`expected ${v}`);
    i++;
  };
  const level = (ops: string[], next: () => Node) => (): Node => {
    let l = next();
    while (toks[i]?.k === 'op' && ops.includes(toks[i].v)) {
      const op = toks[i++].v;
      l = { t: 'bin', op, l, r: next() };
    }
    return l;
  };
  const unary = (): Node => {
    if (peek('-')) { i++; return { t: 'neg', e: unary() }; }
    if (peek('+')) { i++; return unary(); }
    return primary();
  };
  const mul = level(['*', '/'], unary);
  const add = level(['+', '-'], mul);
  const cat = level(['&'], add);
  const cmp = level(['=', '<>', '<', '>', '<=', '>='], cat);
  function primary(): Node {
    const tk = toks[i++];
    if (!tk) throw new SyntaxError('unexpected end');
    if (tk.k === 'num') return { t: 'num', v: Number(tk.v) };
    if (tk.k === 'str') return { t: 'str', v: tk.v };
    if (tk.k === 'op') {
      if (tk.v !== '(') throw new SyntaxError('unexpected ' + tk.v);
      const e = cmp();
      eat(')');
      return e;
    }
    const p = splitAddr(tk.v);
    if (p) {
      return { t: 'ref', a: numToCol(p[0]) + p[1] };
    }
    if (tk.v === 'TRUE' || tk.v === 'FALSE') return { t: 'bool', v: tk.v === 'TRUE' };
    if (/^[A-Z]+0\d*$/.test(tk.v)) throw new SyntaxError('bad reference');
    return { t: 'name', n: tk.v };
  }
  const ast = cmp();
  if (i !== toks.length) throw new SyntaxError('trailing input');
  return ast;
}

// ---------- coercion ----------
function toNumber(v: Value): number | CellError {
  if (isErr(v)) return v;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v === null) return 0;
  return err('#VALUE!');
}
function toText(v: Value): string | CellError {
  if (isErr(v)) return v;
  if (v === null) return '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return String(v);
}
function toBool(v: Value): boolean | CellError {
  if (isErr(v)) return v;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (v === null) return false;
  return err('#VALUE!');
}
const rank = (v: number | string | boolean) => (typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : 2);
function compare(a: Value, b: Value): number {
  const fill = (x: Value, other: Value): number | string | boolean =>
    x !== null ? (x as number | string | boolean) : typeof other === 'string' ? '' : typeof other === 'boolean' ? false : 0;
  const x = fill(a, b);
  const y = fill(b, a);
  if (rank(x) !== rank(y)) return rank(x) - rank(y);
  if (typeof x === 'string') {
    const [p, q] = [x.toLowerCase(), (y as string).toLowerCase()];
    return p < q ? -1 : p > q ? 1 : 0;
  }
  return Number(x) - Number(y);
}

export function createSheet(): Sheet {
  const inputs = new Map<string, string | number>();
  const asts = new Map<string, Node | null>();

  // Formulas are evaluated on read, so they always see current inputs.
  function valueOf(a: string): Value {
    const input = inputs.get(a);
    if (input === undefined) return null;
    if (!asts.has(a)) return input;
    const ast = asts.get(a);
    return ast ? evaluate(ast) : err('#ERROR!');
  }

  function evaluate(n: Node): Value {
    switch (n.t) {
      case 'num': case 'str': case 'bool': return n.v;
      case 'ref': return valueOf(n.a);
      case 'name': return err('#NAME?');
      case 'neg': {
        const v = toNumber(evaluate(n.e));
        return isErr(v) ? v : -v;
      }
      case 'bin': {
        const l = evaluate(n.l);
        const r = evaluate(n.r);
        if (isErr(l)) return l;
        if (isErr(r)) return r;
        if (n.op === '&') return (toText(l) as string) + (toText(r) as string);
        if (['=', '<>', '<', '>', '<=', '>='].includes(n.op)) {
          const c = compare(l, r);
          return { '=': c === 0, '<>': c !== 0, '<': c < 0, '>': c > 0, '<=': c <= 0, '>=': c >= 0 }[n.op]!;
        }
        const a = toNumber(l);
        const b = toNumber(r);
        if (isErr(a)) return a;
        if (isErr(b)) return b;
        if (n.op === '+') return a + b;
        if (n.op === '-') return a - b;
        if (n.op === '*') return a * b;
        if (b === 0) return err('#DIV/0!');
        return a / b;
      }
    }
  }

  return {
    set(address, input) {
      const a = normalize(address);
      asts.delete(a);
      inputs.delete(a);
      if (typeof input === 'number') inputs.set(a, input);
      else if (input.startsWith('=')) {
        inputs.set(a, input);
        let ast: Node | null = null;
        try { ast = parseFormula(input.slice(1)); } catch { ast = null; }
        asts.set(a, ast);
      } else if (input.trim() !== '') {
        inputs.set(a, /^\s*-?\d+(\.\d+)?\s*$/.test(input) ? Number(input) : input);
      }
    },
    get(address) {
      return valueOf(normalize(address));
    },
  };
}
