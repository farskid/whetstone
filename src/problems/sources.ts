// Browser-only: raw text of each problem's statement, starter and reference solution.
// (scripts/verify.ts reads the same files with fs.)
import type { ProblemSources } from './types';
import { stripTypes } from '../runner/core';

const statements = import.meta.glob('./*/statement.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const starters = import.meta.glob('./*/starter.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const solutions = import.meta.glob('./*/solution.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
// Staged problems: stages/<k>.md (statement section), stages/<k>.solution.ts (reference for stage k), stages/starter.ts.
const stageFiles = import.meta.glob(['./*/stages/*.md', './*/stages/*.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

/** `stages` = the problem's stage count when it is staged (see problems/stages.ts), else 1. */
export function getSources(id: string, stages = 1): ProblemSources {
  const solutionTs = solutions[`./${id}/solution.ts`] ?? '';
  const stageStatements: string[] = [];
  const stageSolutionsTs: string[] = [];
  if (stages > 1) {
    for (let k = 1; k <= stages; k++) {
      stageStatements.push(stageFiles[`./${id}/stages/${k}.md`] ?? `_Missing statement for stage ${k}._`);
      stageSolutionsTs.push(k === stages ? solutionTs : stageFiles[`./${id}/stages/${k}.solution.ts`] ?? '');
    }
  }
  return {
    statement: statements[`./${id}/statement.md`] ?? `# Missing statement for ${id}`,
    starterTs: starters[`./${id}/starter.ts`] ?? '',
    solutionTs,
    stageStatements,
    stageSolutionsTs,
    stageStarterTs: stages > 1 ? stageFiles[`./${id}/stages/starter.ts`] : undefined,
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
