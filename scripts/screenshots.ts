/**
 * npm run screenshots  (run `npm run build` first)
 * Serves dist/ with `vite preview`, drives it with headless Chrome via playwright-core,
 * and writes PNGs to screenshots/. Also asserts that the reference solution passes in the
 * real browser worker, that an infinite loop is stopped by the watchdog, and that passing a stage unlocks the next one.
 */
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'screenshots');
mkdirSync(out, { recursive: true });
const PORT = 4789;
const BASE = `http://localhost:${PORT}/`;
const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';
const PROBLEM = process.argv[2] ?? 'e2-signals';

// Own process group, so stopping it also stops the vite child that npx starts (otherwise a stale preview keeps the port).
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'pipe', detached: true });
const stopServer = () => { try { process.kill(-server.pid!, 'SIGTERM'); } catch { /* already gone */ } };
process.on('exit', stopServer);

async function waitForServer() {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(BASE)).ok) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('vite preview did not start');
}

function seed(state: object) {
  return `if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('practical:v1', ${JSON.stringify(JSON.stringify(state))}); }`;
}
const baseState = (extra: object = {}) => ({ version: 1, theme: 'dark', themeChosen: true, lang: 'ts', code: {}, solved: {}, attempts: {}, revealed: {}, ...extra });

async function open(browser: Browser, hash: string, state: object, opts: { width?: number; height?: number } = {}): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: opts.width ?? 1440, height: opts.height ?? 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(seed(state));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));
  await page.goto(BASE + hash);
  return page;
}

async function waitEditor(page: Page) {
  await page.waitForSelector('.monaco-editor .view-lines', { timeout: 20000 });
  await page.waitForTimeout(1200); // let TS diagnostics and colorization settle
}

async function main() {
  await waitForServer();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const shots: string[] = [];
  const shot = async (page: Page, name: string) => { const p = join(out, name); await page.screenshot({ path: p }); shots.push(p); console.log('  saved', p); };

  // 1. List page with a bit of progress
  {
    const page = await open(browser, '#/', baseState({ solved: { 'b1-lru-ttl': { at: new Date().toISOString(), lang: 'ts' } }, attempts: { 'b1-lru-ttl': 2, 'a1-concurrency-limiter': 1 } }));
    await page.waitForSelector('[data-testid^="problem-"]');
    await shot(page, '01-list.png');
    await page.context().close();
  }

  // 2. Problem page with the starter code, then a failing run
  {
    const page = await open(browser, `#/p/${PROBLEM}`, baseState());
    await waitEditor(page);
    await shot(page, '02-problem.png');
    await page.click('[data-testid="run"]');
    await page.waitForFunction(() => !document.querySelector('[data-testid="run"]')?.hasAttribute('disabled'), null, { timeout: 30000 });
    await page.waitForTimeout(300);
    await shot(page, '03-problem-failing.png');
    await page.context().close();
  }

  // 3. Reference solution: all tests pass in the real worker
  const solution = readFileSync(join(root, 'src', 'problems', PROBLEM, 'solution.ts'), 'utf8');
  {
    const page = await open(browser, `#/p/${PROBLEM}`, baseState({ code: { [PROBLEM]: { ts: solution } } }));
    await waitEditor(page);
    await page.click('.monaco-editor .view-lines');
    await page.keyboard.press('Control+Enter');
    await page.waitForSelector('[data-testid="all-passed"]', { timeout: 30000 });
    await page.waitForSelector('[data-testid="solved-badge"]');
    console.log('  ✓ reference solution passes in browser:', await page.textContent('[data-testid="all-passed"]'));
    await page.click('role=tab[name=/Solution/]');
    await page.waitForTimeout(500);
    await shot(page, '04-solution-all-passing.png');
    await page.context().close();
  }

  // 4. Infinite loop gets stopped by the watchdog
  {
    const loop = `export function signal() { while (true) {} }\nexport const computed = () => {}, effect = () => {}, batch = () => {}, untracked = () => {};\n`;
    const page = await open(browser, `#/p/${PROBLEM}`, baseState({ code: { [PROBLEM]: { ts: loop } } }));
    await waitEditor(page);
    await page.click('[data-testid="run"]');
    try { await page.waitForSelector('.aborted', { timeout: 15000 }); } catch (e) { await shot(page, 'debug-loop.png'); throw e; }
    console.log('  ✓ infinite loop stopped:', (await page.textContent('.aborted'))?.slice(0, 80));
    await shot(page, '05-infinite-loop-timeout.png');
    await page.context().close();
  }

  // 5. Light mode + JS
  {
    const page = await open(browser, `#/p/b1-lru-ttl`, baseState({ theme: 'light', lang: 'js' }));
    await waitEditor(page);
    await shot(page, '06-light-js.png');
    await page.context().close();
  }

  // 6. A staged problem (F1): stage 1 passes and unlocks stage 2, then stage 2 runs stages 1 + 2
  {
    const s1 = readFileSync(join(root, 'src', 'problems', 'f1-debounce', 'stages', '1', 'solution.ts'), 'utf8');
    const page = await open(browser, '#/p/f1-debounce', baseState({ code: { 'f1-debounce': { ts: s1 } } }));
    await waitEditor(page);
    await page.click('[data-testid="run"]');
    await page.waitForSelector('[data-testid="stage-cleared"]', { timeout: 30000 });
    console.log('  ✓ stage 1 passes and offers stage 2:', await page.textContent('[data-testid="stage-cleared"]'));
    await page.waitForTimeout(700);
    await shot(page, '07-stage1-passed.png');
    await page.click('[data-testid="go-next-stage"]');
    await page.click('[data-testid="run"]');
    await page.waitForFunction(() => !document.querySelector('[data-testid="run"]')?.hasAttribute('disabled'), null, { timeout: 30000 });
    await page.waitForTimeout(300);
    await shot(page, '08-stage2.png');
    await page.context().close();
  }

  await browser.close();
  stopServer();
  console.log(`\n${shots.length} screenshots written to ${out}`);
}

main().catch((e) => { console.error(e); stopServer(); process.exit(1); });
