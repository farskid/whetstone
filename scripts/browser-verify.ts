/**
 * npm run verify:browser  (run `npm run build` first)
 * Pass problem ids to check only those. Runs every problem's reference solution (TS, and stripped-to-JS) through the real
 * in-browser worker of the built site and checks that all tests pass.
 */
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { transform } from 'sucrase';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4790;
const BASE = `http://localhost:${PORT}/`;
const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';
const problemsDir = join(root, 'src', 'problems');
const only = process.argv.slice(2);
const ids = readdirSync(problemsDir).filter((d) => existsSync(join(problemsDir, d, 'solution.ts')) && (only.length === 0 || only.includes(d)));

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'pipe' });
process.on('exit', () => { try { server.kill('SIGTERM'); } catch { /* gone */ } });

async function main() {
  for (let i = 0; i < 100; i++) {
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
      await page.goto(`${BASE}#/p/${id}`);
      await page.waitForSelector('.monaco-editor .view-lines', { timeout: 20000 });
      await page.click('[data-testid="run"]');
      await page.waitForFunction(() => !document.querySelector('[data-testid="run"]')?.hasAttribute('disabled'), null, { timeout: 60000 });
      const passed = await page.$('[data-testid="all-passed"]');
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
