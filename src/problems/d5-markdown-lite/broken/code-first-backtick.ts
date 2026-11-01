// Bug: a code span closes at any backtick
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

export function safeUrl(url: string): string {
  const compact = url.replace(/[\s\u0000-\u001f]/g, '').toLowerCase();
  const m = /^([a-z][a-z0-9+.-]*):/.exec(compact);
  if (m && !['http', 'https', 'mailto'].includes(m[1])) return '#';
  return url;
}

function tryLink(s: string, pos: number): { html: string; pos: number } | null {
  let depth = 0;
  let i = pos;
  for (; i < s.length; i++) {
    if (s[i] === '\\') { i++; continue; }
    if (s[i] === '[') depth++;
    else if (s[i] === ']' && --depth === 0) break;
  }
  if (i >= s.length || s[i + 1] !== '(') return null;
  const close = s.indexOf(')', i + 2);
  if (close < 0) return null;
  const rawUrl = s.slice(i + 2, close);
  if (/\s/.test(rawUrl)) return null;
  const url = safeUrl(rawUrl.replace(/\\([!-/:-@[-`{-~])/g, '$1'));
  const text = inline(s.slice(pos + 1, i), 0, null, false).html;
  return { html: `<a href="${escapeHtml(url)}">${text}</a>`, pos: close + 1 };
}

function inline(s: string, pos: number, closer: string | null, links: boolean): { html: string; pos: number; closed: boolean } {
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
        { end = j; break; }
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
    if (c === '[' && links) {
      const l = tryLink(s, pos);
      if (l) { html += l.html; pos = l.pos; continue; }
    }
    if (c === '*' || c === '_') {
      const d = runLength(s, pos) >= 2 ? c + c : c;
      if (canOpen(s, pos, d)) {
        const r = inline(s, pos + d.length, d, links);
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
  return inline(text, 0, null, true).html;
}

const HEADING = /^(#{1,6})[ \t]+(.*)$|^(#{1,6})$/;
const FENCE = /^```[ \t]*([\w+-]*)[ \t]*$/;
const LIST = /^( *)([-*+]|\d+\.)[ \t]+(.*)$/;
const indentOf = (l: string) => l.length - l.trimStart().length;

function startsBlock(line: string): boolean {
  return HEADING.test(line) || FENCE.test(line) || line.startsWith('>') || LIST.test(line);
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
    if (line.startsWith('>')) {
      const inner: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) inner.push(lines[i++].replace(/^> ?/, ''));
      out.push(`<blockquote>\n${blocks(inner).join('\n')}\n</blockquote>`);
      continue;
    }
    if ((m = LIST.exec(line))) {
      const indent = m[1].length;
      const ordered = /\d/.test(m[2]);
      const start = ordered ? parseInt(m[2], 10) : 1;
      const items: string[] = [];
      while (i < lines.length) {
        const im = LIST.exec(lines[i]);
        if (!im || im[1].length !== indent || /\d/.test(im[2]) !== ordered) break;
        i++;
        const children: string[] = [];
        while (i < lines.length && lines[i].trim() !== '' && indentOf(lines[i]) >= indent + 2) children.push(lines[i++]);
        const text = renderInline(im[3].trim());
        if (children.length) {
          const cut = Math.min(...children.map(indentOf));
          items.push(`<li>${text}\n${blocks(children.map((c) => c.slice(cut))).join('\n')}\n</li>`);
        } else items.push(`<li>${text}</li>`);
      }
      const tag = ordered ? 'ol' : 'ul';
      const attr = ordered && start !== 1 ? ` start="${start}"` : '';
      out.push(`<${tag}${attr}>\n${items.join('\n')}\n</${tag}>`);
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
