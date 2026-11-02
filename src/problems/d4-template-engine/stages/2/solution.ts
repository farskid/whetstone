import type {} from './types';

type Node =
  | { t: 'text'; v: string }
  | { t: 'var'; expr: string; raw: boolean }
  | { t: 'section'; name: string; inverted: boolean; children: Node[] };

const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);

function parse(src: string): Node[] {
  const root: Node[] = [];
  const stack: Array<{ children: Node[] }> = [];
  let out = root;
  let i = 0;
  while (i < src.length) {
    const open = src.indexOf('{{', i);
    if (open < 0) { out.push({ t: 'text', v: src.slice(i) }); break; }
    if (open > i) out.push({ t: 'text', v: src.slice(i, open) });
    const triple = src.startsWith('{{{', open);
    const closeTok = triple ? '}}}' : '}}';
    const close = src.indexOf(closeTok, open + (triple ? 3 : 2));
    if (close < 0) { out.push({ t: 'text', v: src.slice(open) }); break; }
    const body = src.slice(open + (triple ? 3 : 2), close);
    i = close + closeTok.length;
    if (triple) { out.push({ t: 'var', expr: body.trim(), raw: true }); continue; }
    const sigil = body.trimStart()[0];
    const rest = body.trimStart().slice(1).trim();
    switch (sigil) {
      case '!':
        break;
      case '#':
      case '^': {
        const node: Node = { t: 'section', name: rest, inverted: sigil === '^', children: [] };
        out.push(node);
        stack.push({ children: out });
        out = node.children;
        break;
      }
      case '/': {
        const top = stack.pop();
        if (top) out = top.children;
        break;
      }
      case '&':
        out.push({ t: 'var', expr: rest, raw: true });
        break;
      default:
        out.push({ t: 'var', expr: body.trim(), raw: false });
    }
  }
  return root;
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

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

function run(list: Node[], stack: unknown[]): string {
  let out = '';
  for (const n of list) {
    if (n.t === 'text') out += n.v;
    else if (n.t === 'var') {
      const s = str(lookup(stack, n.expr));
      out += n.raw ? s : escape(s);
    } else {
      const v = lookup(stack, n.name);
      const empty = !v || (Array.isArray(v) && v.length === 0);
      if (n.inverted) { if (empty) out += run(n.children, stack); }
      else if (!empty) {
        if (Array.isArray(v)) for (const item of v) out += run(n.children, [...stack, item]);
        else out += run(n.children, [...stack, v]);
      }
    }
  }
  return out;
}

export function render(template: string, data: unknown): string {
  return run(parse(template), [data]);
}
