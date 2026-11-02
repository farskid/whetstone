import type {} from './types';

type Node =
  | { t: 'text'; v: string }
  | { t: 'var'; expr: string; raw: boolean };

const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);

function parse(src: string): Node[] {
  const out: Node[] = [];
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
    const sigil = body.trimStart()[0];
    if (triple) out.push({ t: 'var', expr: body.trim(), raw: true });
    else if (sigil === '&') out.push({ t: 'var', expr: body.trimStart().slice(1).trim(), raw: true });
    else if (sigil !== '!') out.push({ t: 'var', expr: body.trim(), raw: false });
  }
  return out;
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

function own(obj: unknown, key: string): { ok: boolean; v?: unknown } {
  if (FORBIDDEN.has(key) || typeof obj !== 'object' || obj === null) return { ok: false };
  if (!Object.prototype.hasOwnProperty.call(obj, key)) return { ok: false };
  return { ok: true, v: (obj as Record<string, unknown>)[key] };
}

function lookup(data: unknown, path: string): unknown {
  let value = data;
  for (const k of path.split('.')) {
    const r = own(value, k);
    if (!r.ok) return undefined;
    value = r.v;
  }
  return value;
}

const str = (v: unknown) => (v === undefined || v === null ? '' : String(v));

export function render(template: string, data: unknown): string {
  let out = '';
  for (const n of parse(template)) {
    if (n.t === 'text') out += n.v;
    else {
      const s = str(lookup(data, n.expr));
      out += n.raw ? s : escape(s);
    }
  }
  return out;
}
