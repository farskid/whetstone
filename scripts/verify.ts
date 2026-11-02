/**
 * npm run verify
 * For every problem, runs through the same runner the browser worker uses:
 *  - reference solution (TS, and the type-stripped JS) must pass every test
 *  - the starter code must compile (TS and JS) and fail
 *  - every broken/*.ts solution must fail at least one test
 * Staged problems (every stage lists its groups) also:
 *  - every test has a group, and every group belongs to exactly one stage; every stage adds at least one test
 *  - stages/<k>/statement.md exists for every stage, stages/1/starter.ts compiles and fails stage 1
 *  - the stage-k reference (stages/<k>/solution.ts, solution.ts for the last) passes stages 1..k (TS and JS)
 *    and fails at least one test that stage k+1 adds (so every split really asks for something new)
 *  - each stage's types file (stages/<k>/types.ts, types.ts for the last) holds only types, and no starter or
 *    reference redeclares a name it exports; code runs against the stage's types file, as in the browser
 *  - legacy code that declares its own copies of the types still passes, and so does it after adoptTypesFile()
 *  - broken/s<k>-*.ts must fail stage k (stages 1..k); every broken still fails the full run
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { problems } from '../src/problems/index';
import { runTests, stripTypes, compile } from '../src/runner/core';
import { adoptTypesFile, exportedTypeNames, findTypeDecls, ownCopiesOfTypes, TYPES_IMPORT_RE } from '../src/problems/typesFile';
import { isStaged, testsAddedBy, testsForStage } from '../src/problems/stages';
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
/** A tag name means one thing everywhere, so it must keep the same kind across problems. */
const tagKinds = new Map<string, string>();
for (const p of problems) {
  for (const t of p.tags ?? []) {
    const k = tagKinds.get(t.name);
    if (k && k !== t.kind) console.log(`  ✗ tag "${t.name}" is a ${k} in one problem and a ${t.kind} in ${p.id}`), failures++;
    tagKinds.set(t.name, t.kind);
  }
}
for (const p of problems) {
  if (only && p.id !== only) continue;
  console.log(`\n${p.catalogId} ${p.title} (${p.id}) — ${p.tests.length} tests`);
  const dir = join(root, p.id);
  if (seenIds.has(p.id)) fail(`duplicate id ${p.id}`);
  seenIds.add(p.id);
  for (const f of ['statement.md', 'starter.ts', 'solution.ts']) if (!existsSync(join(dir, f))) fail(`missing ${f}`);
  if (p.stages.length < 2) fail('stages[] should keep the catalog chain (>= 2 stages)');
  if (!p.tags?.length) fail('tags[] is empty: tag at least one library, framework, company or pattern');
  else if (new Set(p.tags.map((t) => t.name)).size !== p.tags.length) fail('tags[] has a duplicate name');
  const titles = new Set(p.tests.map((t) => t.title));
  if (titles.size !== p.tests.length) fail('test titles must be unique');

  const solution = readFileSync(join(dir, 'solution.ts'), 'utf8');
  const starter = readFileSync(join(dir, 'starter.ts'), 'utf8');
  // Staged problems keep the final stage's types in types.ts; the full starter and solution import them.
  const typesSource = isStaged(p) ? readIf(join(dir, 'types.ts')) : undefined;
  if (isStaged(p) && typesSource === undefined) fail('missing types.ts (the final stage\'s types)');
  if (!isStaged(p) && existsSync(join(dir, 'types.ts'))) fail('types.ts is only for staged problems');

  for (const [label, src, lang] of [['solution.ts', solution, 'ts'], ['solution (stripped to JS)', stripTypes(solution), 'js']] as const) {
    const s = await runTests(p.tests, src, lang, { typesSource });
    if (s.passed === s.total && !s.compileError) ok(`${label} passes ${s.passed}/${s.total}`);
    else fail(`${label} passed only ${s.passed}/${s.total}\n${describeFailures(s)}`);
  }

  try { compile(stripTypes(starter), 'js'); } catch (e) { fail(`starter JS does not compile: ${e}`); }
  const st = await runTests(p.tests, starter, 'ts', { typesSource });
  if (st.compileError) fail(`starter.ts: ${st.compileError}`);
  else if (st.passed === st.total) fail('starter passes every test (tests are too weak)');
  else ok(`starter fails as expected (${st.passed}/${st.total})`);

  if (isStaged(p)) await verifyStages(p, dir);
  else if (p.stages.some((st) => st.groups?.length)) fail('some stages list groups and some do not: list groups on every stage (staged) or none (single)');

  const brokenDir = join(dir, 'broken');
  const broken = existsSync(brokenDir) ? readdirSync(brokenDir).filter((f) => f.endsWith('.ts')) : [];
  if (!broken.length) fail('no broken/*.ts solution to check the tests against');
  for (const f of broken) {
    const s = await runTests(p.tests, readFileSync(join(brokenDir, f), 'utf8'), 'ts', { typesSource });
    if (s.compileError) fail(`broken/${f} does not compile: ${s.compileError}`);
    else if (s.passed === s.total) fail(`broken/${f} passes every test — tests miss this bug`);
    else ok(`broken/${f} caught: ${s.total - s.passed} failing (${s.results.filter((r) => r.status !== 'pass').map((r) => r.title).slice(0, 3).join('; ')}${s.total - s.passed > 3 ? '; …' : ''})`);
  }
}

