// Bug: ampersand is escaped after the others, double-escaping
export type Helper = (...args: unknown[]) => unknown;
export interface RenderOptions {
  partials?: Record<string, string>;
  helpers?: Record<string, Helper>;
}

export class TemplateError extends Error {
  constructor(message: string, public line: number, public column: number) {
    super(`${message} (line ${line}, column ${column})`);
    this.name = 'TemplateError';
  }
}

type Node =
  | { t: 'text'; v: string }
  | { t: 'var'; expr: string; raw: boolean; line: number; column: number }
  | { t: 'section'; name: string; inverted: boolean; children: Node[] }
  | { t: 'partial'; name: string; line: number; column: number };

const MAX_PARTIAL_DEPTH = 100;
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);

function position(src: string, index: number): [number, number] {
  const before = src.slice(0, index).split('\n');
  return [before.length, before[before.length - 1].length + 1];
}

function parse(src: string): Node[] {
  const root: Node[] = [];
  const stack: Array<{ name: string; children: Node[]; at: number }> = [];
  let out = root;
  let i = 0;
  while (i < src.length) {
    const open = src.indexOf('{{', i);
    if (open < 0) { out.push({ t: 'text', v: src.slice(i) }); break; }
    if (open > i) out.push({ t: 'text', v: src.slice(i, open) });
    const triple = src.startsWith('{{{', open);
    const closeTok = triple ? '}}}' : '}}';
    const close = src.indexOf(closeTok, open + (triple ? 3 : 2));
    const [line, column] = position(src, open);
    if (close < 0) throw new TemplateError('Unclosed tag', line, column);
    const body = src.slice(open + (triple ? 3 : 2), close);
    i = close + closeTok.length;
    if (triple) { out.push({ t: 'var', expr: body.trim(), raw: true, line, column }); continue; }
    const sigil = body.trimStart()[0];
    const rest = body.trimStart().slice(1).trim();
    switch (sigil) {
      case '!':
        break;
      case '#':
      case '^': {
        const node: Node = { t: 'section', name: rest, inverted: sigil === '^', children: [] };
        out.push(node);
        stack.push({ name: rest, children: out, at: open });
        out = node.children;
        break;
      }
      case '/': {
        const top = stack.pop();
        if (!top || top.name !== rest) throw new TemplateError(`Unexpected closing tag "${rest}"`, line, column);
        out = top.children;
        break;
      }
      case '>':
        out.push({ t: 'partial', name: rest, line, column });
        break;
      case '&':
        out.push({ t: 'var', expr: rest, raw: true, line, column });
        break;
      default:
        out.push({ t: 'var', expr: body.trim(), raw: false, line, column });
    }
  }
  if (stack.length) {
    const top = stack[stack.length - 1];
    const [line, column] = position(src, top.at);
    throw new TemplateError(`Unclosed section "${top.name}"`, line, column);
  }
  return root;
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = (s: string) => s.replace(/[<>"']/g, (c) => ESC[c]).replace(/&/g, '&amp;');

function own(obj: unknown, key: string): { ok: boolean; v?: unknown } {
  if (FORBIDDEN.has(key) || typeof obj !== 'object' || obj === null) return { ok: false };
  if (!Object.prototype.hasOwnProperty.call(obj, key)) return { ok: false };
  return { ok: true, v: (obj as Record<string, unknown>)[key] };
}

function lookup(stack: unknown[], path: string): unknown {
  if (path === '.') return stack[stack.length - 1];
  const [first, ...rest] = path.split('.');
  let value: unknown;
  let found = false;
  for (let i = stack.length - 1; i >= 0 && !found; i--) {
    const r = own(stack[i], first);
    if (r.ok) { found = true; value = r.v; }
  }
  if (!found) return undefined;
  for (const k of rest) {
    const r = own(value, k);
    if (!r.ok) return undefined;
    value = r.v;
  }
  return value;
}

const str = (v: unknown) => (v === undefined || v === null ? '' : String(v));

function evalExpr(expr: string, stack: unknown[], helpers: Record<string, Helper>, line: number, column: number): unknown {
  const tokens = expr.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\S+/g) ?? [];
  const [head, ...args] = tokens;
  if (head !== undefined && Object.prototype.hasOwnProperty.call(helpers, head)) {
    const values = args.map((a) => {
      if (/^["']/.test(a)) return a.slice(1, -1).replace(/\\(.)/g, '$1');
      if (/^-?\d+(\.\d+)?$/.test(a)) return Number(a);
      return lookup(stack, a);
    });
    return helpers[head](...values);
  }
  if (tokens.length > 1) throw new TemplateError(`Unknown helper "${head}"`, line, column);
  return lookup(stack, expr);
}

export function compile(template: string, options: RenderOptions = {}): (data: unknown) => string {
  const nodes = parse(template);
  const partials = options.partials ?? {};
  const helpers = options.helpers ?? {};
  const cache = new Map<string, Node[]>();

  const run = (list: Node[], stack: unknown[], depth: number): string => {
    let out = '';
    for (const n of list) {
      if (n.t === 'text') out += n.v;
      else if (n.t === 'var') {
        const s = str(evalExpr(n.expr, stack, helpers, n.line, n.column));
        out += n.raw ? s : escape(s);
      } else if (n.t === 'section') {
        const v = lookup(stack, n.name);
        const empty = !v || (Array.isArray(v) && v.length === 0);
        if (n.inverted) { if (empty) out += run(n.children, stack, depth); }
        else if (!empty) {
          if (Array.isArray(v)) for (const item of v) out += run(n.children, [...stack, item], depth);
          else out += run(n.children, [...stack, v], depth);
        }
      } else {
        if (!Object.prototype.hasOwnProperty.call(partials, n.name)) continue;
        if (depth >= MAX_PARTIAL_DEPTH) throw new TemplateError(`Partial depth limit exceeded in "${n.name}"`, n.line, n.column);
        if (!cache.has(n.name)) cache.set(n.name, parse(partials[n.name]));
        out += run(cache.get(n.name)!, stack, depth + 1);
      }
    }
    return out;
  };
  return (data: unknown) => run(nodes, [data], 0);
}

export function render(template: string, data: unknown, options: RenderOptions = {}): string {
  return compile(template, options)(data);
}
