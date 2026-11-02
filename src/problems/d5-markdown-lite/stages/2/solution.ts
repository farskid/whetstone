import type {} from './types';

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ESC[c]);

const PUNCT = /[!-/:-@[-`{-~]/;
const isSpace = (c: string | undefined) => c === undefined || /\s/.test(c);
const isAlnum = (c: string | undefined) => c !== undefined && /[\p{L}\p{N}]/u.test(c);

function runLength(s: string, pos: number): number {
  let n = 0;
  while (s[pos + n] === s[pos]) n++;
  return n;
}

function canOpen(s: string, pos: number, d: string): boolean {
  if (isSpace(s[pos + d.length])) return false;
  return d[0] !== '_' || !isAlnum(s[pos - 1]);
}

function canClose(s: string, pos: number, d: string): boolean {
  if (isSpace(s[pos - 1])) return false;
  return d[0] !== '_' || !isAlnum(s[pos + d.length]);
}

function inline(s: string, pos: number, closer: string | null): { html: string; pos: number; closed: boolean } {
  let html = '';
  while (pos < s.length) {
    const c = s[pos];
    if (c === '\\' && PUNCT.test(s[pos + 1] ?? '')) { html += escapeHtml(s[pos + 1]); pos += 2; continue; }
    if (c === '`') {
      const n = runLength(s, pos);
      let j = pos + n;
      let end = -1;
      while ((j = s.indexOf('`', j)) >= 0) {
        const m = runLength(s, j);
        if (m === n) { end = j; break; }
        j += m;
      }
      if (end < 0) { html += s.slice(pos, pos + n); pos += n; continue; }
      html += `<code>${escapeHtml(s.slice(pos + n, end))}</code>`;
      pos = end + n;
      continue;
    }
    if (closer && s.startsWith(closer, pos) && canClose(s, pos, closer) && (closer.length === 2 || runLength(s, pos) === 1)) {
      return { html, pos: pos + closer.length, closed: true };
    }
    if (c === '*' || c === '_') {
      const d = runLength(s, pos) >= 2 ? c + c : c;
      if (canOpen(s, pos, d)) {
        const r = inline(s, pos + d.length, d);
        if (r.closed) {
          const tag = d.length === 2 ? 'strong' : 'em';
          html += `<${tag}>${r.html}</${tag}>`;
          pos = r.pos;
          continue;
        }
      }
      html += d;
      pos += d.length;
      continue;
    }
    html += escapeHtml(c);
    pos++;
  }
  return { html, pos, closed: false };
}

export function renderInline(text: string): string {
  return inline(text, 0, null).html;
}

const HEADING = /^(#{1,6})[ \t]+(.*)$|^(#{1,6})$/;
const FENCE = /^```[ \t]*([\w+-]*)[ \t]*$/;

function startsBlock(line: string): boolean {
  return HEADING.test(line) || FENCE.test(line);
}

function blocks(lines: string[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }
    let m: RegExpExecArray | null;
    if ((m = FENCE.exec(line))) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```[ \t]*$/.test(lines[i])) body.push(lines[i++]);
      i++;
      const cls = m[1] ? ` class="language-${escapeHtml(m[1])}"` : '';
      out.push(`<pre><code${cls}>${body.map((b) => escapeHtml(b) + '\n').join('')}</code></pre>`);
      continue;
    }
    if ((m = HEADING.exec(line))) {
      const level = (m[1] ?? m[3]).length;
      out.push(`<h${level}>${renderInline((m[2] ?? '').trim())}</h${level}>`);
      i++;
      continue;
    }
    const para: string[] = [line.trim()];
    i++;
    while (i < lines.length && lines[i].trim() !== '' && !startsBlock(lines[i])) para.push(lines[i++].trim());
    out.push(`<p>${renderInline(para.join('\n'))}</p>`);
  }
  return out;
}

export function render(markdown: string): string {
  return blocks(markdown.replace(/\r\n?/g, '\n').split('\n')).join('\n');
}
