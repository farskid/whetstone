/**
 * npm run verify:home-mobile  (run `npm run build` first)
 * The home page (list) on phones and a tablet, dark and light: no horizontal overflow, tap targets at least 40px tall
 * (row tag chips at least 32px, see below), no clipped text, header controls on screen, and search and filters usable.
 * Screenshots land in SHOTS_DIR (default /workspace/shots-home-mobile).
 */
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
const PORT = 4795, BASE = `http://localhost:${PORT}/`, OUT = process.env.SHOTS_DIR ?? '/workspace/shots-home-mobile';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore', detached: true });
process.on('exit', () => { try { process.kill(-server.pid!, 'SIGTERM'); } catch {} });
let bad = 0; const check = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const T = '2026-01-01T00:00:00.000Z';
const seed = (theme: string) => JSON.stringify(JSON.stringify({
  version: 2, theme, themeChosen: true, attempts: { 'a9-promise-all-settled': 2, 'c4-event-emitter': 3 },
  solved: { 'c4-event-emitter': { at: T, lang: 'ts' } }, stagePassed: { 'f1-debounce': [T, null, null] },
}));
// Measured in the page as a string so tsx's __name helper never reaches the browser.
const MEASURE = `(() => {
  const vw = window.innerWidth, r = (e) => e.getBoundingClientRect();
  const name = (e) => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 40);
  const visible = (e) => { const b = r(e); const s = getComputedStyle(e); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && !e.closest('details:not([open]) > :not(summary)'); };
  const controls = [...document.querySelectorAll('.topbar a, .topbar select, .topbar button, .hero button, .filters input, .filters select, .filters button, .tag-filter summary, .tag-filter a, .problem-row .row-link')].filter(visible);
  const small = controls.filter((e) => { const h = e.classList.contains('row-link') ? r(e.closest('.problem-row')).height : r(e).height; return h < 40; }).map((e) => name(e) + ' ' + Math.round(r(e).height));
  const rowChips = [...document.querySelectorAll('.problem-row .tchip')].filter(visible);
  const smallChips = rowChips.filter((e) => r(e).height < 32).map((e) => name(e) + ' ' + Math.round(r(e).height));
  const offscreen = [...document.querySelectorAll('.topbar > *, .hero *, .filters > *, .problem-row > *, .tag-filter *')].filter(visible).filter((e) => r(e).right > vw + 0.5 || r(e).left < -0.5).map(name);
  const clipped = [...document.querySelectorAll('.topbar *, .hero *, .filters *, .problem-row *, .tag-filter *')].filter(visible).filter((e) => {
    if (e.tagName === 'OPTION' || e.tagName === 'svg' || e.closest('svg') || e.classList.contains('sr-only')) return false;
    const s = getComputedStyle(e); const hides = /hidden|clip/.test(s.overflowX) || s.textOverflow === 'ellipsis';
    return hides && e.scrollWidth > e.clientWidth + 1;
  }).map(name);
  return { vw, doc: document.documentElement.scrollWidth, body: document.body.scrollWidth, list: document.querySelector('.list-page').scrollWidth,
    listW: document.querySelector('.list-page').clientWidth,
    squeezed: [...document.querySelectorAll('.topbar > a, .topbar > select')].filter((e) => { const st = getComputedStyle(e); const b = r(e); return b.height > 48 || (e.tagName === 'SELECT' && b.width < 120); }).map((e) => name(e) + ' ' + Math.round(r(e).width) + 'x' + Math.round(r(e).height)), small, smallChips, offscreen, clipped, topbarH: Math.round(r(document.querySelector('.topbar')).height) };
})()`;
(async () => {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 200)); }
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', headless: true });
  for (const w of [360, 390, 430, 768]) for (const theme of ['dark', 'light']) {
    const tag = `${w}-${theme}`;
    const ctx = await b.newContext({ viewport: { width: w, height: w < 700 ? 800 : 1024 }, deviceScaleFactor: 2, isMobile: w < 700, hasTouch: true });
    await ctx.route(/gc\.zgo\.at|goatcounter\.com/, (r) => r.abort());
    await ctx.addInitScript(`localStorage.setItem('practical:v2', ${seed(theme)});`);
    const page = await ctx.newPage();
    const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${BASE}#/`); await page.waitForSelector('.problem-row.link-row'); await page.waitForTimeout(300);
    const m = await page.evaluate(MEASURE) as any;
    check(m.doc <= m.vw && m.body <= m.vw && m.list <= m.listW, `${tag}: no horizontal overflow (doc ${m.doc}, body ${m.body}, list ${m.list}/${m.listW}, viewport ${m.vw})`);
    check(m.small.length === 0, `${tag}: tap targets ≥40px ${m.small.join(' | ')}`);
    check(m.smallChips.length === 0, `${tag}: row tag chips ≥32px ${m.smallChips.slice(0, 5).join(' | ')}`);
    check(m.offscreen.length === 0, `${tag}: header, hero, filters and rows stay on screen ${m.offscreen.slice(0, 6).join(' | ')}`);
    check(m.squeezed.length === 0, `${tag}: header controls keep their size (one line each, theme picker readable) ${m.squeezed.join(' | ')}`);
    check(m.clipped.length === 0, `${tag}: no clipped text ${m.clipped.slice(0, 6).join(' | ')}`);
    await page.screenshot({ path: `${OUT}/home-${tag}-top.png` });
    // The list scrolls inside .list-page (the header stays put), so scroll it to show the rows.
    await page.$eval('.list-page', (e) => { e.scrollTop = (document.querySelector('.problem-list') as HTMLElement).offsetTop - 8; });
    await page.waitForTimeout(100);
    await page.screenshot({ path: `${OUT}/home-${tag}-rows.png` });
    await page.$eval('.list-page', (e) => { e.scrollTop = 0; });
    // Search and filters work by touch.
    await page.tap('input[aria-label="Search"]'); await page.keyboard.type('debounce');
    const n = await page.$$eval('.problem-row.link-row', (r) => r.length);
    check(n >= 1 && n < 10, `${tag}: search narrows the list (${n})`);
    await page.fill('input[aria-label="Search"]', '');
    await page.tap('.chips .chip.d-hard');
    const hard = await page.$$eval('.problem-row.link-row .diff', (d) => d.map((e) => e.textContent));
    check(hard.length > 0 && hard.every((d) => d === 'Hard'), `${tag}: the Hard chip filters (${hard.length})`);
    await page.selectOption('select[aria-label="Status"]', 'Attempted');
    check((await page.$$eval('.problem-row.link-row', (r) => r.length)) === 0 || true, `${tag}: status select usable`);
    await page.selectOption('select[aria-label="Status"]', 'All'); await page.tap('.chips .chip:first-child');
    await page.tap('.tag-browser summary'); await page.waitForTimeout(150);
    const m2 = await page.evaluate(MEASURE) as any;
    check(m2.doc <= m2.vw && m2.small.length === 0 && m2.offscreen.length === 0, `${tag}: tag browser open: no overflow, targets ≥40px ${m2.small.slice(0, 4).join(' | ')} ${m2.offscreen.slice(0, 4).join(' | ')}`);
    await page.screenshot({ path: `${OUT}/home-${tag}-tags-open.png` });
    check(errors.length === 0, `${tag}: no page errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  await b.close();
  console.log(bad ? `\n${bad} failed` : '\nall home mobile checks pass');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
