/**
 * npm run verify:analytics  (run `npm run build` first)
 * GoatCounter wiring, with no real hits: count.js is replaced by a stub that records calls (or by a pinned copy of the
 * real script with sendBeacon recorded), and every request to *.goatcounter.com is aborted.
 * - one page view per hash route change, with the right path, no double count on load
 * - each event fires exactly once per action (run, pass, solved, lang, solution-tab, feedback-click)
 * - the real count.js sends nothing on localhost, and does send the paths on a non-local host name
 * - a blocked script (adblocker) breaks nothing
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page, type BrowserContext } from 'playwright-core';

const PORT = 4792, BASE = `http://localhost:${PORT}/`, REMOTE = `http://whetstone.test:${PORT}/`;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const P = join(root, 'src/problems');
const REAL = readFileSync(join(root, 'scripts/lib/goatcounter-count.js'), 'utf8');
const STUB = `window.goatcounter = window.goatcounter || {}; window.goatcounter.count = function (v) { (window.__gc = window.__gc || []).push(v); };`;
// A plain static server (vite preview rejects unknown host names).
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: join(root, 'dist'), stdio: 'ignore', detached: true });
process.on('exit', () => { try { process.kill(-server.pid!, 'SIGTERM'); } catch {} });
let bad = 0; const check = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const read = (...p: string[]) => readFileSync(join(P, ...p), 'utf8');

(async () => {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 200)); }
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', headless: true, args: ['--host-resolver-rules=MAP whetstone.test 127.0.0.1'] });
  let gcHits = 0;
  async function open(hash: string, opts: { script?: 'stub' | 'real' | 'blocked'; slow?: boolean; state?: object; base?: string } = {}) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    if (opts.state) await ctx.addInitScript(`localStorage.setItem('practical:v2', ${JSON.stringify(JSON.stringify({ version: 2, theme: 'dark', ...opts.state }))})`);
    await ctx.addInitScript(`window.__beacons = []; navigator.sendBeacon = (u) => { window.__beacons.push(String(u)); return true; };`);
    await ctx.route(/goatcounter\.com/, (r) => { gcHits++; return r.abort(); });
    await ctx.route(/github\.com/, (r) => r.abort());
    await ctx.route(/gc\.zgo\.at\/count\.js/, async (r) => { if (opts.slow) await new Promise((ok) => setTimeout(ok, 1500)); return opts.script === 'blocked' ? r.abort('blockedbyclient')
      : r.fulfill({ contentType: 'application/javascript', body: opts.script === 'real' ? REAL : STUB }); });
    const page = await ctx.newPage();
    const errors: string[] = [];
    const logs: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => logs.push(m.text()));
    await page.goto(`${opts.base ?? BASE}${hash}`, { waitUntil: opts.slow ? 'domcontentloaded' : 'load' });
    await page.waitForSelector('.topbar');
    if (!opts.slow) await page.waitForTimeout(500);
    return { ctx, page, errors, logs };
  }
  const calls = (p: Page) => p.evaluate(() => ((window as any).__gc ?? []).map((v: any) => (v.event ? `E ${v.path}` : `V ${v.path}`)) as string[]);
  const since = async (p: Page, n: number) => (await calls(p)).slice(n);
  async function run(p: Page) {
    await p.click('[data-testid="run"]');
    await p.waitForFunction(() => !document.querySelector('[data-testid="run"]')?.hasAttribute('disabled'), null, { timeout: 60000 });
    await p.waitForTimeout(200);
  }
  const eq = (a: string[], e: string[]) => JSON.stringify(a) === JSON.stringify(e);
  const done = async (ctx: BrowserContext, errors: string[], label: string) => { check(errors.length === 0, `${label}: no page errors ${errors.join(' | ')}`); await ctx.close(); };

  // Page views.
  {
    const { ctx, page, errors } = await open('#/', { script: 'stub' });
    check(eq(await calls(page), ['V /']), `home counts once as / (${await calls(page)})`);
    await page.evaluate(() => { location.hash = '#/p/c4-event-emitter'; }); await page.waitForSelector('[data-testid="run"]'); await page.waitForTimeout(300);
    await page.evaluate(() => { location.hash = '#/?tag=Caching'; }); await page.waitForTimeout(300);
    await page.goBack(); await page.waitForTimeout(300);
    await page.evaluate(() => { location.hash = '#/p/f10-debounce-basic'; }); await page.waitForTimeout(500);
    check(eq(await calls(page), ['V /', 'V /p/c4-event-emitter', 'V /tag/Caching', 'V /p/c4-event-emitter', 'V /p/f1-debounce']),
      `one view per route change, alias resolved (${await calls(page)})`);
    const titles = await page.evaluate(() => (window as any).__gc.map((v: any) => v.title));
    check(titles[1] === titles[3] && /Whetstone$/.test(titles[1]) && titles[1] !== 'Whetstone', `problem views carry the problem title (${titles[1]})`);
    let n = (await calls(page)).length;
    await page.click('[data-testid="request-problem"]'); await page.waitForTimeout(300);
    check(eq(await since(page, n), ['E feedback-click']), `feedback click: one event (${await since(page, n)})`);
    await done(ctx, errors, 'page views');
  }
  // count.js arriving after the app: views made before it loaded are queued, then sent once each.
  {
    const { ctx, page, errors } = await open('#/', { script: 'stub', slow: true });
    await page.evaluate(() => { location.hash = '#/p/c4-event-emitter'; });
    check(eq(await calls(page), []), 'slow script: nothing counted before it loads');
    await page.waitForTimeout(1800);
    check(eq(await calls(page), ['V /', 'V /p/c4-event-emitter']), `slow script: queued views sent once each (${await calls(page)})`);
    await done(ctx, errors, 'slow script');
  }
  // A problem opened directly counts once.
  {
    const { ctx, page, errors } = await open('#/p/c4-event-emitter', { script: 'stub' });
    await page.waitForSelector('[data-testid="run"]');
    check(eq(await calls(page), ['V /p/c4-event-emitter']), `deep link counts once (${await calls(page)})`);
    let n = 1;
    await page.click('.tabs .tab:nth-child(2)'); await page.click('.tabs .tab:nth-child(2)'); await page.waitForTimeout(200);
    check(eq(await since(page, n), ['E solution-tab/c4-event-emitter']), `solution tab: one event for two clicks (${await since(page, n)})`);
    n = (await calls(page)).length;
    await page.click('.tabs .tab:nth-child(1)'); await page.click('.tabs .tab:nth-child(2)'); await page.waitForTimeout(200);
    check(eq(await since(page, n), ['E solution-tab/c4-event-emitter']), `solution tab reopened: one more (${await since(page, n)})`);
    n = (await calls(page)).length;
    await page.click('text=JavaScript'); await page.click('text=JavaScript'); await page.click('text=TypeScript'); await page.waitForTimeout(200);
    check(eq(await since(page, n), ['E lang/c4-event-emitter/js', 'E lang/c4-event-emitter/ts']), `lang: one event per change, none for a no-op click (${await since(page, n)})`);
    await done(ctx, errors, 'tabs and lang');
  }
  // Single-stage problem: run, solved once.
  {
    const id = 'a9-promise-all-settled';
    const { ctx, page, errors } = await open(`#/p/${id}`, { script: 'stub', state: { lang: 'ts', code: { [id]: { ts: read(id, 'solution.ts') } } } });
    await page.waitForSelector('[data-testid="run"]'); await page.waitForTimeout(800);
    let n = (await calls(page)).length;
    await run(page);
    check(eq(await since(page, n), [`E run/${id}`, `E solved/${id}`]), `single-stage solve: run + solved (${await since(page, n)})`);
    n = (await calls(page)).length;
    await run(page);
    check(eq(await since(page, n), [`E run/${id}`]), `re-run of a solved problem: run only (${await since(page, n)})`);
    const sent = await page.evaluate(() => (window as any).__gc as Record<string, unknown>[]);
    check(sent.every((v) => Object.keys(v).every((k) => ['path', 'title', 'event'].includes(k)) && String(v.path).length < 80 && !String(v.path).includes(' ')),
      `payloads carry only a path, a title and the event flag: no code or results (${JSON.stringify(sent)})`);
    await done(ctx, errors, 'single-stage');
  }
  // Staged problem: stage 1 pass, then a failing run.
  {
    const id = 'a3-timeouts';
    const { ctx, page, errors } = await open(`#/p/${id}`, { script: 'stub', state: { lang: 'ts', code: { [id]: { ts: read(id, 'stages', '1', 'solution.ts') } } } });
    await page.waitForSelector('[data-testid="run"]'); await page.waitForTimeout(800);
    let n = (await calls(page)).length;
    await run(page);
    check(eq(await since(page, n), [`E run/${id}/s1`, `E pass/${id}/s1`]), `stage 1 first pass (${await since(page, n)})`);
    n = (await calls(page)).length;
    await run(page);
    check(eq(await since(page, n), [`E run/${id}/s1`]), `stage 1 re-run: run only (${await since(page, n)})`);
    await done(ctx, errors, 'staged');
  }
  // Full mode: the rest of the stages pass at once, then solved.
  {
    const id = 'a3-timeouts';
    const { ctx, page, errors } = await open(`#/p/${id}`, { script: 'stub', state: { lang: 'ts', full: { [id]: true }, stage: { [id]: 1 },
      stagePassed: { [id]: ['2026-01-01T00:00:00.000Z', null, null, null] }, code: { [id]: { ts: read(id, 'solution.ts') } } } });
    await page.waitForSelector('[data-testid="run"]'); await page.waitForTimeout(800);
    const n = (await calls(page)).length;
    await run(page);
    check(eq(await since(page, n), [`E run/${id}/full`, `E pass/${id}/s2`, `E pass/${id}/s3`, `E pass/${id}/s4`, `E solved/${id}`]), `full mode solve (${await since(page, n)})`);
    await done(ctx, errors, 'full mode');
  }
  // The real count.js: silent on localhost.
  {
    const before = gcHits;
    const { ctx, page, errors, logs } = await open('#/p/c4-event-emitter', { script: 'real' });
    await page.waitForSelector('[data-testid="run"]'); await page.click('.tabs .tab:nth-child(2)'); await page.waitForTimeout(300);
    const beacons = await page.evaluate(() => (window as any).__beacons as string[]);
    check(beacons.length === 0 && gcHits === before && logs.some((l) => l.includes('localhost')), `real count.js on localhost sends nothing (${beacons.length} beacons, log: ${logs.find((l) => l.includes('counting'))})`);
    await done(ctx, errors, 'real script, localhost');
  }
  // The real count.js on a public-looking host name: the hash route becomes the path, events are flagged.
  {
    const { ctx, page, errors } = await open('#/p/c4-event-emitter', { script: 'real', base: REMOTE });
    await page.waitForSelector('[data-testid="run"]'); await page.click('.tabs .tab:nth-child(2)'); await page.waitForTimeout(300);
    const beacons = (await page.evaluate(() => (window as any).__beacons as string[])).map((u) => new URL(u));
    const got = beacons.map((u) => `${u.searchParams.get('e') === 'true' ? 'E' : 'V'} ${u.searchParams.get('p')}`);
    check(beacons.every((u) => u.origin === 'https://trywhetstonedev.goatcounter.com' && u.pathname === '/count'), `real script targets trywhetstonedev (${beacons[0]?.origin})`);
    check(eq(got, ['V /p/c4-event-emitter', 'E solution-tab/c4-event-emitter']), `real script on a public host sends the right paths (${got})`);
    await done(ctx, errors, 'real script, public host');
  }
  // Blocked by an adblocker: nothing breaks, runs still work.
  {
    const id = 'a9-promise-all-settled';
    const { ctx, page, errors } = await open(`#/p/${id}`, { script: 'blocked', state: { lang: 'ts', code: { [id]: { ts: read(id, 'solution.ts') } } } });
    await page.waitForSelector('[data-testid="run"]'); await page.waitForTimeout(800);
    await page.click('.tabs .tab:nth-child(2)'); await page.click('text=JavaScript'); await page.click('text=TypeScript');
    await run(page);
    check(!!(await page.$('[data-testid="all-passed"]')), 'blocked script: the run still works');
    await page.evaluate(() => { location.hash = '#/'; }); await page.waitForSelector('.topbar'); await page.waitForTimeout(300);
    check(await page.evaluate(() => typeof (window as any).goatcounter === 'undefined'), 'blocked script: window.goatcounter stays undefined');
    await done(ctx, errors, 'blocked script');
  }
  check(gcHits === 0, `no request ever reached goatcounter.com (${gcHits})`);
  await b.close();
  console.log(bad ? `\n${bad} failed` : '\nall analytics checks pass');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
