import { useSyncExternalStore } from 'react';

// Hash routing so the build works on any static host: #/, #/?tag=<name> and #/p/<id>
export type Route = { name: 'list'; tag: string | null } | { name: 'problem'; id: string };

function parse(): Route {
  const h = location.hash.replace(/^#/, '');
  const m = h.match(/^\/p\/([\w-]+)/);
  if (m) return { name: 'problem', id: m[1] };
  const q = h.indexOf('?');
  return { name: 'list', tag: q < 0 ? null : new URLSearchParams(h.slice(q + 1)).get('tag') };
}

let current = parse();
const subs = new Set<() => void>();
window.addEventListener('hashchange', () => { current = parse(); subs.forEach((s) => s()); });

export function useRoute(): Route {
  return useSyncExternalStore((l) => { subs.add(l); return () => subs.delete(l); }, () => current);
}

export const href = {
  list: (tag?: string | null) => (tag ? `#/?tag=${encodeURIComponent(tag)}` : '#/'),
  problem: (id: string) => `#/p/${id}`,
};
