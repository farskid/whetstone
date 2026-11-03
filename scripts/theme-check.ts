/**
 * npm run verify:theme  (run `npm run build` first)
 * System is the default: a first visit follows the OS (light and dark) from the first paint, follows it live when the OS
 * changes, and a picked theme is kept (also when the OS changes, and across reloads). Old saves: "light" stays, a
 * "dark" without themeChosen (the old default) opens as System.
 */
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright-core';
const PORT = 4793, BASE = `http://localhost:${PORT}/`;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore', detached: true });
process.on('exit', () => { try { process.kill(-server.pid!, 'SIGTERM'); } catch {} });
let bad = 0; const check = (c: boolean, m: string) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const SEL = '[data-testid="theme-select"]';
(async () => {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 200)); }
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', headless: true });
  async function open(scheme: 'light' | 'dark', saved?: object) {
    const ctx = await b.newContext({ colorScheme: scheme });
    await ctx.route(/gc\.zgo\.at|goatcounter\.com/, (r) => r.abort());
    if (saved) await ctx.addInitScript(`if (!sessionStorage.seeded) { sessionStorage.seeded = 1; localStorage.setItem('practical:v2', ${JSON.stringify(JSON.stringify(saved))}); }`);
    // Every theme the page shows from the moment <body> exists: one value means no flash.
    // (A string, not a function: tsx would wrap named functions in a __name helper the page doesn't have.)
    await ctx.addInitScript(`(() => {
      const seen = (window.__themes = []);
      const note = () => { const t = document.documentElement.dataset.theme || ''; if (document.body && seen[seen.length - 1] !== t) seen.push(t); };
      new MutationObserver(note).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-theme'] });
    })()`);
    const page = await ctx.newPage();
    const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${BASE}#/`); await page.waitForSelector(SEL); await page.waitForTimeout(300);
    return { ctx, page, errors };
  }
  const shown = (p: Page) => p.evaluate(() => document.documentElement.dataset.theme);
  const painted = (p: Page) => p.evaluate(() => (window as any).__themes as string[]);
  const waitTheme = (p: Page, t: string) => p.waitForFunction((t) => document.documentElement.dataset.theme === t, t, { timeout: 3000 }).then(() => true, () => false);
  const savedPref = (p: Page) => p.evaluate(() => { const s = JSON.parse(localStorage.getItem('practical:v2') ?? '{}'); return `${s.theme}/${!!s.themeChosen}`; });

  for (const scheme of ['light', 'dark'] as const) {
    const { ctx, page, errors } = await open(scheme);
    check(await page.inputValue(SEL) === 'system' && await shown(page) === scheme, `first visit, ${scheme} OS: System selected, shows ${scheme} (${await page.inputValue(SEL)}, ${await shown(page)})`);
    check(JSON.stringify(await painted(page)) === JSON.stringify([scheme]), `first visit, ${scheme} OS: no flash (${await painted(page)})`);
    check(await page.$eval(SEL, (e) => (e as HTMLSelectElement).options[0].value) === 'system', 'System is the first option');
    const other = scheme === 'light' ? 'dark' : 'light';
    await page.emulateMedia({ colorScheme: other });
    check(await waitTheme(page, other), `OS switches to ${other} while open: follows live`);
    check(((await page.textContent(`${SEL} option[value="system"]`)) ?? '').includes(other), 'the System option names what it resolved to');
    await page.emulateMedia({ colorScheme: scheme });
    check(await waitTheme(page, scheme), `and back to ${scheme}`);
    // Pick the opposite explicitly: kept when the OS changes and across a reload.
    await page.selectOption(SEL, other); await page.waitForTimeout(400);
    await page.emulateMedia({ colorScheme: other === 'light' ? 'dark' : 'light' }); await page.waitForTimeout(300);
    check(await shown(page) === other, `picked ${other}: the OS change is ignored`);
    check(await savedPref(page) === `${other}/true`, `picked ${other} is saved with themeChosen (${await savedPref(page)})`);
    await page.reload(); await page.waitForSelector(SEL); await page.waitForTimeout(300);
    check(await page.inputValue(SEL) === other && JSON.stringify(await painted(page)) === JSON.stringify([other]), `reload keeps the picked ${other}, no flash (${await painted(page)})`);
    check(errors.length === 0, `no page errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  // Saved choices from earlier visits.
  for (const [saved, scheme, wantSel, wantShown] of [
    [{ version: 2, theme: 'light' }, 'dark', 'light', 'light'],
    [{ version: 2, theme: 'dark', themeChosen: true }, 'light', 'dark', 'dark'],
    [{ version: 2, theme: 'system' }, 'light', 'system', 'light'],
    [{ version: 2, theme: 'dark' }, 'light', 'system', 'light'],
    [{ version: 1, theme: 'light' }, 'dark', 'light', 'light'],
  ] as const) {
    const { ctx, page, errors } = await open(scheme, saved);
    const ok = await page.inputValue(SEL) === wantSel && await shown(page) === wantShown && JSON.stringify(await painted(page)) === JSON.stringify([wantShown]);
    check(ok && errors.length === 0, `saved ${JSON.stringify(saved)} with a ${scheme} OS: ${wantSel} (${wantShown}), no flash (${await page.inputValue(SEL)}, ${await painted(page)})`);
    await ctx.close();
  }
  await b.close();
  console.log(bad ? `\n${bad} failed` : '\nall theme checks pass');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
