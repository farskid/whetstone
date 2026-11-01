// Bug: repeated flags overwrite instead of collecting
export type Argv = Record<string, unknown> & { _: string[] };

const NUMBER = /^-?\d+(\.\d+)?$/;
const isFlag = (t: string | undefined) => t !== undefined && t.length > 1 && t[0] === '-' && !NUMBER.test(t);
const coerce = (v: string): string | number => (NUMBER.test(v) ? Number(v) : v);

export function parseArgs(argv: string[]): Argv {
  const out: Argv = { _: [] };
  const set = (k: string, v: unknown) => {
    if (true) out[k] = v;
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

export interface OptionSpec {
  type: 'string' | 'number' | 'boolean' | 'array';
  alias?: string | string[];
  default?: unknown;
  required?: boolean;
  description?: string;
}
export interface CommandSpec {
  description?: string;
  options?: Record<string, OptionSpec>;
  commands?: Record<string, CommandSpec>;
}
export interface CliSpec extends CommandSpec {
  name: string;
}
export interface CliResult {
  command: string[];
  options: Record<string, unknown>;
  _: string[];
  errors: string[];
}

export function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

function suggest(word: string, candidates: string[]): string | null {
  let best: string | null = null;
  let bestD = 3;
  for (const c of candidates) {
    const d = distance(word, c);
    if (d < bestD) { best = c; bestD = d; }
  }
  return best;
}

const aliases = (o: OptionSpec) => (o.alias === undefined ? [] : Array.isArray(o.alias) ? o.alias : [o.alias]);
const dashed = (n: string) => (n.length === 1 ? `-${n}` : `--${n}`);

export function createCli(spec: CliSpec) {
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
      if (!flag.startsWith('--')) return errors.push(`Unknown option: ${flag}`);
      const names = Object.entries(schema).flatMap(([k, o]) => [k, ...aliases(o)]).filter((n) => n.length > 1);
      const s = suggest(flag.slice(2), names);
      errors.push(`Unknown option: ${flag}${s ? `. Did you mean --${s}?` : ''}`);
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
            const s = suggest(tok, Object.keys(cur.commands));
            errors.push(`Unknown command: ${tok}${s ? `. Did you mean ${s}?` : ''}`);
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

  function help(path: string[] = []): string {
    const chain: CommandSpec[] = [spec];
    for (const p of path) {
      const next = chain[chain.length - 1].commands?.[p];
      if (!next || !Object.prototype.hasOwnProperty.call(chain[chain.length - 1].commands, p)) throw new Error(`Unknown command: ${p}`);
      chain.push(next);
    }
    const cmd = chain[chain.length - 1];
    const lines = [`Usage: ${[spec.name, ...path].join(' ')}${cmd.commands ? ' <command>' : ''} [options]`];
    if (cmd.description) lines.push('', cmd.description);
    if (cmd.commands) {
      lines.push('', 'Commands:');
      for (const [n, c] of Object.entries(cmd.commands)) lines.push(`  ${n}${c.description ? `  ${c.description}` : ''}`);
    }
    const opts = Object.entries(merged(chain));
    if (opts.length) {
      lines.push('', 'Options:');
      for (const [n, o] of opts) {
        const flags = [...aliases(o).map(dashed), dashed(n)].join(', ');
        const type = o.type === 'boolean' ? '' : o.type === 'array' ? ' <string...>' : ` <${o.type}>`;
        let line = `  ${flags}${type}`;
        if (o.description) line += `  ${o.description}`;
        if (o.default !== undefined) line += ` (default: ${JSON.stringify(o.default)})`;
        if (o.required) line += ' (required)';
        lines.push(line);
      }
    }
    return lines.join('\n');
  }

  return { parse, help };
}
