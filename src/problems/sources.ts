// Browser-only: raw text of each problem's statement, starter and reference solution.
// (scripts/verify.ts reads the same files with fs.)
import type { ProblemSources } from './types';
import { stripTypes } from '../runner/core';

const statements = import.meta.glob('./*/statement.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const starters = import.meta.glob('./*/starter.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const solutions = import.meta.glob('./*/solution.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export function getSources(id: string): ProblemSources {
  return {
    statement: statements[`./${id}/statement.md`] ?? `# Missing statement for ${id}`,
    starterTs: starters[`./${id}/starter.ts`] ?? '',
    solutionTs: solutions[`./${id}/solution.ts`] ?? '',
  };
}

const jsCache = new Map<string, string>();
/** JS versions are derived from the TS files by stripping types. */
export function toJs(ts: string): string {
  let js = jsCache.get(ts);
  if (js === undefined) {
    try { js = stripTypes(ts); } catch { js = ts; }
    jsCache.set(ts, js);
  }
  return js;
}
