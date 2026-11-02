const KEY = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*/;

export function parse(src: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of src.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimStart();
    const m = KEY.exec(line);
    if (!m || line.startsWith('#')) continue;
    let v = line.slice(m[0].length).trim();
    if (v.length >= 2 && /^['"`]/.test(v) && v.endsWith(v[0])) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}
