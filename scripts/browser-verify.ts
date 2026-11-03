/**
 * npm run verify:browser  (run `npm run build` first)
 * Pass problem ids to check only those. Runs every problem's reference solution (TS, and stripped-to-JS) through the real
 * in-browser worker of the built site and checks that all tests pass (staged problems in "full problem" mode). Staged
 * problems also run each stage's reference on that stage, and one staged flow is clicked through: pass stage 1 in the
 * editor, see stage 2 unlock, continue to it with the code carried over while the read-only types.ts beside it swaps to
 * stage 2's (typing into it does nothing), then pass stage 2. Code saved with its own copies of the types gets the
 * "Import from types.ts" offer, and a narrow window stacks the two editors. Screenshots go to SHOTS_DIR
 * (default /workspace) as whetstone-two-editors-*.png. The header theme picker is checked too (Dark/Light/System, System
 * following an emulated OS colour scheme live, Monaco following along); its screenshots are whetstone-theme-*.png.
 * The divider between types.ts and the solution is dragged and moved by keyboard, side by side and stacked, and must persist
 * across a reload (whetstone-editor-split-*.png). Any request that 404s (a worker, chunk or asset
 * resolved outside the base) fails the run too. The "Cracked" effect must play only when the whole problem newly goes
 * green (not on a stage pass, a green re-run or a reload of a solved problem) and again after red → green or Reset.
 * VERIFY_BASE=/whetstone/ serves dist/ under that base, to check a build made with BASE_PATH=/whetstone/.
 */
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright-core';
import { transform } from 'sucrase';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4790;
const BASE_PATH = process.env.VERIFY_BASE ?? '/';
const BASE = `http://localhost:${PORT}${BASE_PATH}`;
const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';
const problemsDir = join(root, 'src', 'problems');
const only = process.argv.slice(2);
const toJs = (ts: string, lang: 'ts' | 'js') => (lang === 'ts' ? ts : transform(ts, { transforms: ['typescript'], disableESTransforms: true }).code);
const SHOTS = process.env.SHOTS_DIR ?? '/workspace';
/** The user's editor; staged problems also show the read-only types editor. */
const SOL = '[data-testid="solution-editor"] .monaco-editor .view-lines';
const TYPES = '[data-testid="types-editor"] .monaco-editor .view-lines';
const norm = (l: string) => l.replace(/\s+/g, ' ').trim();
const ids = readdirSync(problemsDir).filter((d) => existsSync(join(problemsDir, d, 'solution.ts')) && (only.length === 0 || only.includes(d)));

// Own process group, so killing it also stops the vite child that npx starts (otherwise a stale preview keeps the port).
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--base', BASE_PATH], { cwd: root, stdio: 'pipe', detached: true });
let serverExited = false;
server.on('exit', () => { serverExited = true; });
process.on('exit', () => { try { process.kill(-server.pid!, 'SIGTERM'); } catch { /* gone */ } });
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => process.exit(1));

