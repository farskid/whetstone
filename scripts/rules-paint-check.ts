/**
 * npx tsx scripts/rules-paint-check.ts
 * Rendering check for painted rules: runs F1's stage-1 reference on stage 3 (in a vite dev server) and checks that
 * stage 1's linked rules are green, stage 3's are red, the rest neutral, and each rule's tooltip lists its tests. Then
 * Reset must return the rules, test list and summary to neutral while keeping saved progress. Last, a first pass of A4
 * stage 3 must move straight on to stage 4 (fresh tests, a "passed" notice), while re-passing or passing the last
 * stage stays put.
 * Screenshots (dark and light) go to SHOTS_DIR (default /workspace) as whetstone-rules-*.png.
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4811;
const BASE = `http://localhost:${PORT}/`;
const SHOTS = process.env.SHOTS_DIR ?? '/workspace';
const id = 'f1-debounce';
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'pipe', detached: true });
process.on('exit', () => { try { process.kill(-server.pid!, 'SIGTERM'); } catch { /* gone */ } });

let failed = 0;
const check = (ok: boolean, msg: string) => { if (!ok) failed++; console.log(`  ${ok ? '✓' : '✗'} ${msg}`); };

async function main() {
  for (let i = 0; i < 150; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* not up */ } await new Promise((r) => setTimeout(r, 200)); }
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', headless: true });
  const s1 = readFileSync(join(root, 'src/problems', id, 'stages/1/solution.ts'), 'utf8');
  for (const theme of ['dark', 'light'] as const) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const state = { version: 2, theme, lang: 'ts', code: { [id]: { ts: s1 } }, stage: { [id]: 2 }, stagePassed: { [id]: ['2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', null] } };
    await ctx.addInitScript(`localStorage.setItem('practical:v2', ${JSON.stringify(JSON.stringify(state))});`);
    const page = await ctx.newPage();
    await page.goto(`${BASE}#/p/${id}`);
    await page.waitForSelector('[data-testid="run"]', { timeout: 30000 });
    const before = await page.$$eval('.rule', (els) => els.map((e) => e.getAttribute('data-rule-status')));
    check(before.length === 11 && before.every((s) => s === 'idle'), `${theme}: before a run, all ${before.length} rules are neutral`);
    await page.click('[data-testid="run"]');
    await page.waitForFunction(() => !document.querySelector('[data-testid="run"]')?.hasAttribute('disabled'), null, { timeout: 60000 });
    const rules = await page.$$eval('.rule', (els) => els.map((e) => ({
      status: e.getAttribute('data-rule-status'), title: e.getAttribute('title') ?? '',
      color: getComputedStyle(e).color, icon: e.querySelector('.rule-icon')?.textContent ?? '',
    })));
    const counts = rules.reduce<Record<string, number>>((m, r) => ({ ...m, [r.status!]: (m[r.status!] ?? 0) + 1 }), {});
    console.log(`  ${theme}: ${JSON.stringify(counts)}`);
    check((counts.pass ?? 0) >= 4 && (counts.fail ?? 0) >= 2, `${theme}: stage-1 code on stage 3 paints some rules green and some red`);
    check(rules.every((r) => /^Tests?: \S/.test(r.title)), `${theme}: every rule's tooltip lists its tests`);
    check(rules.filter((r) => r.status === 'pass').every((r) => r.icon === '✓') && rules.filter((r) => r.status === 'fail').every((r) => r.icon === '✗'), `${theme}: icons match status`);
    const pass = rules.find((r) => r.status === 'pass'); const fail = rules.find((r) => r.status === 'fail');
    check(!!pass && !!fail && pass.color !== fail.color, `${theme}: pass ${pass?.color} vs fail ${fail?.color}`);
    const cancel = rules.find((r) => r.title.includes('cancel() drops the scheduled call'));
    check(cancel?.status === 'fail', `${theme}: the cancel() rule is red (stage-1 code has no cancel)`);
    const burst = rules.find((r) => r.title.includes('a burst of calls fires once'));
    check(burst?.status === 'pass', `${theme}: the burst rule is green`);
    await page.screenshot({ path: join(SHOTS, `whetstone-rules-${theme}.png`), fullPage: true });

    // Reset (to the starter here: no stage snapshot is seeded) forgets the run but keeps saved progress.
    const saved = () => page.evaluate(() => { const s = JSON.parse(localStorage.getItem('practical:v2') ?? '{}'); return JSON.stringify([s.stagePassed, s.attempts, s.stage]); });
    // Saves are debounced: wait for the run's submission to land before taking the "before" snapshot.
    await page.waitForFunction((id) => JSON.parse(localStorage.getItem('practical:v2') ?? '{}').attempts?.[id] === 1, id, { timeout: 5000 });
    const progressBefore = await saved();
    const openBefore = await page.$$eval('.test-list [aria-expanded="true"]', (els) => els.length);
    page.once('dialog', (d) => d.accept());
    await page.click('[data-testid="reset"]');
    await page.waitForFunction(() => [...document.querySelectorAll('.rule')].every((e) => e.getAttribute('data-rule-status') === 'idle'), null, { timeout: 5000 }).catch(() => {});
    const after = await page.$$eval('.rule', (els) => els.map((e) => ({ status: e.getAttribute('data-rule-status'), icon: getComputedStyle(e.querySelector('.rule-icon') ?? e).display, title: e.getAttribute('title') ?? '' })));
    check(after.length === rules.length && after.every((r) => r.status === 'idle'), `${theme}: after Reset all ${after.length} rules are neutral again`);
    check(after.every((r) => r.icon === 'none') && after.every((r) => /^Tests?: \S/.test(r.title)), `${theme}: after Reset no ✓/✗ icons show, tooltips still list the tests`);
    const tests = await page.$$eval('.test-list li.test', (els) => els.map((e) => e.getAttribute('data-status')));
    check(tests.length > 0 && tests.every((t) => t === 'idle'), `${theme}: after Reset the test list is back to idle (${tests.length} tests)`);
    const head = (await page.textContent('.results-headline')) ?? '';
    check(/Run them/.test(head) && !(await page.$('.compile-error, .aborted, .module-logs')), `${theme}: after Reset the summary is gone ("${head.trim()}")`);
    check(openBefore > 0 && (await page.$$eval('.test-list [aria-expanded="true"]', (els) => els.length)) === 0, `${theme}: after Reset no failure details stay open (was ${openBefore})`);
    await page.waitForTimeout(1500); // let Reset's own (debounced) save land
    check((await saved()) === progressBefore, `${theme}: after Reset passed stages, submissions and the current stage are kept (${progressBefore} → ${await saved()})`);
    await ctx.close();
  }

  // A first pass of a stage moves straight on: A4 with the stage-3 reference on stage 3 lands on stage 4, fresh.
  {
    const a4 = 'a4-singleflight';
    const s3 = readFileSync(join(root, 'src/problems', a4, 'stages/3/solution.ts'), 'utf8');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const state = { version: 2, theme: 'dark', lang: 'ts', code: { [a4]: { ts: s3 } }, stage: { [a4]: 2 }, stagePassed: { [a4]: ['2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', null, null] } };
    await ctx.addInitScript(`if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('practical:v2', ${JSON.stringify(JSON.stringify(state))}); }`);
    const page = await ctx.newPage();
    await page.goto(`${BASE}#/p/${a4}`);
    await page.waitForSelector('[data-testid="run"]', { timeout: 30000 });
    check((await page.textContent('.stage-label'))?.trim() === 'Stage 3 of 4', 'a4: opens on "Stage 3 of 4"');
    await page.click('[data-testid="run"]');
    const notice = await page.waitForSelector('[data-testid="stage-unlocked"]', { timeout: 60000 }).catch(() => null);
    const text = (await notice?.textContent()) ?? '';
    check(/Stage 3 passed 🎉 — now on stage 4/.test(text), `a4: notice "${text.trim()}"`);
    check((await page.textContent('.stage-label'))?.trim() === 'Stage 4 of 4', 'a4: label says "Stage 4 of 4"');
    const tab = (k: number) => page.getAttribute(`[data-testid="stage-tab-${k}"]`, 'class').then((c) => c ?? '');
    check(/\bon\b/.test(await tab(4)) && !/\bon\b/.test(await tab(3)), 'a4: the stage-4 pill is on');
    check(/\bdone\b/.test(await tab(3)) && ((await page.textContent('[data-testid="stage-tab-3"]')) ?? '').includes('✓'), 'a4: the stage-3 pill is done with ✓');
    const tests = await page.$$eval('.test-list li.test', (els) => els.map((e) => e.getAttribute('data-status')));
    check(tests.length === 17 && tests.every((t) => t === 'idle'), `a4: the stage-4 list shows ${tests.length} tests, all not run yet`);
    check(await page.$$eval('.rule', (els) => els.length > 0 && els.every((e) => e.getAttribute('data-rule-status') === 'idle')), 'a4: stage 4 starts with neutral rules');
    const code = await page.evaluate((id) => JSON.parse(localStorage.getItem('practical:v2') ?? '{}').code?.[id]?.ts, a4);
    check(code === s3, 'a4: the passing code carried over');
    await page.screenshot({ path: join(SHOTS, 'whetstone-stage-advance.png') });
    // The next run dismisses the notice; the stage-3 code doesn't pass stage 4, so it stays on stage 4.
    await page.click('[data-testid="run"]');
    await page.waitForFunction(() => !document.querySelector('[data-testid="run"]')?.hasAttribute('disabled'), null, { timeout: 60000 });
    check(!(await page.$('[data-testid="stage-unlocked"]')), 'a4: the next run dismisses the notice');
    // Re-passing stage 3 stays on stage 3.
    await page.click('[data-testid="stage-tab-3"]');
    await page.click('[data-testid="run"]');
    await page.waitForFunction(() => !document.querySelector('[data-testid="run"]')?.hasAttribute('disabled'), null, { timeout: 60000 });
    check((await page.textContent('.stage-label'))?.trim() === 'Stage 3 of 4' && !!(await page.$('[data-testid="all-passed"]')) && !(await page.$('[data-testid="stage-unlocked"]')), 'a4: re-passing stage 3 stays on stage 3 with its results');
    await ctx.close();
  }
  // Passing the last stage stays on it.
  {
    const a4 = 'a4-singleflight';
    const ref = readFileSync(join(root, 'src/problems', a4, 'solution.ts'), 'utf8');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const passed = Array.from({ length: 3 }, () => '2026-01-01T00:00:00.000Z').concat([null as unknown as string]);
    const state = { version: 2, theme: 'dark', lang: 'ts', code: { [a4]: { ts: ref } }, stage: { [a4]: 3 }, stagePassed: { [a4]: passed } };
    await ctx.addInitScript(`localStorage.setItem('practical:v2', ${JSON.stringify(JSON.stringify(state))});`);
    const page = await ctx.newPage();
    await page.goto(`${BASE}#/p/${a4}`);
    await page.waitForSelector('[data-testid="run"]', { timeout: 30000 });
    await page.click('[data-testid="run"]');
    await page.waitForFunction(() => !document.querySelector('[data-testid="run"]')?.hasAttribute('disabled'), null, { timeout: 60000 });
    check((await page.textContent('.stage-label'))?.trim() === 'Stage 4 of 4' && !!(await page.$('[data-testid="all-passed"]')) && !(await page.$('[data-testid="stage-unlocked"]')), 'a4: passing the last stage stays on it with its results');
    await ctx.close();
  }

  await browser.close();
  console.log(failed ? `rules paint check FAILED: ${failed}` : 'rules paint check OK');
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
