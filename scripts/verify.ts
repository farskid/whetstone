/**
 * npm run verify
 * For every problem, runs through the same runner the browser worker uses:
 *  - reference solution (TS, and the type-stripped JS) must pass every test
 *  - the starter code must compile (TS and JS) and fail
 *  - every broken/*.ts solution must fail at least one test
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { problems } from '../src/problems/index';
import { runTests, stripTypes, compile } from '../src/runner/core';
import type { RunSummary } from '../src/runner/types';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'problems');
// A test that fails early can leave a user promise rejected with no handler; that's not a crash.
process.on('unhandledRejection', () => {});
const only = process.argv[2];
let failures = 0;
const fail = (msg: string) => { failures++; console.log(`  ✗ ${msg}`); };
const ok = (msg: string) => console.log(`  ✓ ${msg}`);

function describeFailures(s: RunSummary) {
  if (s.compileError) return `    compile: ${s.compileError}`;
  return s.results.filter((r) => r.status !== 'pass').map((r) =>
    `    - ${r.title}: ${r.error?.message}${r.error?.expected ? `\n      expected: ${r.error.expected}\n      actual:   ${r.error.actual}` : ''}${r.error?.stack ? `\n      ${r.error.stack.split('\n').slice(0, 3).join('\n      ')}` : ''}`).join('\n');
}

const seenIds = new Set<string>();
for (const p of problems) {
  if (only && p.id !== only) continue;
  console.log(`\n${p.catalogId} ${p.title} (${p.id}) — ${p.tests.length} tests`);
  const dir = join(root, p.id);
  if (seenIds.has(p.id)) fail(`duplicate id ${p.id}`);
  seenIds.add(p.id);
  for (const f of ['statement.md', 'starter.ts', 'solution.ts']) if (!existsSync(join(dir, f))) fail(`missing ${f}`);
  if (p.stages.length < 2) fail('stages[] should keep the catalog chain (>= 2 stages)');
  const titles = new Set(p.tests.map((t) => t.title));
  if (titles.size !== p.tests.length) fail('test titles must be unique');

  const solution = readFileSync(join(dir, 'solution.ts'), 'utf8');
  const starter = readFileSync(join(dir, 'starter.ts'), 'utf8');

  for (const [label, src, lang] of [['solution.ts', solution, 'ts'], ['solution (stripped to JS)', stripTypes(solution), 'js']] as const) {
    const s = await runTests(p.tests, src, lang);
    if (s.passed === s.total && !s.compileError) ok(`${label} passes ${s.passed}/${s.total}`);
    else fail(`${label} passed only ${s.passed}/${s.total}\n${describeFailures(s)}`);
  }

  try { compile(stripTypes(starter), 'js'); } catch (e) { fail(`starter JS does not compile: ${e}`); }
  const st = await runTests(p.tests, starter, 'ts');
  if (st.compileError) fail(`starter.ts: ${st.compileError}`);
  else if (st.passed === st.total) fail('starter passes every test (tests are too weak)');
  else ok(`starter fails as expected (${st.passed}/${st.total})`);

  const brokenDir = join(dir, 'broken');
  const broken = existsSync(brokenDir) ? readdirSync(brokenDir).filter((f) => f.endsWith('.ts')) : [];
  if (!broken.length) fail('no broken/*.ts solution to check the tests against');
  for (const f of broken) {
    const s = await runTests(p.tests, readFileSync(join(brokenDir, f), 'utf8'), 'ts');
    if (s.compileError) fail(`broken/${f} does not compile: ${s.compileError}`);
    else if (s.passed === s.total) fail(`broken/${f} passes every test — tests miss this bug`);
    else ok(`broken/${f} caught: ${s.total - s.passed} failing (${s.results.filter((r) => r.status !== 'pass').map((r) => r.title).slice(0, 3).join('; ')}${s.total - s.passed > 3 ? '; …' : ''})`);
  }
}

console.log(failures ? `\nverify FAILED: ${failures} problem(s)` : `\nverify OK: ${problems.length} problems`);
process.exit(failures ? 1 : 0);