async function main() {
  for (let i = 0; i < 100; i++) {
    if (serverExited) throw new Error(`vite preview exited (is port ${PORT} already in use?)`);
    try { if ((await fetch(BASE)).ok) break; } catch { /* not up */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  let failed = 0;
  const fail = (msg: string) => { failed++; console.log(`  ✗ ${msg}`); };

  /** Opens a problem with the given saved progress (v2) and returns the page plus the list of bad requests. */
  async function open(id: string, state: Record<string, unknown>) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
    await ctx.addInitScript(`if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('practical:v2', ${JSON.stringify(JSON.stringify({ version: 2, theme: 'dark', ...state }))}); }`);
    const page = await ctx.newPage();
    const bad: string[] = [];
    page.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
    page.on('requestfailed', (r) => bad.push(`failed ${r.url()}`));
    await page.goto(`${BASE}#/p/${id}`);
    await page.waitForSelector(SOL, { timeout: 20000 });
    return { ctx, page, bad };
  }
  /** The rendered lines of an editor, top to bottom (Monaco renders only what is visible). */
  async function editorLines(page: Page, sel: string) {
    return page.$$eval(`${sel} .view-line`, (els) => els
      .map((e) => ({ top: parseFloat((e as HTMLElement).style.top) || 0, text: (e.textContent ?? '').replace(/\u00a0/g, ' ') }))
      .sort((a, b) => a.top - b.top).map((l) => l.text));
  }
  const sameText = (lines: string[], src: string) => lines.map(norm).join('\n').trim() === src.split('\n').map(norm).join('\n').trim();
  async function paste(page: Page, text: string) {
    await page.click(SOL);
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    // A real paste (typing key by key gets the editor's auto-indent and auto-closing brackets).
    await page.evaluate((t) => navigator.clipboard.writeText(t), text);
    await page.keyboard.press('ControlOrMeta+V');
  }
  async function runAndCheck(label: string, page: Page, bad: string[]) {
    await page.click('[data-testid="run"]');
    await page.waitForFunction(() => !document.querySelector('[data-testid="run"]')?.hasAttribute('disabled'), null, { timeout: 60000 });
    // Passing a stage stays on it with its results (the "Stage k cleared" banner offers the next one).
    const passed = await page.$('[data-testid="all-passed"]');
    if (bad.length) fail(`${label} bad requests:\n    ${bad.join('\n    ')}`);
    if (passed) console.log(`  ✓ ${label} ${await passed.textContent()}`);
    else fail(`${label} ${(await page.textContent((await page.$('.results')) ? '.results' : 'main'))?.slice(0, Number(process.env.VERIFY_DETAIL ?? 300))}`);
    return !!passed;
  }

  for (const id of ids) {
    const dir = join(problemsDir, id);
    const ts = readFileSync(join(dir, 'solution.ts'), 'utf8');
    const n = existsSync(join(dir, 'stages')) ? readdirSync(join(dir, 'stages')).filter((f) => /^\d+$/.test(f)).length : 0;
    // The whole problem: staged ones in "full problem" mode.
    for (const lang of ['ts', 'js'] as const) {
      const { ctx, page, bad } = await open(id, { lang, code: { [id]: { [lang]: toJs(ts, lang) } }, full: n > 1 ? { [id]: true } : {} });
      const hasBar = !!(await page.$('[data-testid="stage-bar"]'));
      if (hasBar !== n > 1) fail(`${id} [${lang}] stage bar ${hasBar ? 'shown on an unstaged problem' : 'missing'}`);
      const hasTypes = !!(await page.$('[data-testid="types-editor"]'));
      if (hasTypes !== n > 1) fail(`${id} [${lang}] types editor ${hasTypes ? 'shown on an unstaged problem' : 'missing'}`);
      await runAndCheck(`${id} [${lang}]${n > 1 ? ' full' : ''}`, page, bad);
      await ctx.close();
    }
    // Each stage's reference on its own stage.
    for (let k = 0; k < (n > 1 ? n : 0); k++) {
      const ref = k === n - 1 ? ts : readFileSync(join(dir, 'stages', `${k + 1}`, 'solution.ts'), 'utf8');
      for (const lang of ['ts', 'js'] as const) {
        const passedAt = Array.from({ length: n }, (_, j) => (j < k ? '2026-01-01T00:00:00.000Z' : null));
        const { ctx, page, bad } = await open(id, { lang, code: { [id]: { [lang]: toJs(ref, lang) } }, stage: { [id]: k }, stagePassed: { [id]: passedAt } });
        const label = await page.textContent('.stage-label');
        if (label?.trim() !== `Stage ${k + 1} of ${n}`) fail(`${id} stage ${k + 1} [${lang}] opened on "${label}"`);
        await runAndCheck(`${id} stage ${k + 1}/${n} [${lang}]`, page, bad);
        await ctx.close();
      }
    }
  }

  // A staged flow through the real UI: fresh F1, type the stage-1 reference, pass stage 1, continue to stage 2.
  const flowId = 'f1-debounce';
  if (ids.includes(flowId)) {
    const { ctx, page, bad } = await open(flowId, { lang: 'ts' });
    const check = (ok: boolean, what: string) => (ok ? console.log(`  ✓ flow: ${what}`) : fail(`flow: ${what}`));
    check(await page.isDisabled('[data-testid="stage-tab-2"]'), 'stage 2 starts locked');
    const read = (...p: string[]) => readFileSync(join(problemsDir, flowId, ...p), 'utf8');
    const [s1, s2, t1, t2] = [read('stages', '1', 'solution.ts'), read('stages', '2', 'solution.ts'), read('stages', '1', 'types.ts'), read('stages', '2', 'types.ts')];
    check(sameText(await editorLines(page, TYPES), t1), 'types.ts shows stage 1\'s types');
    // Read-only: typing into types.ts changes nothing.
    await page.click(TYPES);
    await page.keyboard.press('ControlOrMeta+End');
    await page.keyboard.type('\nexport type Hacked = 1;');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    check(sameText(await editorLines(page, TYPES), t1), 'typing into types.ts does nothing (read-only)');
    check(!!(await page.waitForSelector('.monaco-editor-overlaymessage', { timeout: 3000 }).catch(() => null)), 'types.ts says it is read-only');
    await page.screenshot({ path: join(SHOTS, 'whetstone-two-editors-0-readonly.png') });
    await paste(page, s1);
    check(await runAndCheck(`flow: ${flowId} stage 1 typed in the editor`, page, bad), 'stage 1 passes');
    // A stage pass plays the effect with a "Stage 1 cleared" banner and stays on stage 1 until "Go to stage 2".
    const cleared = await page.$('[data-testid="stage-cleared"]');
    const clearedText = (await cleared?.textContent()) ?? '';
    check(/Stage 1 cleared/.test(clearedText) && /Next: stage 2/.test(clearedText), `the "Stage 1 cleared" banner shows ("${clearedText.trim()}")`);
    check(await page.getAttribute('[data-testid="cracked-fx"]', 'data-kind') === 'stage' && !(await page.$('[data-testid="solved-badge"]')), 'it is the stage banner, not "Cracked"');
    check(((await page.textContent('[data-testid="go-next-stage"]')) ?? '').includes('Go to stage 2'), 'the banner has a "Go to stage 2" button');
    await page.waitForTimeout(2500);
    check((await page.textContent('.stage-label'))?.trim() === 'Stage 1 of 3' && !!(await page.$('[data-testid="stage-cleared"]')), 'no silent jump: still on stage 1 with the banner up after 2.5 s');
    check(!(await page.isDisabled('[data-testid="stage-tab-2"]')), 'stage 2 tab enabled');
    await page.screenshot({ path: join(SHOTS, 'whetstone-two-editors-1-stage1-passed.png') });
    await page.click('[data-testid="go-next-stage"]');
    check(await page.getAttribute('[data-testid="stage-tab-2"]', 'aria-selected') === 'true', '"Go to stage 2" selects the stage 2 tab');
    check(!(await page.$('[data-testid="cracked-fx"]')), 'the banner goes away on stage 2');
    check(await page.isDisabled('[data-testid="stage-tab-3"]'), 'stage 3 still locked');
    check((await page.textContent('[data-testid="stage-tab-1"]'))?.includes('✓') ?? false, 'stage 1 tab shows ✓');
    check((await page.textContent('.stage-label'))?.trim() === 'Stage 2 of 3', 'label reads "Stage 2 of 3"');
    // The stage swaps types.ts (stage 2 adds leading/trailing to DebounceOptions) and leaves the solution alone.
    await page.waitForTimeout(400); // the store saves 150 ms after a change
    check(sameText(await editorLines(page, TYPES), t2), 'types.ts now shows stage 2\'s types');
    check(!!(await page.$('[data-testid="types-updated"]')), 'types.ts is marked "updated"');
    const added = await page.$$('[data-testid="types-editor"] .types-new-line');
    const before1 = new Set(t1.split('\n').map((l) => l.trim()));
    const newLines = t2.split('\n').filter((l) => l.trim() && !before1.has(l.trim())).length;
    check(added.length === newLines, `the ${newLines} lines stage 2 added are highlighted (${added.length})`);
    const lines = (await editorLines(page, SOL)).map(norm).filter(Boolean);
    const s1Lines = new Set(s1.split('\n').map(norm));
    const saved = await page.evaluate((id) => JSON.parse(localStorage.getItem('practical:v2') ?? '{}').code?.[id]?.ts, flowId);
    check(lines.length > 5 && lines.every((l) => s1Lines.has(l)), `the stage-1 code is still in the editor on stage 2 (${lines.length} visible lines checked)`);
    check(saved === s1, 'the saved buffer is the stage-1 code');
    // The stage-1 code type-checks against stage 2's types: no red squiggles.
    await page.waitForTimeout(2500);
    const squiggles = await page.$$('[data-testid="solution-editor"] .squiggly-error');
    check(squiggles.length === 0, `no type errors in the carried-over code (${squiggles.length})`);
    await page.screenshot({ path: join(SHOTS, 'whetstone-two-editors-2-stage2-types-swapped.png') });
    // Stage 2 runs stage 1 + 2 tests; the stage-1 code fails some of them, the stage-2 reference passes.
    await page.click('[data-testid="run"]');
    await page.waitForFunction(() => !document.querySelector('[data-testid="run"]')?.hasAttribute('disabled'), null, { timeout: 60000 });
    check(!(await page.$('[data-testid="all-passed"]')), 'the stage-1 code does not pass stage 2');
    await paste(page, s2);
    check(await runAndCheck(`flow: ${flowId} stage 2 reference in the editor`, page, bad), 'stage 2 passes with the stage-2 solution');
    check(/Stage 2 cleared/.test((await page.textContent('[data-testid="stage-cleared"]').catch(() => '')) ?? ''), 'passing stage 2 shows "Stage 2 cleared"');
    check((await page.textContent('.stage-label'))?.trim() === 'Stage 2 of 3', 'and stays on stage 2');
    await page.screenshot({ path: join(SHOTS, 'whetstone-two-editors-3-stage2-passed.png') });
    // "Stay on stage 2" puts the banner away into a bar above the tests, which still offers the next stage.
    await page.click('[data-testid="stay-on-stage"]');
    const bar = await page.$('[data-testid="stage-unlocked"]');
    check(!(await page.$('[data-testid="cracked-fx"]')) && /Stage 2 cleared.*stage 3/.test((await bar?.textContent()) ?? ''), '"Stay on stage 2" leaves a "Stage 2 cleared" bar');
    await page.click('[data-testid="stage-unlocked"] [data-testid="go-next-stage"]');
    check((await page.textContent('.stage-label'))?.trim() === 'Stage 3 of 3' && !(await page.$('[data-testid="stage-unlocked"]')), 'the bar\'s "Go to stage 3" moves on to stage 3');
    // Statement borders: passed stages are the pass colour (the viewed one too, once passed); the viewed stage that
    // isn't passed yet is the accent.
    const border = (k: number) => page.$eval(`[data-testid="stage-section-${k}"]`, (e) => getComputedStyle(e).borderLeftColor);
    const cssVar = (v: string) => page.evaluate((name) => {
      const d = document.createElement('div'); d.style.color = `var(${name})`; document.body.append(d);
      const c = getComputedStyle(d).color; d.remove(); return c;
    }, v);
    for (const t of ['dark', 'light'] as const) {
      await page.selectOption('[data-testid="theme-select"]', t);
      await page.waitForTimeout(200);
      const [pass, accent] = [await cssVar('--pass'), await cssVar('--accent')];
      check(await border(1) === pass && await border(2) === pass, `[${t}] passed stages 1 and 2 have pass-coloured left borders`);
      check(await border(3) === accent, `[${t}] stage 3 (viewed, not passed yet) has the accent left border`);
      await page.screenshot({ path: join(SHOTS, `whetstone-stage-border-${t}.png`) });
      await page.click('[data-testid="stage-tab-2"]');
      await page.waitForTimeout(200);
      check(await border(2) === pass && await page.$eval('[data-testid="stage-section-2"]', (e) => e.classList.contains('current')), `[${t}] viewing passed stage 2: it is current and pass-coloured`);
      await page.click('[data-testid="stage-tab-3"]');
      await page.waitForTimeout(200);
    }
    await page.selectOption('[data-testid="theme-select"]', 'dark');
    await page.reload();
    await page.waitForSelector(SOL, { timeout: 20000 });
    check(!(await page.isDisabled('[data-testid="stage-tab-2"]')), 'stage 2 stays unlocked after a reload');
    await page.goto(`${BASE}#/`);
    const pill = await page.waitForSelector(`[data-testid="stages-${flowId}"]`, { timeout: 10000 }).then((h) => h.textContent()).catch(() => null);
    check(!!pill && pill.includes('2/3'), `list row shows stage progress ("${pill?.trim()}")`);
    if (bad.length) fail(`flow bad requests:\n    ${bad.join('\n    ')}`);
    await ctx.close();

    // Code saved before the split declares its own copies of the types: it still runs, and one click imports them.
    const t1Names = [...t1.matchAll(/^export (?:interface|type) (\w+)/gm)].map((m) => m[1]);
    const legacy = `${t1}\n${s1.replace(/^import type .*\n/m, '')}`;
    const old = await open(flowId, { lang: 'ts', code: { [flowId]: { ts: legacy } } });
    const banner = await old.page.waitForSelector('[data-testid="own-types"]', { timeout: 5000 }).catch(() => null);
    check(!!banner && ((await banner.textContent()) ?? '').includes(t1Names.join(', ')), `legacy code gets the "Import from types.ts" offer, naming ${t1Names.join(', ')}`);
    check(await runAndCheck('flow: legacy code with its own types', old.page, old.bad), 'legacy code still passes stage 1');
    // That first pass shows the stage banner; clicking the stage-1 tab puts it away, and re-passing stays put.
    check(!!(await old.page.$('[data-testid="stage-cleared"]')), 'the legacy code\'s first pass shows the stage banner');
    await old.page.click('[data-testid="stage-tab-1"]');
    await old.page.waitForTimeout(300);
    await old.page.screenshot({ path: join(SHOTS, 'whetstone-two-editors-4-legacy-offer.png') });
    await old.page.click('[data-testid="use-types-file"]');
    await old.page.waitForTimeout(400);
    const adopted = await old.page.evaluate((id) => JSON.parse(localStorage.getItem('practical:v2') ?? '{}').code?.[id]?.ts as string, flowId);
    check(!(await old.page.$('[data-testid="own-types"]')), 'the offer goes away after importing');
    check(adopted.startsWith(`import type { ${t1Names.join(', ')} } from './types';`) && !/^export interface/m.test(adopted), 'the saved code imports the types instead of declaring them');
    check(await runAndCheck('flow: legacy code after importing types.ts', old.page, old.bad), 'it still passes after importing');
    check((await old.page.textContent('.stage-label'))?.trim() === 'Stage 1 of 3' && !!(await old.page.$('[data-testid="all-passed"]')) && !(await old.page.$('[data-testid="cracked-fx"]')), 're-passing stage 1 stays on stage 1 with its results, no banner again');
    await old.page.click(SOL);
    await old.page.keyboard.press('ControlOrMeta+Z');
    check(!!(await old.page.waitForSelector('[data-testid="own-types"]', { timeout: 3000 }).catch(() => null)), 'Ctrl/⌘+Z brings the old declarations (and the offer) back');
    await old.ctx.close();

    // In the worker, user code's timers hand back numbers (browser-style), which clearTimeout/clearInterval take.
    const probe = "const t: number = setTimeout(() => {}, 1); const i: number = setInterval(() => {}, 1); clearTimeout(t); clearInterval(i);\nconsole.log('timer handles:', typeof t, typeof i);\n";
    const tm = await open(flowId, { lang: 'ts', code: { [flowId]: { ts: s1.replace(/^(import type .*\n)/m, `$1${probe}`) } } });
    await tm.page.click('[data-testid="run"]');
    await tm.page.waitForFunction(() => !document.querySelector('[data-testid="run"]')?.hasAttribute('disabled'), null, { timeout: 60000 });
    const logs = (await tm.page.textContent('.module-logs pre').catch(() => '')) ?? '';
    check(logs.includes('timer handles: number number') && !!(await tm.page.$('[data-testid="all-passed"]')), `user code's setTimeout/setInterval return numbers in the worker ("${logs.trim()}")`);
    await tm.ctx.close();

    // "Cracked": the final stage passing plays the effect once; the header then says Cracked.
    const last = await open(flowId, { lang: 'ts', code: { [flowId]: { ts: read('solution.ts') } }, stage: { [flowId]: 2 }, stagePassed: { [flowId]: ['2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', null] } });
    check(await runAndCheck('flow: final stage reference', last.page, last.bad), 'the final stage passes');
    check(!!(await last.page.$('[data-testid="cracked-fx"]')), 'passing the final stage plays "Cracked"');
    check(((await last.page.textContent('[data-testid="solved-badge"]')) ?? '').includes('Cracked'), 'the header says Cracked');
    await last.ctx.close();

    // A narrow window stacks types.ts above the solution.
    const narrowCtx = await browser.newContext({ viewport: { width: 760, height: 900 } });
    const narrow = await narrowCtx.newPage();
    await narrow.goto(`${BASE}#/p/${flowId}`);
    await narrow.waitForSelector(SOL, { timeout: 20000 });
    const tb = await narrow.locator('[data-testid="types-editor"]').boundingBox();
    const sb = await narrow.locator('[data-testid="solution-editor"]').boundingBox();
    check(!!tb && !!sb && tb.y + tb.height <= sb.y + 1 && Math.abs(tb.x - sb.x) < 2, 'a narrow window stacks the editors');
    await narrow.screenshot({ path: join(SHOTS, 'whetstone-two-editors-5-narrow.png') });
    await narrowCtx.close();
  }

  // "Cracked" on a single-stage problem: plays on the first all-green run, not on a green re-run, again after red →
  // green, again after Reset, and never on a solved problem's green re-run after a reload.
  const crackId = 'a9-promise-all-settled';
  if (ids.includes(crackId)) {
    const ref = readFileSync(join(problemsDir, crackId, 'solution.ts'), 'utf8');
    const { ctx, page, bad } = await open(crackId, { lang: 'ts' });
    const check = (ok: boolean, what: string) => (ok ? console.log(`  ✓ cracked: ${what}`) : fail(`cracked: ${what}`));
    const fx = () => page.$('[data-testid="cracked-fx"]');
    const run = async () => {
      await page.click('[data-testid="run"]');
      await page.waitForFunction(() => !document.querySelector('[data-testid="run"]')?.hasAttribute('disabled'), null, { timeout: 60000 });
    };
    const gone = () => page.waitForSelector('[data-testid="cracked-fx"]', { state: 'detached', timeout: 4000 }).then(() => true).catch(() => false);
    check(!(await page.$('[data-testid="solved-badge"]')), 'an unsolved problem has no Cracked badge');
    await paste(page, ref);
    await run();
    check(!!(await fx()), 'the first all-green run plays it');
    check(((await page.textContent('[data-testid="solved-badge"]')) ?? '').includes('Cracked'), 'the header says Cracked');
    check(await gone(), 'it goes away by itself');
    await run();
    check(!(await fx()), 'a green re-run does not play it again');
    await paste(page, 'export {}');
    await run();
    check(!(await fx()), 'a red run does not play it');
    await paste(page, ref);
    await run();
    check(!!(await fx()), 'red → green plays it again');
    page.once('dialog', (d) => d.accept());
    await page.click('[data-testid="reset"]');
    check(!(await fx()), 'Reset clears it');
    await paste(page, ref);
    await run();
    check(!!(await fx()), 'green after Reset plays it again');
    await page.waitForTimeout(400);
    await page.reload();
    await page.waitForSelector(SOL, { timeout: 20000 });
    await run();
    check(!(await fx()), 'a solved problem re-run green after a reload does not play it');
    await page.goto(`${BASE}#/`);
    const dot = await page.waitForSelector(`[data-testid="problem-${crackId}"]`, { timeout: 10000 }).then(() => page.$eval(`[data-testid="problem-${crackId}"]`, (a) => a.closest('.problem-row')?.querySelector('.status-dot.ok .crack-lock') ? true : false));
    check(dot, 'the list row shows the cracked lock');
    if (bad.length) fail(`cracked bad requests:\n    ${bad.join('\n    ')}`);
    await ctx.close();

  }
  // Theme picker: Dark / Light / System, where System follows the OS live; Monaco follows the resolved theme.
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    const check = (ok: boolean, what: string) => (ok ? console.log(`  ✓ theme: ${what}`) : fail(`theme: ${what}`));
    const shown = () => page.evaluate(() => document.documentElement.dataset.theme);
    const monacoIs = (cls: 'vs' | 'vs-dark') => page.waitForFunction((c) => {
      const el = document.querySelector('[data-testid="solution-editor"] .monaco-editor');
      return !!el && el.classList.contains(c);
    }, cls, { timeout: 5000 }).then(() => true, () => false);
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('practical:v2') ?? '{}').theme);
    const id = ids.includes('f1-debounce') ? 'f1-debounce' : ids[0];
    await page.goto(`${BASE}#/p/${id}`);
    await page.waitForSelector(SOL, { timeout: 20000 });
    const sel = '[data-testid="theme-select"]';
    check(await page.inputValue(sel) === 'dark' && await shown() === 'dark', 'a fresh visit starts on Dark');
    check(await page.getAttribute(sel, 'aria-label') === 'Color theme', 'the picker is labelled');
    await page.selectOption(sel, 'light');
    check(await shown() === 'light' && await monacoIs('vs'), 'Light: page and Monaco go light');
    await page.screenshot({ path: join(SHOTS, 'whetstone-theme-light.png') });
    // Keyboard: focus the select and arrow up to Dark.
    await page.focus(sel);
    await page.keyboard.press('ArrowUp');
    check(await page.inputValue(sel) === 'dark' && await shown() === 'dark' && await monacoIs('vs-dark'), 'keyboard ArrowUp picks Dark; Monaco goes dark');
    await page.screenshot({ path: join(SHOTS, 'whetstone-theme-dark.png') });
    await page.selectOption(sel, 'system');
    await page.waitForTimeout(300);
    check(await shown() === 'dark' && await monacoIs('vs-dark'), 'System with a dark OS is dark');
    await page.emulateMedia({ colorScheme: 'light' });
    check(await page.waitForFunction(() => document.documentElement.dataset.theme === 'light', null, { timeout: 3000 }).then(() => true, () => false) && await monacoIs('vs'), 'System follows the OS to light live');
    check(((await page.textContent(`${sel} option[value="system"]`)) ?? '').includes('light'), 'the System option names the theme it resolved to');
    await page.screenshot({ path: join(SHOTS, 'whetstone-theme-system-light.png') });
    await page.emulateMedia({ colorScheme: 'dark' });
    check(await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark', null, { timeout: 3000 }).then(() => true, () => false) && await monacoIs('vs-dark'), 'and back to dark live');
    await page.screenshot({ path: join(SHOTS, 'whetstone-theme-system-dark.png') });
    await page.waitForTimeout(300);
    check(await saved() === 'system', 'System is saved as "system"');
    // Reload with a light OS: the inline script in index.html sets light before the app runs (no dark flash).
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('about:blank');
    await ctx.addInitScript(() => { new MutationObserver(() => {
      const el = document.documentElement;
      if (document.body && !(window as any).__firstTheme) (window as any).__firstTheme = el.dataset.theme;
    }).observe(document, { childList: true, subtree: true }); });
    await page.goto(`${BASE}#/p/${id}`);
    await page.waitForSelector(SOL, { timeout: 20000 });
    check(await page.evaluate(() => (window as any).__firstTheme) === 'light' && await page.inputValue(sel) === 'system', 'reload with a light OS paints light from the start');
    // An old save with theme "light" (and one with garbage) keeps working.
    for (const [raw, want] of [['light', 'light'], ['blue', 'dark']] as const) {
      const old = await browser.newContext({ colorScheme: 'light' });
      await old.addInitScript(`localStorage.setItem('practical:v2', ${JSON.stringify(JSON.stringify({ version: 2, theme: raw }))});`);
      const p2 = await old.newPage();
      await p2.goto(`${BASE}#/`);
      await p2.waitForSelector(sel);
      check(await p2.inputValue(sel) === want && await p2.evaluate(() => document.documentElement.dataset.theme) === want, `a saved theme "${raw}" opens as ${want}`);
      await old.close();
    }
    await ctx.close();
  }
  // The divider between types.ts and the solution: drag and arrow keys resize, Monaco relayouts, the size survives a reload.
  if (ids.includes('f1-debounce')) {
    const check = (ok: boolean, what: string) => (ok ? console.log(`  ✓ editor split: ${what}`) : fail(`editor split: ${what}`));
    const box = async (page: Page, sel: string) => (await page.locator(sel).boundingBox())!;
    const TC = '[data-testid="types-editor"]', SC = '[data-testid="solution-editor"]', DIV = '[data-testid="editor-splitter"]';
    const monacoW = (page: Page, col: string) => page.$eval(`${col} .monaco-editor`, (e) => (e as HTMLElement).getBoundingClientRect().width);
    const monacoH = (page: Page, col: string) => page.$eval(`${col} .monaco-editor`, (e) => (e as HTMLElement).getBoundingClientRect().height);
    const layout = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('practical:layout') ?? '{}'));
    async function drag(page: Page, dx: number, dy: number) {
      const d = await box(page, DIV);
      const [x, y] = [d.x + d.width / 2, d.y + d.height / 2];
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 4 });
      await page.mouse.move(x + dx, y + dy, { steps: 4 });
      await page.mouse.up();
      await page.waitForTimeout(300); // Monaco's automaticLayout catches up
    }

    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}#/p/f1-debounce`);
    await page.waitForSelector(TYPES, { timeout: 20000 });
    await page.waitForTimeout(300);
    const [t0, s0] = [await box(page, TC), await box(page, SC)];
    check(await page.getAttribute(DIV, 'aria-orientation') === 'vertical' && await page.getAttribute(DIV, 'role') === 'separator', 'a vertical separator sits between the editors');
    await page.screenshot({ path: join(SHOTS, 'whetstone-editor-split-0-default.png') });
    await drag(page, 150, 0);
    const [t1, s1] = [await box(page, TC), await box(page, SC)];
    check(Math.abs(t1.width - t0.width - 150) <= 3 && Math.abs(s0.width - s1.width - 150) <= 3, `dragging 150px right: types ${Math.round(t0.width)}→${Math.round(t1.width)}px, solution ${Math.round(s0.width)}→${Math.round(s1.width)}px`);
    check(Math.abs(await monacoW(page, TC) - t1.width) <= 3 && Math.abs(await monacoW(page, SC) - s1.width) <= 3, 'both Monaco editors relayout to their new widths');
    await page.screenshot({ path: join(SHOTS, 'whetstone-editor-split-1-dragged.png') });
    await page.focus(DIV);
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(100);
    const t2 = await box(page, TC);
    check(Math.abs(t1.width - t2.width - 16) <= 2, `ArrowLeft on the focused divider moves it 16px (${Math.round(t1.width)}→${Math.round(t2.width)}px)`);
    await drag(page, -2000, 0);
    check(Math.abs((await box(page, TC)).width - 160) <= 2, 'types.ts stops at its 160px minimum');
    await drag(page, 2000, 0);
    check(Math.abs((await box(page, SC)).width - 240) <= 2, 'the solution stops at its 240px minimum');
    await drag(page, -2000, 0);
    await drag(page, t2.width - 160, 0); // back to the keyboard-moved width
    const saved = (await layout(page)).typesW;
    await page.reload();
    await page.waitForSelector(TYPES, { timeout: 20000 });
    await page.waitForTimeout(300);
    const t3 = await box(page, TC);
    check(typeof saved === 'number' && Math.abs(t3.width - t2.width) <= 3, `the width survives a reload (${Math.round(t3.width)}px, saved fraction ${saved?.toFixed?.(3)})`);
    await ctx.close();

    // Narrow: stacked, the divider resizes heights and keeps its own fraction.
    const nctx = await browser.newContext({ viewport: { width: 760, height: 900 } });
    const narrow = await nctx.newPage();
    await narrow.goto(`${BASE}#/p/f1-debounce`);
    await narrow.waitForSelector(TYPES, { timeout: 20000 });
    await narrow.waitForTimeout(300);
    check(await narrow.getAttribute(DIV, 'aria-orientation') === 'horizontal', 'stacked: the divider is horizontal');
    const [nt0, ns0] = [await box(narrow, TC), await box(narrow, SC)];
    await drag(narrow, 0, 60);
    const [nt1, ns1] = [await box(narrow, TC), await box(narrow, SC)];
    check(Math.abs(nt1.height - nt0.height - 60) <= 3 && Math.abs(ns0.height - ns1.height - 60) <= 3, `stacked: dragging 60px down: types ${Math.round(nt0.height)}→${Math.round(nt1.height)}px tall, solution ${Math.round(ns0.height)}→${Math.round(ns1.height)}px`);
    check(Math.abs(await monacoH(narrow, TC) - (nt1.height - 25)) <= 30, 'stacked: Monaco relayouts to the new height');
    await narrow.focus(DIV);
    await narrow.keyboard.press('ArrowUp');
    await narrow.waitForTimeout(100);
    check(Math.abs(nt1.height - (await box(narrow, TC)).height - 16) <= 2, 'stacked: ArrowUp moves the divider 16px up');
    await narrow.screenshot({ path: join(SHOTS, 'whetstone-editor-split-2-stacked.png') });
    const nl = await layout(narrow);
    check(typeof nl.typesH === 'number' && Math.abs(nl.typesH - 0.4) > 0.01 && nl.typesW === 0.38, `stacked saves its own fraction (${nl.typesH?.toFixed?.(3)}); the side-by-side one stays at its default`);
    const nt2 = await box(narrow, TC);
    await narrow.reload();
    await narrow.waitForSelector(TYPES, { timeout: 20000 });
    await narrow.waitForTimeout(300);
    check(Math.abs((await box(narrow, TC)).height - nt2.height) <= 3, 'stacked: the height survives a reload');
    await nctx.close();
  }
  await browser.close();
  console.log(failed ? `browser verify FAILED: ${failed}` : `browser verify OK: ${ids.length} problems × ts/js (staged ones also per stage, plus the staged flow)`);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
