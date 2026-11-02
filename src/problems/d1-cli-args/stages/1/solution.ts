import type { Argv } from './types';

const NUMBER = /^-?\d+(\.\d+)?$/;
const isFlag = (t: string | undefined) => t !== undefined && t.length > 1 && t[0] === '-' && !NUMBER.test(t);
const coerce = (v: string): string | number => (NUMBER.test(v) ? Number(v) : v);

export function parseArgs(argv: string[]): Argv {
  const out: Argv = { _: [] };
  const set = (k: string, v: unknown) => {
    if (!(k in out)) out[k] = v;
    else if (Array.isArray(out[k])) (out[k] as unknown[]).push(v);
    else out[k] = [out[k], v];
  };
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (tok === '--') { out._.push(...argv.slice(i + 1)); break; }
    if (!isFlag(tok)) { out._.push(tok); continue; }
    const eq = tok.indexOf('=');
    if (tok.startsWith('--')) {
      if (eq >= 0) { set(tok.slice(2, eq), coerce(tok.slice(eq + 1))); continue; }
      const key = tok.slice(2);
      if (key.startsWith('no-')) { set(key.slice(3), false); continue; }
      if (argv[i + 1] !== undefined && argv[i + 1] !== '--' && !isFlag(argv[i + 1])) set(key, coerce(argv[++i]));
      else set(key, true);
      continue;
    }
    const letters = (eq >= 0 ? tok.slice(1, eq) : tok.slice(1)).split('');
    const last = letters.pop()!;
    for (const l of letters) set(l, true);
    if (eq >= 0) set(last, coerce(tok.slice(eq + 1)));
    else if (letters.length === 0 && argv[i + 1] !== undefined && argv[i + 1] !== '--' && !isFlag(argv[i + 1])) set(last, coerce(argv[++i]));
    else set(last, true);
  }
  return out;
}
