import { useSyncExternalStore } from 'react';

// Hash routing so the build works on any static host: #/ and #/p/<id>
export type Route = { name: 'list' } | { name: 'problem'; id: string };

function parse(): Route {
  const h = location.hash.replace(/^#/, '');
  const m = h.match(/^\/p\/([\w-]+)/);
  return m ? { name: 'problem', id: m[1] } : { name: 'list' };
}

let current = parse();
const subs = new Set<() => void>();
window.addEventListener('hashchange', () => { current = parse(); subs.forEach((s) => s()); });

export function useRoute(): Route {
  return useSyncExternalStore((l) => { subs.add(l); return () => subs.delete(l); }, () => current);
}

export const href = {
  list: () => '#/',
  problem: (id: string) => `#/p/${id}`,
};
