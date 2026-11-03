import type { Argv, OptionSpec, CommandSpec, CliSpec, CliResult, Cli } from './types';

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

const aliases = (o: OptionSpec) => (o.alias === undefined ? [] : Array.isArray(o.alias) ? o.alias : [o.alias]);

export function createCli(spec: CliSpec): Cli {
  function merged(path: CommandSpec[]): Record<string, OptionSpec> {
    return Object.assign({}, ...path.map((c) => c.options ?? {}));
  }

  function parse(argv: string[]): CliResult {
    const command: string[] = [];
    const chain: CommandSpec[] = [spec];
    const options: Record<string, unknown> = {};
    const positionals: string[] = [];
    const errors: string[] = [];
    let schema = merged(chain);
    const lookup = (name: string): string | null => {
      if (name in schema) return name;
      for (const [k, o] of Object.entries(schema)) if (aliases(o).includes(name)) return k;
      return null;
    };
    const unknown = (flag: string) => {
      errors.push(`Unknown option: ${flag}`);
    };
    const assign = (key: string, raw: string | boolean) => {
      const o = schema[key];
      let v: unknown = raw;
      if (o.type === 'number') {
        if (typeof raw !== 'string' || !NUMBER.test(raw)) { errors.push(`Invalid number for --${key}: ${raw}`); return; }
        v = Number(raw);
      } else if (o.type === 'boolean' && typeof raw === 'string') {
        if (raw !== 'true' && raw !== 'false') { errors.push(`Invalid boolean for --${key}: ${raw}`); return; }
        v = raw === 'true';
      }
      if (o.type === 'array') options[key] = [...((options[key] as unknown[]) ?? []), v];
      else options[key] = v;
    };
    const takeValue = (key: string, i: number, inline: string | undefined): number => {
      const o = schema[key];
      if (inline !== undefined) { assign(key, inline); return i; }
      if (o.type === 'boolean') { assign(key, true); return i; }
      const next = argv[i + 1];
      if (next === undefined || next === '--' || isFlag(next)) { errors.push(`Missing value for --${key}`); return i; }
      assign(key, next);
      return i + 1;
    };

    for (let i = 0; i < argv.length; i++) {
      const tok = argv[i];
      if (tok === '--') { positionals.push(...argv.slice(i + 1)); break; }
      if (!isFlag(tok)) {
        const cur = chain[chain.length - 1];
        if (cur.commands && positionals.length === 0) {
          if (Object.prototype.hasOwnProperty.call(cur.commands, tok)) {
            chain.push(cur.commands[tok]);
            command.push(tok);
            schema = merged(chain);
          } else {
            errors.push(`Unknown command: ${tok}`);
            positionals.push(tok);
          }
        } else positionals.push(tok);
        continue;
      }
      const eq = tok.indexOf('=');
      const inline = eq >= 0 ? tok.slice(eq + 1) : undefined;
      if (tok.startsWith('--')) {
        const name = eq >= 0 ? tok.slice(2, eq) : tok.slice(2);
        const key = lookup(name);
        if (key) { i = takeValue(key, i, inline); continue; }
        const neg = name.startsWith('no-') && inline === undefined ? lookup(name.slice(3)) : null;
        if (neg && schema[neg].type === 'boolean') { options[neg] = false; continue; }
        unknown(eq >= 0 ? tok.slice(0, eq) : tok);
        continue;
      }
      const letters = (eq >= 0 ? tok.slice(1, eq) : tok.slice(1)).split('');
      letters.forEach((l, idx) => {
        const key = lookup(l);
        if (!key) { unknown(`-${l}`); return; }
        if (idx < letters.length - 1) {
          if (schema[key].type === 'boolean') assign(key, true);
          else errors.push(`Missing value for --${key}`);
          return;
        }
        i = takeValue(key, i, inline);
      });
    }
    for (const [k, o] of Object.entries(schema)) {
      if (k in options) continue;
      if (o.default !== undefined) options[k] = o.default;
      else if (o.required) errors.push(`Missing required option: --${k}`);
    }
    return { command, options, _: positionals, errors };
  }

  return { parse };
}
