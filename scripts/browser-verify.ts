/**
 * npm run verify:browser  (run `npm run build` first)
 * Pass problem ids to check only those. Runs every problem's reference solution (TS, and stripped-to-JS) through the real
 * in-browser worker of the built site and checks that all tests pass. Any request that 404s (a worker, chunk or asset
 * resolved outside the base) fails the run too.
 * VERIFY_BASE=/whetstone/ serves dist/ under that base, to check a build made with BASE_PATH=/whetstone/.
 */
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { transform } from 'sucrase';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4790;
const BASE_PATH = process.env.VERIFY_BASE ?? '/';
const BASE = `http://localhost:${PORT}${BASE_PATH}`;
const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';
const problemsDir = join(root, 'src', 'problems');
const only = process.argv.slice(2);
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
  for (const id of ids) {
    const ts = readFileSync(join(problemsDir, id, 'solution.ts'), 'utf8');
    const js = transform(ts, { transforms: ['typescript'], disableESTransforms: true }).code;
    for (const [lang, code] of [['ts', ts], ['js', js]] as const) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const state = { version: 1, theme: 'dark', lang, code: { [id]: { [lang]: code } }, solved: {}, attempts: {}, revealed: {} };
      await ctx.addInitScript(`localStorage.setItem('practical:v1', ${JSON.stringify(JSON.stringify(state))});`);
      const page = await ctx.newPage();
      const bad: string[] = [];
      page.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
      page.on('requestfailed', (r) => bad.push(`failed ${r.url()}`));
      await page.goto(`${BASE}#/p/${id}`);
      await page.waitForSelector('.monaco-editor .view-lines', { timeout: 20000 });
      await page.click('[data-testid="run"]');
      await page.waitForFunction(() => !document.querySelector('[data-testid="run"]')?.hasAttribute('disabled'), null, { timeout: 60000 });
      const passed = await page.$('[data-testid="all-passed"]');
      if (bad.length) { failed++; console.log(`  ✗ ${id} [${lang}] bad requests:\n    ${bad.join('\n    ')}`); }
      if (passed) console.log(`  ✓ ${id} [${lang}] ${await passed.textContent()}`);
      else { failed++; console.log(`  ✗ ${id} [${lang}] ${(await page.textContent('.results, main'))?.slice(0, Number(process.env.VERIFY_DETAIL ?? 300))}`); }
      await ctx.close();
    }
  }
  await browser.close();
  console.log(failed ? `browser verify FAILED: ${failed}` : `browser verify OK: ${ids.length} problems × ts/js`);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
