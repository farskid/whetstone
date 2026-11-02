/**
 * npx tsx scripts/rules-paint-check.ts
 * Rendering check for painted rules: runs F1's stage-1 reference on stage 3 (in a vite dev server) and checks that
 * stage 1's linked rules are green, stage 3's are red, the rest neutral, and each rule's tooltip lists its tests.
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
    await ctx.close();
  }
  await browser.close();
  console.log(failed ? `rules paint check FAILED: ${failed}` : 'rules paint check OK');
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
