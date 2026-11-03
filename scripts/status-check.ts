/**
 * npm run verify:status  (run `npm run build` first)
 * The list's Attempted status: derived from saved progress (a run, or a passed stage, without solving), distinct from
 * Solved and Not started by shape and label (not only colour), filterable and counted, in light and dark. A real run of
 * failing code turns a fresh problem Attempted; solving it turns it Solved.
 */
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright-core';
const PORT = 4794, BASE = `http://localhost:${PORT}/`, OUT = process.env.SHOTS_DIR ?? '/workspace/shots-status';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore', detached: true });
process.on('exit', () => { try { process.kill(-server.pid!, 'SIGTERM'); } catch {} });
let bad = 0; const check = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const T = '2026-01-01T00:00:00.000Z';
// a9: run, failed (attempted). a3: stage 1 passed (attempted). c4: solved. b1: code edited, never run (not started).
// d2: a v1-style save with a solved flag only. f1: one stage passed and no attempts counter (old save): attempted.
const saved = {
  version: 2, lang: 'ts',
  attempts: { 'a9-promise-all-settled': 3, 'a3-timeouts': 2, 'c4-event-emitter': 5 },
  code: { 'b1-lru-ttl': { ts: 'export {}' }, 'a9-promise-all-settled': { ts: 'export {}' } },
  solved: { 'c4-event-emitter': { at: T, lang: 'ts' }, 'd2-semver': { at: T, lang: 'ts' } },
  stagePassed: { 'a3-timeouts': [T, null, null, null], 'f1-debounce': [T, null, null] },
  stage: { 'a3-timeouts': 1, 'f1-debounce': 1 },
};
(async () => {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 200)); }
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', headless: true });
  const status = (p: Page, id: string) => p.$eval(`[data-testid="status-${id}"]`, (e) => ({
    row: e.closest('.problem-row')!.getAttribute('data-status'), label: e.getAttribute('aria-label'), role: e.getAttribute('role'),
    badge: !!e.closest('.problem-row')!.querySelector('.attempted-badge'), bg: getComputedStyle(e).backgroundImage, lock: !!e.querySelector('.crack-lock'),
  }));
  for (const scheme of ['light', 'dark'] as const) {
    const ctx = await b.newContext({ colorScheme: scheme, viewport: { width: 1280, height: 900 } });
    await ctx.route(/gc\.zgo\.at|goatcounter\.com/, (r) => r.abort());
    await ctx.addInitScript(`if (!sessionStorage.seeded) { sessionStorage.seeded = 1; localStorage.setItem('practical:v2', ${JSON.stringify(JSON.stringify(saved))}); }`);
    const page = await ctx.newPage();
    const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${BASE}#/`); await page.waitForSelector('[data-testid="status-a9-promise-all-settled"]');
    check(await page.evaluate(() => document.documentElement.dataset.theme) === scheme, `${scheme}: System default shows ${scheme}`);
    const want: Record<string, string> = { 'a9-promise-all-settled': 'attempted', 'a3-timeouts': 'attempted', 'f1-debounce': 'attempted', 'c4-event-emitter': 'solved', 'd2-semver': 'solved', 'b1-lru-ttl': 'none', 'e2-signals': 'none' };
    for (const [id, w] of Object.entries(want)) {
      const s = await status(page, id);
      const shapeOk = w === 'attempted' ? s.badge && s.bg.includes('conic-gradient') && !s.lock && /^Attempted/.test(s.label ?? '')
        : w === 'solved' ? !s.badge && s.lock && /^Solved/.test(s.label ?? '') : !s.badge && !s.lock && s.bg === 'none' && s.label === 'Not started';
      check(s.row === w && s.role === 'img' && shapeOk, `${scheme}: ${id} is ${w} (${JSON.stringify(s)})`);
    }
    const counted = await page.textContent('[data-testid="attempted-count"]');
    check(counted?.includes('3 attempted') ?? false, `${scheme}: the progress card says "3 attempted" (${counted})`);
    const opts = await page.$$eval('select[aria-label="Status"] option', (os) => os.map((o) => o.textContent));
    const total = await page.$$eval('.problem-row.link-row', (r) => r.length);
    check(JSON.stringify(opts) === JSON.stringify(['Any status', 'Solved (2)', 'Attempted (3)', `Unsolved (${total - 2})`, `Not started (${total - 5})`]), `${scheme}: status options with counts (${opts})`);
    await page.selectOption('select[aria-label="Status"]', 'Attempted');
    const shown = await page.$$eval('.problem-row.link-row', (r) => r.map((e) => e.getAttribute('data-status')));
    check(shown.length === 3 && shown.every((s) => s === 'attempted'), `${scheme}: the Attempted filter shows the 3 attempted rows (${shown})`);
    // Badge text contrast against the page (WCAG AA for small text).
    // A string, so tsx doesn't inject its __name helper into the browser code.
    const contrast = await page.evaluate(`(() => {
      const e = document.querySelector('.attempted-badge');
      const rgb = (c) => { const cv = document.createElement('canvas').getContext('2d'); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const fg = lum(rgb(getComputedStyle(e).color)), bg = lum(rgb(getComputedStyle(document.body).backgroundColor));
      return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
    })()`) as number;
    check(contrast >= 4.5, `${scheme}: the "Attempted" label has ${contrast.toFixed(2)}:1 contrast`);
    await page.screenshot({ path: `${OUT}/status-${scheme}-attempted-filter.png` });
    await page.selectOption('select[aria-label="Status"]', 'NotStarted');
    const ns = await page.$$eval('.problem-row.link-row', (r) => r.map((e) => e.getAttribute('data-status')));
    check(ns.length === total - 5 && ns.every((s) => s === 'none'), `${scheme}: Not started shows only untouched rows (${ns.length})`);
    await page.selectOption('select[aria-label="Status"]', 'All');
    await page.screenshot({ path: `${OUT}/status-${scheme}-all.png` });
    check(errors.length === 0, `${scheme}: no page errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // A real run: failing code makes a fresh problem Attempted.
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.route(/gc\.zgo\.at|goatcounter\.com/, (r) => r.abort());
    const page = await ctx.newPage();
    await page.goto(`${BASE}#/`); await page.waitForSelector('[data-testid="status-e2-signals"]');
    check((await status(page, 'e2-signals')).row === 'none', 'fresh: e2 not started');
    await page.click('[data-testid="problem-e2-signals"]'); await page.waitForSelector('[data-testid="run"]'); await page.waitForTimeout(800);
    await page.click('[data-testid="run"]');
    await page.waitForFunction(() => !document.querySelector('[data-testid="run"]')?.hasAttribute('disabled'), null, { timeout: 60000 });
    await page.goto(`${BASE}#/`); await page.waitForSelector('[data-testid="status-e2-signals"]');
    check((await status(page, 'e2-signals')).row === 'attempted', 'after running the starter: e2 is attempted');
    await page.reload(); await page.waitForSelector('[data-testid="status-e2-signals"]');
    check((await status(page, 'e2-signals')).row === 'attempted', 'and still attempted after a reload');
    await ctx.close();
  }
  await b.close();
  console.log(bad ? `\n${bad} failed` : '\nall status checks pass');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
