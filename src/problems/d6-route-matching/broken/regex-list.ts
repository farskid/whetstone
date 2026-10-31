// Broken: compiles each route to one regex and returns the first registered match.
// No specificity ranking, unanchored constraints, no decoding.
export interface Match<H> { handler: H; params: Record<string, string>; pattern: string }
export interface Router<H> {
  add(method: string, pattern: string, handler: H): void;
  match(method: string, path: string): Match<H> | null;
  allowedMethods(path: string): string[];
}
export function createRouter<H>(): Router<H> {
  const routes: { method: string; re: RegExp; names: string[]; handler: H; pattern: string }[] = [];
  return {
    add(method, pattern, handler) {
      const names: string[] = [];
      const src = pattern.split('/').filter(Boolean).map((s) => {
        if (s === '*') { names.push('*'); return '(?:/(.*))?'; }
        const m = /^:(\w+)(?:\((.+)\))?(\?)?$/.exec(s);
        if (m) { names.push(m[1]); return m[3] ? `(?:/(${m[2] ?? '[^/]+'}))?` : `/(${m[2] ?? '[^/]+'})`; }
        return '/' + s;
      }).join('');
      routes.push({ method: method.toUpperCase(), re: new RegExp(`^${src || '/'}/?$`), names, handler, pattern });
    },
    match(method, path) {
      const p = path.split(/[?#]/)[0];
      for (const r of routes) {
        if (r.method !== method.toUpperCase() && r.method !== 'ALL') continue;
        const m = r.re.exec(p);
        if (!m) continue;
        const params: Record<string, string> = {};
        r.names.forEach((n, i) => { if (m[i + 1] !== undefined) params[n] = m[i + 1]; });
        return { handler: r.handler, params, pattern: r.pattern };
      }
      return null;
    },
    allowedMethods(path) {
      return [...new Set(routes.filter((r) => r.re.test(path)).map((r) => r.method))].sort();
    },
  };
}
export function buildPath(pattern: string, params: Record<string, string | number>): string {
  return pattern.replace(/:(\w+)(\([^)]*\))?\??/g, (_, n) => String(params[n] ?? '')).replace(/\*/, String(params['*'] ?? ''));
}