async function verifyStages(p: (typeof problems)[number], dir: string) {
  const n = p.stages.length;
  const ungrouped = p.tests.filter((t) => !t.group);
  if (ungrouped.length) fail(`staged problem has tests with no group: ${ungrouped.map((t) => t.title).join('; ')}`);
  for (const g of new Set(p.tests.map((t) => t.group).filter(Boolean) as string[])) {
    const owners = p.stages.filter((st) => st.groups!.includes(g)).length;
    if (owners !== 1) fail(`group "${g}" belongs to ${owners} stages (must be exactly 1)`);
  }
  p.stages.forEach((st, k) => {
    for (const g of st.groups!) if (!p.tests.some((t) => t.group === g)) fail(`stage ${k + 1} lists group "${g}" but no test uses it`);
    if (!testsAddedBy(p, k).length) fail(`stage ${k + 1} adds no tests`);
  });
  for (let k = 1; k <= n; k++) if (!existsSync(join(dir, 'stages', `${k}`, 'statement.md'))) fail(`missing stages/${k}/statement.md`);

  const typesFile = (k: number) => (k === n - 1 ? 'types.ts' : `stages/${k + 1}/types.ts`);
  const stageTypes: (string | undefined)[] = [];
  for (let k = 0; k < n; k++) {
    const types = readIf(join(dir, typesFile(k)));
    stageTypes.push(types);
    if (types === undefined) { fail(`missing ${typesFile(k)}`); continue; }
    const code = stripTypes(types).replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '').replace(/\bexport\s*\{\s*\}\s*;?/g, '').trim();
    if (code) fail(`${typesFile(k)} must hold only types (it compiles to: ${code.slice(0, 80)})`);
    if (findTypeDecls(types).some((d) => !d.exported)) fail(`${typesFile(k)}: export every type (the solution imports them)`);
  }
  const noCopies = (file: string, src: string, k: number) => {
    const copies = ownCopiesOfTypes(src, stageTypes[k] ?? '');
    if (copies.length) fail(`${file} redeclares ${copies.join(', ')} from ${typesFile(k)}: import them from './types' instead`);
  };
  noCopies('starter.ts', readFileSync(join(dir, 'starter.ts'), 'utf8'), n - 1);

  const starterPath = join(dir, 'stages', '1', 'starter.ts');
  if (!existsSync(starterPath)) fail('missing stages/1/starter.ts (the stage-1 starter)');
  else {
    const starter = readFileSync(starterPath, 'utf8');
    noCopies('stages/1/starter.ts', starter, 0);
    try { compile(stripTypes(starter), 'js'); } catch (e) { fail(`stages/1/starter.ts JS does not compile: ${e}`); }
    const s = await runTests(testsForStage(p, 0), starter, 'ts', { typesSource: stageTypes[0] });
    if (s.compileError) fail(`stages/1/starter.ts: ${s.compileError}`);
    else if (s.passed === s.total) fail('stages/1/starter.ts passes stage 1');
    else ok(`stage-1 starter fails stage 1 as expected (${s.passed}/${s.total})`);
  }

  for (let k = 0; k < n; k++) {
    const file = k === n - 1 ? 'solution.ts' : `stages/${k + 1}/solution.ts`;
    if (!existsSync(join(dir, file))) { fail(`missing ${file}`); continue; }
    const src = readFileSync(join(dir, file), 'utf8');
    const typesSource = stageTypes[k];
    noCopies(file, src, k);
    const tests = testsForStage(p, k);
    for (const [label, code, lang] of [['ts', src, 'ts'], ['js', stripTypes(src), 'js']] as const) {
      const s = await runTests(tests, code, lang, { typesSource });
      if (s.passed === s.total && !s.compileError) ok(`stage ${k + 1}: ${file} [${label}] passes ${s.passed}/${s.total}`);
      else fail(`stage ${k + 1}: ${file} [${label}] passed only ${s.passed}/${s.total}\n${describeFailures(s)}`);
    }
    if (typesSource !== undefined) await verifyTypesLinking(file, src, typesSource, tests);
    if (k < n - 1) {
      const next = await runTests(testsAddedBy(p, k + 1), src, 'ts', { typesSource });
      if (!next.compileError && next.passed === next.total) fail(`stage ${k + 1} reference already passes everything stage ${k + 2} adds`);
      else ok(`stage ${k + 1} reference fails stage ${k + 2}'s new tests (${next.total - next.passed}/${next.total})`);
    }
  }

  const brokenDir = join(dir, 'broken');
  const staged = existsSync(brokenDir) ? readdirSync(brokenDir).filter((f) => /^s\d+-.*\.ts$/.test(f)) : [];
  for (const f of staged) {
    const k = Number(f.match(/^s(\d+)-/)![1]);
    if (k < 1 || k > n) { fail(`broken/${f}: stage ${k} does not exist`); continue; }
    const s = await runTests(testsForStage(p, k - 1), readFileSync(join(brokenDir, f), 'utf8'), 'ts', { typesSource: readIf(join(dir, typesFile(k - 1))) });
    if (s.compileError) fail(`broken/${f} does not compile: ${s.compileError}`);
    else if (s.passed === s.total) fail(`broken/${f} passes stage ${k}: its tests miss this bug`);
    else ok(`broken/${f} caught at stage ${k}: ${s.total - s.passed} failing`);
  }
}

