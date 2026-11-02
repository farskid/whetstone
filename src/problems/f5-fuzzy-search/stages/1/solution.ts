import type { Match } from './types';

export function fold(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function fuzzyMatch(query: string, text: string): Match | null {
  const q = Array.from(fold(query));
  const positions: number[] = [];
  let i = 0;
  let idx = 0;
  for (const cp of Array.from(text)) {
    for (const f of Array.from(fold(cp))) {
      if (i < q.length && f === q[i]) {
        i++;
        if (positions[positions.length - 1] !== idx) positions.push(idx);
      }
    }
    idx += cp.length;
  }
  return i === q.length ? { positions } : null;
}
