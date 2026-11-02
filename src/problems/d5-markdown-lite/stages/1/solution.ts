const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ESC[c]);

export const renderInline = escapeHtml;

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
