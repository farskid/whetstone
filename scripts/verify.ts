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
 *  - every stage's starter and reference (and the full starter and solution) import from './types', even when the
 *    stage has no types yet (`import type {} from './types'`), so no import appears out of nowhere at a later stage
 *  - legacy code that declares its own copies of the types still passes, and so does it after adoptTypesFile()
 *  - broken/s<k>-*.ts must fail stage k (stages 1..k); every broken still fails the full run
 *  - every `<!-- tests: … -->` rule marker in a statement names tests that exist and run there (docs/rule-annotations.md)
 *  - named types: every exported function's and public class member's parameters and result in a stage reference or
 *    starter use names from that stage's types file, not inline object types, nested function types or names of
 *    their own (primitives, type parameters, built-ins, plain callbacks and the solution's classes are fine)
 *  - stage contracts (src/runner/contract.ts): a public signature that changes or goes away from stage k-1 to stage k
 *    (in the reference or its types file) must be covered by stage k's contract, by a check or a `@contract-skip`;
 *    a stage's contract keeps the previous stage's checks, so the last one (contract.ts) holds them all. Every check
 *    passes against its stage's reference (also with the types pasted in, as legacy code has them) and every check
 *    for a change of that stage fails against the previous stage's reference with its own old types
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { problems } from '../src/problems/index';
import { runTests, stripTypes, compile } from '../src/runner/core';
import { adoptTypesFile, exportedTypeNames, findTypeDecls, importsTypesFile, ownCopiesOfTypes, TYPES_IMPORT_RE } from '../src/problems/typesFile';
import { isStaged, testsAddedBy, testsForStage } from '../src/problems/stages';
import type { RunSummary, TestCase } from '../src/runner/types';
import { parseRuleMarks } from '../src/problems/ruleMarks';
import { parseContract, explainContract, contractKeys } from '../src/runner/contract';
import { tsc, dtsMembers, changedKeys, covers, namedTypeIssues } from './lib/contracts';

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

  checkRuleMarks('statement.md', readIf(join(dir, 'statement.md')) ?? '', titles);
  if (isStaged(p)) p.stages.forEach((_, k) => {
    const md = readIf(join(dir, 'stages', `${k + 1}`, 'statement.md'));
    if (md !== undefined) checkRuleMarks(`stages/${k + 1}/statement.md`, md, new Set(testsForStage(p, k).map((t) => t.title)), titles);
  });

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
  /** A staged file always imports './types', so a later stage that adds types doesn't make an import appear. */
  const importsTypes = (file: string, src: string) => {
    if (!importsTypesFile(src)) fail(`${file} does not import from './types': add \`import type { … } from './types';\` (or \`import type {} from './types';\` when it uses none yet)`);
  };
  for (const f of ['starter.ts', 'solution.ts']) importsTypes(f, readFileSync(join(dir, f), 'utf8'));
  noCopies('starter.ts', readFileSync(join(dir, 'starter.ts'), 'utf8'), n - 1);

  const starterPath = join(dir, 'stages', '1', 'starter.ts');
  if (!existsSync(starterPath)) fail('missing stages/1/starter.ts (the stage-1 starter)');
  else {
    const starter = readFileSync(starterPath, 'utf8');
    noCopies('stages/1/starter.ts', starter, 0);
    importsTypes('stages/1/starter.ts', starter);
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
    if (k < n - 1) importsTypes(file, src);
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

/** Rule markers must name tests that exist and that run where the statement is shown (`runs`), else they never paint. */
function checkRuleMarks(file: string, md: string, runs: Set<string>, all: Set<string> = runs) {
  const marks = parseRuleMarks(md);
  const before = failures;
  marks.forEach((tests, i) => {
    if (!tests.length) fail(`${file}: rule marker ${i + 1} names no tests`);
    for (const t of tests) {
      if (!all.has(t)) fail(`${file}: rule marker names a test that doesn't exist: "${t}"`);
      else if (!runs.has(t)) fail(`${file}: rule marker names "${t}", which doesn't run in this stage`);
    }
  });
  if (marks.length && failures === before) ok(`${file}: ${marks.length} rule marker(s) link to existing tests`);
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

/**
 * Named types and stage contracts for every staged problem, in two tsc runs over a temp tree (see the header). Legacy
 * code (the types pasted into the solution, no './types' import) stands in for a user whose own types didn't move on.
 */
{
  console.log('\nnamed types and stage contracts');
  const staged = problems.filter((p) => isStaged(p) && (!only || p.id === only));
  const legacy = (src: string, types: string) => `${types}\n${src.replace(new RegExp(`^import type[^;]*${TYPES_IMPORT_RE.source};?\\n`, 'm'), '')}`;
  interface StageFiles { solution: string; types: string; contract?: string; contractFile: string }
  const files = new Map<string, StageFiles[]>();
  const emit: Record<string, string> = {};
  for (const p of staged) {
    const dir = join(root, p.id);
    const n = p.stages.length;
    const list: StageFiles[] = [];
    for (let k = 1; k <= n; k++) {
      const last = k === n;
      const at = (f: string) => (last ? join(dir, f) : join(dir, 'stages', `${k}`, f));
      const contractFile = last ? 'contract.ts' : `stages/${k}/contract.ts`;
      const sf = { solution: readIf(at('solution.ts')) ?? '', types: readIf(at('types.ts')) ?? '', contract: readIf(at('contract.ts')), contractFile };
      list.push(sf);
      emit[`${p.id}/${k}/solution.ts`] = sf.solution;
      emit[`${p.id}/${k}/types.ts`] = sf.types;
    }
    {
      emit[`${p.id}/starter1/solution.ts`] = readIf(join(dir, 'stages', '1', 'starter.ts')) ?? '';
      emit[`${p.id}/starter1/types.ts`] = list[0].types;
      emit[`${p.id}/full/solution.ts`] = readIf(join(dir, 'starter.ts')) ?? '';
      emit[`${p.id}/full/types.ts`] = list[n - 1].types;
    }
    files.set(p.id, list);
  }
  const { dts } = tsc(emit, true);
  const members = (id: string, k: string) => new Map([...dtsMembers(dts[`${id}/${k}/types.d.ts`] ?? ''), ...dtsMembers(dts[`${id}/${k}/solution.d.ts`] ?? '')]);

  // Cases for the contract check: each stage's reference as is (ok) and with its types pasted in (own), and the
  // previous stage's reference with its own old types (prev).
  const cases: Record<string, string> = {};
  const changes = new Map<string, string[][]>();
  const bad = new Map<string, number>();
  const pfail = (id: string, msg: string) => { bad.set(id, (bad.get(id) ?? 0) + 1); fail(`${id}: ${msg}`); };
  for (const p of staged) {
    const list = files.get(p.id)!;
    const labels = list.map((_, k) => [`${k + 1}`, k === list.length - 1 ? 'solution.ts' : `stages/${k + 1}/solution.ts`]);
    for (const [k, label] of [...labels, ['starter1', 'stages/1/starter.ts'], ['full', 'starter.ts']]) {
      const sol = dts[`${p.id}/${k}/solution.d.ts`];
      if (sol === undefined) { pfail(p.id, `no declarations emitted for ${label}`); continue; }
      for (const issue of namedTypeIssues(sol, dts[`${p.id}/${k}/types.d.ts`] ?? '')) pfail(p.id, `${label}: ${issue}. Name it in the stage's types file and import it.`);
    }
    const perStage: string[][] = [[]];
    for (let k = 1; k < list.length; k++) perStage.push(changedKeys(members(p.id, `${k}`), members(p.id, `${k + 1}`)));
    changes.set(p.id, perStage);
    list.forEach((sf, k) => {
      const c = sf.contract ? parseContract(sf.contract) : { blocks: [], skips: [] };
      const keys = contractKeys(c);
      const uncovered = perStage[k].filter((key) => ![...keys].some((ck) => covers(ck, key)));
      if (uncovered.length) pfail(p.id, `stage ${k + 1} changes ${uncovered.join(', ')} from stage ${k}: add a check to ${sf.contractFile} (or \`// @contract-skip <key>: <why>\`)`);
      for (const b of c.blocks) {
        if (!b.keys.length || !b.message) pfail(p.id, `${sf.contractFile}: a @contract check needs keys and a message (line ${b.startLine})`);
      }
      if (k > 0 && list[k - 1].contract) {
        const carried = parseContract(list[k - 1].contract!).blocks.flatMap((b) => b.keys).filter((key) => !keys.has(key));
        if (carried.length) pfail(p.id, `${sf.contractFile} drops ${carried.join(', ')} that stage ${k}'s contract checks: keep the check (or skip it with a reason)`);
      }
      const here = members(p.id, `${k + 1}`);
      for (const b of c.blocks) for (const key of b.keys) if (![...here.keys()].some((m) => covers(key, m))) pfail(p.id, `${sf.contractFile}: @contract key ${key} names nothing stage ${k + 1} exports`);
      if (!sf.contract) return;
      const base = `${p.id}/${k + 1}`;
      cases[`${base}/ok/solution.ts`] = sf.solution;
      cases[`${base}/ok/types.ts`] = sf.types;
      cases[`${base}/ok/contract.ts`] = sf.contract;
      cases[`${base}/own/solution.ts`] = legacy(sf.solution, sf.types);
      cases[`${base}/own/types.ts`] = sf.types;
      cases[`${base}/own/contract.ts`] = sf.contract;
      if (k > 0) {
        cases[`${base}/prev/solution.ts`] = legacy(list[k - 1].solution, list[k - 1].types);
        cases[`${base}/prev/types.ts`] = sf.types;
        cases[`${base}/prev/contract.ts`] = sf.contract;
      }
    });
  }
  const { diagnostics } = tsc(cases);
  const diagsOf = (path: string) => diagnostics.filter((d) => d.file === path);
  for (const p of staged) {
    const list = files.get(p.id)!;
    const summary: string[] = [];
    list.forEach((sf, k) => {
      if (!sf.contract) return;
      const c = parseContract(sf.contract);
      const base = `${p.id}/${k + 1}`;
      for (const [kind, what] of [['ok', 'the reference'], ['own', 'the reference with its types pasted in']] as const) {
        const ds = diagsOf(`${base}/${kind}/contract.ts`);
        if (ds.length) pfail(p.id, `${sf.contractFile} fails on ${what}:\n      ${ds.map((d) => `line ${d.line}: ${d.message.split('\n')[0]}`).join('\n      ')}`);
      }
      if (k === 0) return;
      const failed = explainContract(c, diagsOf(`${base}/prev/contract.ts`).map((d) => ({ line: d.line, message: d.message })));
      const stageChanges = changes.get(p.id)![k];
      for (const b of c.blocks) {
        if (!b.keys.some((ck) => stageChanges.some((key) => covers(ck, key)))) continue;
        if (!failed.some((f) => f.message === b.message)) pfail(p.id, `${sf.contractFile}: the check for ${b.keys.join(', ')} passes on stage ${k}'s reference (with its own types), so it doesn't catch code that missed the change`);
        else summary.push(`s${k + 1} ${b.keys.join(', ')}`);
      }
    });
    if (!bad.get(p.id)) ok(`${p.id}: named types${summary.length ? `; contract checks that fail on the previous stage's code: ${summary.join('; ')}` : ''}`);
  }
}

// User code sees browser timers in Node too: setTimeout/setInterval return numbers that clearTimeout/clearInterval take.
{
  console.log('\nrunner: browser-style timers');
  const user = `
    export function handles() {
      let fired = 0, ticks = 0;
      const t: number = setTimeout(() => { fired++; }, 5);
      const dropped: number = setTimeout(() => { fired += 100; }, 5);
      clearTimeout(dropped);
      const i: number = setInterval(() => { if (++ticks === 2) clearInterval(i); }, 1);
      return { t, dropped, i, done: new Promise<{ fired: number; ticks: number }>((r) => setTimeout(() => r({ fired, ticks }), 30)) };
    }
    export const clockStillWorks = (clock: { setTimeout(fn: () => void, ms: number): number }) => clock.setTimeout(() => {}, 1);`;
  const own = `function setTimeout(fn: () => void) { fn(); return 'mine'; }\nexport const run = () => { let x = 0; const r = setTimeout(() => { x = 1; }); return [r, x]; };`;
  const tests: TestCase[] = [
    { title: 'setTimeout and setInterval return numbers; clearTimeout and clearInterval take them', async run(m, { expect }) {
      const h = m.handles();
      for (const k of ['t', 'dropped', 'i']) expect(typeof h[k]).toBe('number');
      expect(await h.done).toEqual({ fired: 1, ticks: 2 });
    } },
    { title: 'a numeric handle from user code clears from outside too', async run(m, { expect }) {
      const h = m.handles();
      clearTimeout(h.t);
      clearInterval(h.i);
      expect(await h.done).toEqual({ fired: 0, ticks: 0 });
    } },
    { title: 'the fake clock still hands out numbers', run(m, { expect, clock }) { expect(typeof m.clockStillWorks(clock())).toBe('number'); } },
  ];
  for (const lang of ['ts', 'js'] as const) {
    const s = await runTests(tests, lang === 'ts' ? user : stripTypes(user), lang);
    if (s.compileError || s.passed !== s.total) fail(`[${lang}] timers:\n${describeFailures(s)}`);
    else ok(`[${lang}] user code gets numeric timer handles (${s.passed}/${s.total})`);
  }
  const mine = await runTests([{ title: 'own setTimeout', run(m, { expect }) { expect(m.run()).toEqual(['mine', 1]); } }], own, 'ts');
  if (mine.compileError || mine.passed !== 1) fail(`code that declares its own setTimeout:\n${describeFailures(mine)}`);
  else ok('code that declares its own setTimeout keeps it');
}

console.log(failures ? `\nverify FAILED: ${failures} problem(s)` : `\nverify OK: ${problems.length} problems`);
process.exit(failures ? 1 : 0);
