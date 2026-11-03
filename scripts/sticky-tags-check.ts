/**
 * npm run verify:tags  (run `npm run build` first)
 * The description's tag row docks in the tab bar once it scrolls away: hidden at the top, shown (and aria-hidden, as a
 * duplicate) when scrolled past, "+N" when the pane is too narrow, back at the top after clicking "+N", shown and readable
 * on the Solution tab, reset on a new problem. Desktop and 390px wide, dark and light. Screenshots go to SHOTS_DIR
 * (default /workspace/shots-tags).
 */
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
const PORT = 4791, BASE = `http://localhost:${PORT}/`, OUT = process.env.SHOTS_DIR ?? '/workspace/shots-tags';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'pipe', detached: true });
process.on('exit', () => { try { process.kill(-server.pid!, 'SIGTERM'); } catch {} });
let bad = 0; const check = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
(async () => {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 200)); }
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', headless: true });
  async function open(id: string, w: number, h: number, theme: string) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript(`localStorage.setItem('practical:v2', ${JSON.stringify(JSON.stringify({ version: 2, theme, themeChosen: true }))})`);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => { console.log('pageerror', e.message); bad++; });
    await p.goto(`${BASE}#/p/${id}`); await p.waitForSelector('.pb-tags'); await p.waitForTimeout(600);
    return { p, ctx };
  }
  const state = (p: any) => p.$eval('[data-testid=tab-tags]', (e: HTMLElement) => ({ on: e.classList.contains('on'), fit: e.dataset.fit, aria: e.getAttribute('aria-hidden'),
    chips: [...e.querySelectorAll('.tab-tags-row:not(.tab-tags-measure) > *')].map((c) => c.textContent), more: e.querySelector('[data-testid=tab-tags-more]')?.getAttribute('title') ?? null,
    overflow: e.scrollWidth > e.clientWidth + 1, tabsTop: [...document.querySelectorAll('.tabs .tab')].map((t) => Math.round(t.getBoundingClientRect().top)), rowH: Math.round(document.querySelector('.tabs')!.getBoundingClientRect().height) }));
  const scroll = async (p: any, y: number) => { await p.$eval('.left-body', (e: HTMLElement, y: number) => { e.scrollTop = y; }, y); await p.waitForTimeout(400); };
  for (const [label, w, h] of [['desktop', 1440, 900], ['mobile', 390, 844]] as const) {
    for (const [id, theme] of [['c4-event-emitter', 'dark'], ['h6-offline-queue', 'dark'], ['c4-event-emitter', 'light']] as const) {
      const { p, ctx } = await open(id, w, h, theme);
      const name = `${label}-${id}-${theme}`;
      await scroll(p, 0); const s0 = await state(p);
      check(!s0.on, `${name}: top, tab bar empty (${JSON.stringify(s0)})`);
      await p.screenshot({ path: `${OUT}/${name}-1-top.png` });
      await scroll(p, 400);
      const s1 = await state(p);
      check(s1.on && s1.aria === 'true' && s1.rowH === s0.rowH, `${name}: scrolled, docked (${JSON.stringify(s1)})`);
      await p.screenshot({ path: `${OUT}/${name}-2-scrolled.png` });
      if (label === 'desktop' && id === 'h6-offline-queue') {
        // Narrow the statement pane to force "+N".
        const sp = await p.$('[aria-label="Resize statement and editor"]');
        const bb = (await sp!.boundingBox())!;
        await p.mouse.move(bb.x + bb.width / 2, bb.y + 100); await p.mouse.down(); await p.mouse.move(470, bb.y + 100, { steps: 8 }); await p.mouse.up();
        await p.waitForTimeout(400);
        const s2 = await state(p);
        check(s2.on && !!s2.more && s2.chips.length >= 2, `${name}: narrow pane shows +N (${JSON.stringify(s2)})`);
        await p.screenshot({ path: `${OUT}/${name}-3-plusN.png` });
        await p.click('[data-testid=tab-tags-more]'); await p.waitForTimeout(900);
        const s3 = await state(p);
        check(!s3.on, `${name}: +N scrolls back to the description tags (${JSON.stringify(s3)})`);
      }
      await p.click('.tabs .tab:nth-child(2)'); await p.waitForTimeout(400);
      const s4 = await state(p);
      check(s4.on && s4.aria === null, `${name}: Solution tab keeps tags in tab bar, readable (${JSON.stringify(s4)})`);
      await p.screenshot({ path: `${OUT}/${name}-4-solution.png` });
      await p.click('.tabs .tab:nth-child(1)'); await p.waitForTimeout(400);
      const s5 = await state(p);
      console.log(`  back on Description: ${JSON.stringify(s5)}`);
      // Problem change resets.
      await p.evaluate(() => { location.hash = '#/p/e6-query-cache'; }); await p.waitForTimeout(800);
      const s6 = await state(p);
      check(!s6.on, `${name}: new problem resets to undocked`);
      await ctx.close();
    }
  }
  await b.close(); console.log(bad ? `${bad} FAILED` : 'ALL OK'); process.exit(bad ? 1 : 0);
})();
