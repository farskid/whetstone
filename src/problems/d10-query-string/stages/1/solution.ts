function decode(s: string): string {
  const plus = s.replace(/\+/g, ' ');
  try {
    return decodeURIComponent(plus);
  } catch {
    return plus;
  }
}

export function parse(input: string): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const part of input.replace(/^\?/, '').split('&').filter(Boolean)) {
    const eq = part.indexOf('=');
    const key = decode(eq < 0 ? part : part.slice(0, eq));
    const val = eq < 0 ? '' : decode(part.slice(eq + 1));
    const cur = out[key];
    if (cur === undefined) out[key] = val;
    else if (typeof cur === 'string') out[key] = [cur, val];
    else cur.push(val);
  }
  return out;
}

const enc = (s: string) => encodeURIComponent(s);

export function stringify(obj: Record<string, unknown>): string {
  const out: string[] = [];
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v === undefined || typeof v === 'function') continue;
    const s = v === null ? '' : v instanceof Date ? v.toISOString() : String(v);
    out.push(`${enc(k)}=${enc(s)}`);
  }
  return out.join('&');
}
