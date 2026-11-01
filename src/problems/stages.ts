// Stage helpers shared by the browser worker, the UI and scripts/verify.ts.
import type { TestCase } from '../runner/types';
import type { ProblemMeta } from './types';

/** Staged = at least two stages and every stage lists the test groups it adds. */
export function isStaged(p: Pick<ProblemMeta, 'stages'>): boolean {
  return p.stages.length >= 2 && p.stages.every((s) => !!s.groups?.length);
}

/** How many stages the runner knows about: 1 for single-stage problems. */
export function stageCount(p: Pick<ProblemMeta, 'stages'>): number {
  return isStaged(p) ? p.stages.length : 1;
}

/** 0-based stage index that introduces a group, or -1. */
export function stageOfGroup(p: Pick<ProblemMeta, 'stages'>, group: string | undefined): number {
  if (!group) return -1;
  return p.stages.findIndex((s) => s.groups?.includes(group));
}

/**
 * The tests to run for stage `stage` (0-based): every group of stages 0..stage.
 * Single-stage problems, an undefined stage, or the final stage all run every test (same as v1).
 */
export function testsForStage<T extends TestCase>(p: Pick<ProblemMeta, 'stages'> & { tests: T[] }, stage?: number): T[] {
  if (!isStaged(p) || stage === undefined || stage >= p.stages.length - 1) return p.tests;
  return p.tests.filter((t) => { const k = stageOfGroup(p, t.group); return k >= 0 && k <= stage; });
}

/** Tests that a stage adds (only its own groups). */
export function testsAddedBy<T extends TestCase>(p: Pick<ProblemMeta, 'stages'> & { tests: T[] }, stage: number): T[] {
  return p.tests.filter((t) => stageOfGroup(p, t.group) === stage);
}
