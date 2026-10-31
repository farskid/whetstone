/// <reference lib="webworker" />
import { problemsById } from '../problems';
import { runTests } from './core';
import type { Language, RunSummary } from './types';

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = async (e: MessageEvent<{ problemId: string; source: string; language: Language }>) => {
  const { problemId, source, language } = e.data;
  const problem = problemsById.get(problemId);
  let summary: RunSummary;
  if (!problem) {
    summary = { results: [], compileError: `Unknown problem "${problemId}"`, moduleLogs: [], passed: 0, total: 0 };
  } else {
    summary = await runTests(problem.tests, source, language, {
      onResult: (result) => self.postMessage({ type: 'result', result }),
    });
  }
  self.postMessage({ type: 'done', summary });
};
