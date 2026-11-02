import type { Router } from './types';

type Seg = { kind: 'static'; text: string } | { kind: 'param'; name: string };

function parsePattern(pattern: string): Seg[] {
  return pattern.split('/').filter(Boolean).map((p): Seg => (p.startsWith(':') ? { kind: 'param', name: p.slice(1) } : { kind: 'static', text: p }));
}

function splitPath(path: string): string[] {
  const clean = path.split(/[?#]/)[0];
  return clean.split('/').filter(Boolean);
}

function decode(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

interface Route<H> { method: string; pattern: string; segs: Seg[]; handler: H }

export function createRouter<H>(): Router<H> {
  const routes: Route<H>[] = [];
  return {
    add(method, pattern, handler) {
      routes.push({ method, pattern, segs: parsePattern(pattern), handler });
    },
    match(method, path) {
      const parts = splitPath(path);
      for (const r of routes) {
        if (r.method !== method || r.segs.length !== parts.length) continue;
        const params: Record<string, string> = {};
        const ok = r.segs.every((s, i) => {
          if (s.kind === 'static') return s.text === parts[i];
          params[s.name] = decode(parts[i]);
          return true;
        });
        if (ok) return { handler: r.handler, params, pattern: r.pattern };
      }
      return null;
    },
  };
}
