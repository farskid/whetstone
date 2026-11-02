import type { Language, RunSummary, TestResult } from './types';


/** Kill the worker if it sends nothing for this long (an infinite loop blocks it completely). */
export const WATCHDOG_MS = 5000;

export interface RunHandle { promise: Promise<RunSummary>; cancel(): void }

export function runInWorker(
  problemId: string,
  titles: string[],
  source: string,
  language: Language,
  onResult: (r: TestResult) => void,
  /** 0-based stage for staged problems: runs that stage's groups and every earlier one. Omit to run every test. */
  stage?: number,
  /** Staged problems: the stage's read-only types file, importable from the solution as './types'. */
  types?: string,
): RunHandle {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  const received: TestResult[] = [];
  let finished = false;
  let watchdog: ReturnType<typeof setTimeout>;
  let resolveFn!: (s: RunSummary) => void;
  const promise = new Promise<RunSummary>((r) => (resolveFn = r));

  const finish = (s: RunSummary) => {
    if (finished) return;
    finished = true;
    clearTimeout(watchdog);
    worker.terminate();
    resolveFn(s);
  };

  const killed = (reason: string): RunSummary => {
    const results = [...received];
    for (let i = results.length; i < titles.length; i++) {
      results.push({
        index: i, title: titles[i], status: 'timeout', durationMs: 0, logs: [],
        error: { message: i === received.length ? reason : 'Not run: the run was stopped before this test.' },
      });
    }
    return { results, moduleLogs: [], passed: received.filter((r) => r.status === 'pass').length, total: titles.length, aborted: reason };
  };

  const arm = () => {
    clearTimeout(watchdog);
    watchdog = setTimeout(() => finish(killed(`Stopped after ${WATCHDOG_MS / 1000}s with no progress. Your code is probably stuck in an infinite loop.`)), WATCHDOG_MS);
  };

  worker.onmessage = (e: MessageEvent) => {
    const msg = e.data;
    if (msg.type === 'result') { received.push(msg.result); onResult(msg.result); arm(); }
    if (msg.type === 'done') finish(msg.summary);
  };
  worker.onerror = (e) => { e.preventDefault(); finish({ ...killed(`Runner crashed: ${e.message}`), aborted: `Runner crashed: ${e.message}` }); };
  arm();
  worker.postMessage({ problemId, source, language, stage, types });
  return { promise, cancel: () => finish(killed('Cancelled.')) };
}
