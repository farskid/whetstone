import { transform } from 'sucrase';
import { createExpect, AssertionError } from './expect';
import { FakeClock, macrotask } from './clock';
import { format } from './format';
import type { Deferred, Language, RunSummary, TestCase, TestContext, TestError, TestResult } from './types';

/**
 * Strip TypeScript types (if any) and syntax-check. Output is still an ES module;
 * sucrase keeps line numbers stable, so stack lines map back to the editor.
 */
export function compile(source: string, language: Language): string {
  return transform(source, {
    transforms: language === 'ts' ? ['typescript'] : [],
    disableESTransforms: true,
    production: true,
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

const CONSOLE_KEY = '__practical_console__';
const inBrowser = typeof (globalThis as { WorkerGlobalScope?: unknown }).WorkerGlobalScope !== 'undefined' || typeof window !== 'undefined';
let loadCounter = 0;

/**
 * Evaluate compiled code as a real ES module and return a FRESH instance (new URL each time,
 * so module-level state never leaks between tests). `console` is shadowed by a module-scoped
 * const on line 1, so logs are captured without touching the global console.
 */
export async function loadModule(compiled: string, consoleObj: unknown): Promise<Record<string, unknown>> {
  (globalThis as Record<string, unknown>)[CONSOLE_KEY] = consoleObj;
  const code = `const console = globalThis.${CONSOLE_KEY}; ${compiled}\n// load ${++loadCounter}\n`;
  if (inBrowser) {
    const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    try { return await import(/* @vite-ignore */ url); } finally { URL.revokeObjectURL(url); }
  }
  return import(/* @vite-ignore */ `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

function toError(e: unknown): TestError {
  if (e instanceof AssertionError) return { message: e.message, expected: e.expected, actual: e.actual };
  if (e instanceof Error) {
    // Keep only frames from the user's module (a blob:/data: URL) and point at the line.
    const stack = (e.stack || '').split('\n')
      .filter((l) => /^\s*at /.test(l) && /(blob:|data:text)/.test(l))
      .map((l) => {
        const t = l.trim().slice(3);
        const line = t.match(/:(\d+):\d+\)?$/)?.[1];
        const name = t.includes(' (') ? t.split(' (')[0] : '<module>';
        return `  at ${name} (your code${line ? `, line ${line}` : ''})`;
      })
      .slice(0, 6).join('\n');
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
    await loadModule(compiled, consoleObj); // surface top-level errors once, up front
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
      const mod = await loadModule(compiled, consoleObj);
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
