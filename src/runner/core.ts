import { transform } from 'sucrase';
import { createExpect, AssertionError } from './expect';
import { FakeClock, macrotask } from './clock';
import { format } from './format';
import type { Deferred, Language, RunSummary, TestCase, TestContext, TestError, TestResult } from './types';

export interface CompiledModule { code: string }

/** TS/JS (ESM syntax) -> CommonJS-style script we can evaluate with new Function. */
export function compile(source: string, language: Language): string {
  return transform(source, {
    transforms: language === 'ts' ? ['typescript', 'imports'] : ['imports'],
    production: true,
    disableESTransforms: true,
  }).code;
}

/** Strip TypeScript types but keep ESM syntax (used to derive JS starters/solutions). */
export function stripTypes(source: string): string {
  const out = transform(source, { transforms: ['typescript'], disableESTransforms: true }).code;
  return out.replace(/\n{3,}/g, '\n\n').trimStart();
}

type Sink = { lines: string[] };

function makeConsole(sinkRef: { current: Sink }) {
  const write = (kind: string) => (...args: unknown[]) => {
    const text = args.map((a) => (typeof a === 'string' ? a : format(a))).join(' ');
    const lines = sinkRef.current.lines;
    if (lines.length < 200) lines.push(kind === 'log' ? text : `[${kind}] ${text}`);
    else if (lines.length === 200) lines.push('… output truncated');
  };
  return { log: write('log'), info: write('info'), warn: write('warn'), error: write('error'), debug: write('debug'), table: write('table'), dir: write('log') };
}

/** Evaluate compiled code into a fresh exports object. */
export function loadModule(compiled: string, consoleObj: unknown): Record<string, unknown> {
  const module = { exports: {} as Record<string, unknown> };
  const require = (name: string) => { throw new Error(`Imports are not available in this sandbox (tried to import "${name}"). Put everything in one file.`); };
  // eslint-disable-next-line no-new-func
  const fn = new Function('exports', 'module', 'require', 'console', compiled);
  fn(module.exports, module, require, consoleObj);
  return module.exports;
}

function toError(e: unknown): TestError {
  if (e instanceof AssertionError) return { message: e.message, expected: e.expected, actual: e.actual };
  if (e instanceof Error) {
    const stack = (e.stack || '').split('\n').filter((l) => !/runner\/|node_modules|<anonymous>:\d+:\d+\)?$/.test(l) || /eval|Function/.test(l)).slice(0, 6).join('\n');
    return { message: `${e.name}: ${e.message}`, stack };
  }
  return { message: `Thrown non-Error value: ${format(e)}` };
}

function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void, reject!: (r?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

export interface RunOptions {
  perTestTimeoutMs?: number;
  onResult?: (r: TestResult) => void;
  /** Real timer used for per-test timeouts (keeps working even if user code patches globals). */
  realSetTimeout?: typeof setTimeout;
}

/**
 * Run every test against fresh copies of the user's module.
 * Same function runs in the browser Web Worker and in `npm run verify` (Node).
 */
export async function runTests(tests: TestCase[], source: string, language: Language, opts: RunOptions = {}): Promise<RunSummary> {
  const perTest = opts.perTestTimeoutMs ?? 2000;
  const realSetTimeout = opts.realSetTimeout ?? setTimeout;
  const sinkRef = { current: { lines: [] as string[] } };
  const moduleSink = sinkRef.current;
  const consoleObj = makeConsole(sinkRef);

  let compiled: string;
  try {
    compiled = compile(source, language);
  } catch (e) {
    return { results: [], compileError: `Syntax error: ${e instanceof Error ? e.message : String(e)}`, moduleLogs: [], passed: 0, total: tests.length };
  }
  try {
    loadModule(compiled, consoleObj); // surface top-level errors once, up front
  } catch (e) {
    return { results: [], compileError: `Error while loading your code: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`, moduleLogs: moduleSink.lines, passed: 0, total: tests.length };
  }

  const results: TestResult[] = [];
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const sink: Sink = { lines: [] };
    sinkRef.current = sink;
    const start = Date.now();
    let status: TestResult['status'] = 'pass';
    let error: TestError | undefined;
    try {
      const mod = loadModule(compiled, consoleObj);
      const ctx: TestContext = {
        expect: createExpect(),
        clock: (s?: number) => new FakeClock(s),
        flush: macrotask,
        deferred,
      };
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<'timeout'>((res) => { timer = realSetTimeout(() => res('timeout'), perTest); });
      const outcome = await Promise.race([Promise.resolve().then(() => test.run(mod, ctx)).then(() => 'done' as const), timeout]);
      clearTimeout(timer);
      if (outcome === 'timeout') {
        status = 'timeout';
        error = { message: `Timed out after ${perTest}ms. A promise never settled, or the test waited on something that never happened.` };
      }
    } catch (e) {
      status = 'fail';
      error = toError(e);
    }
    const r: TestResult = { index: i, title: test.title, input: test.input, status, durationMs: Date.now() - start, error, logs: sink.lines };
    results.push(r);
    opts.onResult?.(r);
  }
  sinkRef.current = moduleSink;
  const passed = results.filter((r) => r.status === 'pass').length;
  return { results, moduleLogs: moduleSink.lines, passed, total: tests.length };
}
