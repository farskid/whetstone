/// <reference lib="webworker" />
import { problemsById } from '../problems';
import { testsForStage } from '../problems/stages';
import { runTests } from './core';
import type { Language, RunSummary } from './types';

declare const self: DedicatedWorkerGlobalScope;

// A test that fails early can leave user promises rejected with no handler; keep the console quiet.
self.addEventListener('unhandledrejection', (e) => e.preventDefault());

self.onmessage = async (e: MessageEvent<{ problemId: string; source: string; language: Language; stage?: number }>) => {
  const { problemId, source, language, stage } = e.data;
  const problem = problemsById.get(problemId);
  let summary: RunSummary;
  if (!problem) {
    summary = { results: [], compileError: `Unknown problem "${problemId}"`, moduleLogs: [], passed: 0, total: 0 };
  } else {
    summary = await runTests(testsForStage(problem, stage), source, language, {
      onResult: (result) => self.postMessage({ type: 'result', result }),
    });
  }
  self.postMessage({ type: 'done', summary });
};
