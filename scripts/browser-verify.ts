/**
 * npm run verify:browser  (run `npm run build` first)
 * Pass problem ids to check only those. Runs every problem's reference solution (TS, and stripped-to-JS) through the real
 * in-browser worker of the built site and checks that all tests pass (staged problems in "full problem" mode). Staged
 * problems also run each stage's reference on that stage, and one staged flow is clicked through: pass stage 1 in the
 * editor, see stage 2 unlock, continue to it with the code carried over while the read-only types.ts beside it swaps to
 * stage 2's (typing into it does nothing), then pass stage 2. Code saved with its own copies of the types gets the
 * "Import from types.ts" offer, and a narrow window stacks the two editors. Screenshots go to SHOTS_DIR
 * (default /workspace) as whetstone-two-editors-*.png. Any request that 404s (a worker, chunk or asset
 * resolved outside the base) fails the run too.
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
    check(!!(await page.waitForSelector('[data-testid="stage-unlocked"]', { timeout: 5000 }).catch(() => null)), 'stage 2 unlocked banner');
    await page.screenshot({ path: join(SHOTS, 'whetstone-two-editors-1-stage1-passed.png') });
    await page.click('[data-testid="next-stage"]');
    check(await page.getAttribute('[data-testid="stage-tab-2"]', 'aria-selected') === 'true', 'stage 2 tab selected');
    check(!(await page.isDisabled('[data-testid="stage-tab-2"]')), 'stage 2 tab enabled');
    check(await page.isDisabled('[data-testid="stage-tab-3"]'), 'stage 3 still locked');
    check((await page.textContent('[data-testid="stage-tab-1"]'))?.includes('✓') ?? false, 'stage 1 tab shows ✓');
    check((await page.textContent('.stage-label'))?.trim() === 'Stage 2 of 3', 'label reads "Stage 2 of 3"');
    // The stage swaps types.ts (stage 2 adds leading/trailing to DebounceOptions) and leaves the solution alone.
    await page.waitForTimeout(400); // the store saves 150 ms after a change
    check(sameText(await editorLines(page, TYPES), t2), 'types.ts now shows stage 2\'s types');
    check(!!(await page.$('[data-testid="types-updated"]')), 'types.ts is marked "updated"');
    const added = await page.$$('[data-testid="types-editor"] .types-new-line');
    check(added.length === 2, `the 2 lines stage 2 added are highlighted (${added.length})`);
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
    await page.screenshot({ path: join(SHOTS, 'whetstone-two-editors-3-stage2-passed.png') });
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
    await old.page.screenshot({ path: join(SHOTS, 'whetstone-two-editors-4-legacy-offer.png') });
    await old.page.click('[data-testid="use-types-file"]');
    await old.page.waitForTimeout(400);
    const adopted = await old.page.evaluate((id) => JSON.parse(localStorage.getItem('practical:v2') ?? '{}').code?.[id]?.ts as string, flowId);
    check(!(await old.page.$('[data-testid="own-types"]')), 'the offer goes away after importing');
    check(adopted.startsWith(`import type { ${t1Names.join(', ')} } from './types';`) && !/^export interface/m.test(adopted), 'the saved code imports the types instead of declaring them');
    check(await runAndCheck('flow: legacy code after importing types.ts', old.page, old.bad), 'it still passes after importing');
    await old.page.click(SOL);
    await old.page.keyboard.press('ControlOrMeta+Z');
    check(!!(await old.page.waitForSelector('[data-testid="own-types"]', { timeout: 3000 }).catch(() => null)), 'Ctrl/⌘+Z brings the old declarations (and the offer) back');
    await old.ctx.close();

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
  await browser.close();
  console.log(failed ? `browser verify FAILED: ${failed}` : `browser verify OK: ${ids.length} problems × ts/js (staged ones also per stage, plus the staged flow)`);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