function readIf(path: string) {
  return existsSync(path) ? readFileSync(path, 'utf8') : undefined;
}

/**
 * The two-file layout, end to end through the runner: a module import of './types' that survives compilation still
 * loads (and gets a readable error without a types file), and code saved before the split, with its own copies of
 * the types, passes both as it is and after adoptTypesFile() swaps the copies for an import.
 */
async function verifyTypesLinking(file: string, src: string, typesSource: string, tests: Parameters<typeof runTests>[0]) {
  const all = (s: RunSummary) => !s.compileError && s.passed === s.total;
  const sideEffect = `import './types';\n${src}`;
  if (!all(await runTests(tests, sideEffect, 'ts', { typesSource }))) fail(`${file} with a runtime import of './types' does not run`);
  const missing = await runTests(tests, sideEffect, 'ts');
  if (!missing.compileError?.includes("no types file")) fail(`${file}: importing './types' without a types file should say so (got: ${missing.compileError})`);

  const names = exportedTypeNames(typesSource);
  if (!names.length) return;
  const legacy = `${typesSource}\n${src.replace(new RegExp(`^import type[^;]*${TYPES_IMPORT_RE.source};?\\n`, 'm'), '')}`;
  if (ownCopiesOfTypes(legacy, typesSource).join() !== names.join()) fail(`${file}: legacy copies of ${names.join(', ')} not detected`);
  if (!all(await runTests(tests, legacy, 'ts', { typesSource }))) fail(`${file} with its own copies of the types (legacy) fails`);
  const adopted = adoptTypesFile(legacy, typesSource);
  if (ownCopiesOfTypes(adopted.code, typesSource).length) fail(`${file}: adoptTypesFile left copies behind`);
  if (!all(await runTests(tests, adopted.code, 'ts', { typesSource }))) fail(`${file} after adoptTypesFile fails`);
  else ok(`${file}: './types' links at runtime; legacy inline types (${names.length}) pass before and after adopting`);
}

console.log(failures ? `\nverify FAILED: ${failures} problem(s)` : `\nverify OK: ${problems.length} problems`);
process.exit(failures ? 1 : 0);
