// Bug: IF evaluates both branches and propagates their errors
export type ErrorCode = '#DIV/0!' | '#VALUE!' | '#NAME?' | '#CYCLE!' | '#ERROR!';
export interface CellError { error: ErrorCode }
export type Value = number | string | boolean | null | CellError;
export type CustomFunction = (...args: (Value | Value[])[]) => number | string | boolean | null;

export interface Sheet {
  /** Set a cell's input; returns the addresses whose value changed, sorted by row then column. */
  set(address: string, input: string | number): string[];
  get(address: string): Value;
  define(name: string, fn: CustomFunction): void;
}

type Node =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'bool'; v: boolean }
  | { t: 'ref'; a: string }
  | { t: 'range'; cells: string[] }
  | { t: 'name'; n: string }
  | { t: 'neg'; e: Node }
  | { t: 'bin'; op: string; l: Node; r: Node }
  | { t: 'call'; n: string; args: Node[] };

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
const rowMajor = (a: string, b: string) => {
  const [ca, ra] = splitAddr(a)!;
  const [cb, rb] = splitAddr(b)!;
  return ra - rb || ca - cb;
};

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
    if (peek('(')) {
      i++;
      const args: Node[] = [];
      if (!peek(')')) {
        do args.push(cmp()); while (peek(',') && ++i);
      }
      eat(')');
      return { t: 'call', n: tk.v, args };
    }
    const p = splitAddr(tk.v);
    if (p) {
      if (peek(':')) {
        i++;
        const q = toks[i++];
        const p2 = q?.k === 'id' ? splitAddr(q.v) : null;
        if (!p2) throw new SyntaxError('bad range');
        const cells: string[] = [];
        for (let r = Math.min(p[1], p2[1]); r <= Math.max(p[1], p2[1]); r++)
          for (let c = Math.min(p[0], p2[0]); c <= Math.max(p[0], p2[0]); c++) cells.push(numToCol(c) + r);
        return { t: 'range', cells };
      }
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

function collectRefs(n: Node, out: Set<string>): Set<string> {
  switch (n.t) {
    case 'ref': out.add(n.a); break;
    case 'range': n.cells.forEach((c) => out.add(c)); break;
    case 'neg': collectRefs(n.e, out); break;
    case 'bin': collectRefs(n.l, out); collectRefs(n.r, out); break;
    case 'call': n.args.forEach((a) => collectRefs(a, out)); break;
  }
  return out;
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
  const values = new Map<string, Value>();
  const deps = new Map<string, Set<string>>();
  const dependents = new Map<string, Set<string>>();
  const custom = new Map<string, CustomFunction>();

  const valueOf = (a: string): Value => values.get(a) ?? null;

  function refValues(n: Node): Value[] | null {
    if (n.t === 'ref') return [valueOf(n.a)];
    if (n.t === 'range') return n.cells.map(valueOf);
    return null;
  }

  function numbersOf(args: Node[]): number[] | CellError {
    const nums: number[] = [];
    for (const a of args) {
      const rv = refValues(a);
      if (rv) {
        for (const v of rv) {
          if (isErr(v)) return v;
          if (typeof v === 'number') nums.push(v);
        }
      } else {
        const v = toNumber(evaluate(a));
        if (isErr(v)) return v;
        nums.push(v);
      }
    }
    return nums;
  }

  function call(n: { n: string; args: Node[] }): Value {
    switch (n.n) {
      case 'SUM': case 'MIN': case 'MAX': case 'AVERAGE': {
        const nums = numbersOf(n.args);
        if (isErr(nums)) return nums;
        if (n.n === 'SUM') return nums.reduce((s, x) => s + x, 0);
        if (n.n === 'AVERAGE') return nums.length ? nums.reduce((s, x) => s + x, 0) / nums.length : err('#DIV/0!');
        if (!nums.length) return 0;
        return n.n === 'MIN' ? Math.min(...nums) : Math.max(...nums);
      }
      case 'COUNT': {
        let c = 0;
        for (const a of n.args) for (const v of refValues(a) ?? [evaluate(a)]) if (typeof v === 'number') c++;
        return c;
      }
      case 'IF': {
        if (n.args.length < 2 || n.args.length > 3) return err('#VALUE!');
        const c = toBool(evaluate(n.args[0]));
        if (isErr(c)) return c;
        const t = evaluate(n.args[1]); const e = n.args[2] ? evaluate(n.args[2]) : false;
        if (isErr(t)) return t; if (isErr(e)) return e;
        return c ? t : e;
      }
      case 'CONCAT': {
        let s = '';
        for (const a of n.args) for (const v of refValues(a) ?? [evaluate(a)]) {
          const t = toText(v);
          if (isErr(t)) return t;
          s += t;
        }
        return s;
      }
    }
    const fn = custom.get(n.n);
    if (!fn) return err('#NAME?');
    const args: (Value | Value[])[] = [];
    for (const a of n.args) {
      const v = a.t === 'range' ? a.cells.map(valueOf) : evaluate(a);
      const bad = (Array.isArray(v) ? v : [v]).find(isErr);
      if (bad) return bad;
      args.push(v);
    }
    try {
      const r = fn(...args);
      return typeof r === 'number' && !Number.isFinite(r) ? err('#VALUE!') : r;
    } catch {
      return err('#VALUE!');
    }
  }

  function evaluate(n: Node): Value {
    switch (n.t) {
      case 'num': case 'str': case 'bool': return n.v;
      case 'ref': return valueOf(n.a);
      case 'range': return err('#VALUE!');
      case 'name': return err('#NAME?');
      case 'neg': {
        const v = toNumber(evaluate(n.e));
        return isErr(v) ? v : -v;
      }
      case 'call': return call(n);
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

  function computeOwn(a: string): Value {
    const input = inputs.get(a);
    if (input === undefined) return null;
    if (!asts.has(a)) return input;
    for (const d of deps.get(a) ?? []) {
      const v = valueOf(d);
      if (isErr(v) && v.error === '#CYCLE!') return v;
    }
    const ast = asts.get(a);
    return ast ? evaluate(ast) : err('#ERROR!');
  }

  const same = (x: Value, y: Value) => x === y || (isErr(x) && isErr(y) && x.error === y.error);

  function recalc(seeds: Iterable<string>): string[] {
    const affected = new Set<string>();
    const stack = [...seeds];
    while (stack.length) {
      const a = stack.pop()!;
      if (affected.has(a)) continue;
      affected.add(a);
      for (const d of dependents.get(a) ?? []) stack.push(d);
    }
    const pending = new Map<string, number>();
    for (const a of affected) {
      let k = 0;
      for (const d of deps.get(a) ?? []) if (affected.has(d)) k++;
      pending.set(a, k);
    }
    const ready = [...affected].filter((a) => pending.get(a) === 0);
    const changed: string[] = [];
    const commit = (a: string, v: Value) => {
      if (!same(valueOf(a), v)) changed.push(a);
      if (v === null) values.delete(a);
      else values.set(a, v);
    };
    while (ready.length) {
      const a = ready.pop()!;
      pending.delete(a);
      commit(a, computeOwn(a));
      for (const d of dependents.get(a) ?? []) {
        if (!pending.has(d)) continue;
        const k = pending.get(d)! - 1;
        pending.set(d, k);
        if (k === 0) ready.push(d);
      }
    }
    for (const a of pending.keys()) commit(a, err('#CYCLE!'));
    return changed.sort(rowMajor);
  }

  return {
    set(address, input) {
      const a = normalize(address);
      for (const d of deps.get(a) ?? []) dependents.get(d)?.delete(a);
      deps.delete(a);
      asts.delete(a);
      inputs.delete(a);
      if (typeof input === 'number') inputs.set(a, input);
      else if (input.startsWith('=')) {
        inputs.set(a, input);
        let ast: Node | null = null;
        try { ast = parseFormula(input.slice(1)); } catch { ast = null; }
        asts.set(a, ast);
        const refs = ast ? collectRefs(ast, new Set()) : new Set<string>();
        deps.set(a, refs);
        for (const d of refs) {
          if (!dependents.has(d)) dependents.set(d, new Set());
          dependents.get(d)!.add(a);
        }
      } else if (input.trim() !== '') {
        inputs.set(a, /^\s*-?\d+(\.\d+)?\s*$/.test(input) ? Number(input) : input);
      }
      return recalc([a]);
    },
    get(address) {
      return valueOf(normalize(address));
    },
    define(name, fn) {
      custom.set(name.toUpperCase(), fn);
      recalc(asts.keys());
    },
  };
}
