// Bug: cycles resolve to empty strings instead of throwing
const KEY = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*/;

export function parse(src: string): Record<string, string> {
  const text = src.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const out: Record<string, string> = {};
  let pos = 0;
  while (pos < text.length) {
    let end = text.indexOf('\n', pos);
    if (end < 0) end = text.length;
    const line = text.slice(pos, end).trimStart();
    const m = KEY.exec(line);
    if (!m || line.startsWith('#')) { pos = end + 1; continue; }
    const key = m[1];
    const lineStart = pos + (text.slice(pos, end).length - line.length);
    const valStart = lineStart + m[0].length;
    const q = text[valStart];
    if (q === '"' || q === "'" || q === '`') {
      const close = text.indexOf(q, valStart + 1);
      if (close >= 0) {
        let v = text.slice(valStart + 1, close);
        if (q === '"') v = v.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
        out[key] = v;
        const nl = text.indexOf('\n', close);
        pos = nl < 0 ? text.length : nl + 1;
        continue;
      }
    }
    let v = text.slice(valStart, end);
    const hash = v.search(/(^|\s)#/);
    if (hash >= 0) v = v.slice(0, hash);
    out[key] = v.trim();
    pos = end + 1;
  }
  return out;
}

export function expand(parsed: Record<string, string>, env: Record<string, string | undefined> = {}): Record<string, string> {
  const done: Record<string, string> = {};
  const stack: string[] = [];
  const has = (k: string) => Object.prototype.hasOwnProperty.call(parsed, k);
  const lookup = (name: string): string | undefined => {
    if (has(name)) return resolve(name);
    return env[name];
  };
  const resolve = (key: string): string => {
    if (Object.prototype.hasOwnProperty.call(done, key)) return done[key];
    if (stack.includes(key)) return '';
    stack.push(key);
    const value = parsed[key].replace(/\\\$|\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-([^}]*))?\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (all, braced, def, bare) => {
      if (all === '\\$') return '$';
      const v = lookup(braced ?? bare);
      if (def !== undefined && (v === undefined || v === '')) return def;
      return v ?? '';
    });
    stack.pop();
    done[key] = value;
    return value;
  };
  const result: Record<string, string> = {};
  for (const k of Object.keys(parsed)) result[k] = resolve(k);
  return result;
}
