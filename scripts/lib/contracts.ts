/**
 * Node side of the stage contracts (src/runner/contract.ts) and the named-types rule, for scripts/verify.ts.
 * Everything goes through the project's own `tsc` CLI in a temp tree, in two batch runs: a declaration emit of every
 * stage's reference (and starters) to read the public signatures, and a --noEmit check of every contract case.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TSC = join(repo, 'node_modules', '.bin', 'tsc');

export interface TscDiagnostic { file: string; line: number; message: string }

/** Type-checks a tree of files (relative path -> text) like the editor does; `declarations` also emits .d.ts files. */
export function tsc(files: Record<string, string>, declarations = false): { diagnostics: TscDiagnostic[]; dts: Record<string, string> } {
  const dir = mkdtempSync(join(tmpdir(), 'whetstone-tsc-'));
  try {
    for (const [rel, text] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, 'src', rel)), { recursive: true });
      writeFileSync(join(dir, 'src', rel), text);
    }
    const usercode = JSON.parse(readFileSync(join(repo, 'tsconfig.usercode.json'), 'utf8')).compilerOptions;
    const compilerOptions = declarations
      ? { ...usercode, noEmit: false, declaration: true, emitDeclarationOnly: true, stripInternal: true, outDir: 'dts', rootDir: 'src' }
      : usercode;
    writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions, include: ['src/**/*.ts'] }));
    let out = '';
    try { out = execFileSync(TSC, ['-p', dir, '--pretty', 'false'], { encoding: 'utf8', maxBuffer: 64 << 20 }); }
    catch (e) { out = String((e as { stdout?: string }).stdout ?? ''); }
    const diagnostics: TscDiagnostic[] = [];
    for (const l of out.split('\n')) {
      const m = /^(?:.*?[\\/])?src[\\/](.+?)\((\d+),\d+\): error (TS\d+: .*)$/.exec(l);
      if (m) diagnostics.push({ file: m[1].replace(/\\/g, '/'), line: +m[2], message: m[3] });
      else if (/^\s+\S/.test(l) && diagnostics.length) diagnostics[diagnostics.length - 1].message += `\n${l.trim()}`;
    }
    const dts: Record<string, string> = {};
    const walk = (d: string, rel: string) => {
      if (!existsSync(d)) return;
      for (const f of readdirSync(d, { withFileTypes: true })) {
        if (f.isDirectory()) walk(join(d, f.name), `${rel}${f.name}/`);
        else dts[`${rel}${f.name}`] = readFileSync(join(d, f.name), 'utf8');
      }
    };
    if (declarations) walk(join(dir, 'dts'), '');
    return { diagnostics, dts };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Public members of an emitted .d.ts, keyed `Name`, `Name#head` (a class or interface's own line) and `Name.member`
// (overloads get a trailing '), each mapped to its normalized text. Private and protected members are left out.

export function dtsMembers(src: string): Map<string, string> {
  const lines = src.split('\n').filter((l) => l.trim() && !/^\s*(\/\/|\/\*\*|\*|\*\/)/.test(l) && !/^import /.test(l) && l.trim() !== 'export {};');
  const out = new Map<string, string>();
  const put = (key: string, text: string) => { while (out.has(key)) key += "'"; out.set(key, text); return key; };
  let i = 0;
  while (i < lines.length) {
    const head = lines[i++];
    const block = [head];
    while (i < lines.length && /^\s/.test(lines[i])) block.push(lines[i++]);
    if (i < lines.length && /^[}\]]/.test(lines[i])) block.push(lines[i++]);
    const m = /^(?:export )?(?:declare )?(?:abstract )?(function|class|interface|type|const|let|enum|namespace)\s+([\w$]+)/.exec(head);
    if (!m) continue;
    const name = m[2];
    if ((m[1] === 'class' || m[1] === 'interface') && head.trimEnd().endsWith('{')) {
      out.set(`${name}#head`, head.trim());
      let last: string | null = null;
      for (const l of block.slice(1, -1)) {
        if (/^ {4}[^\s})\]]/.test(l)) {
          const t = l.trim();
          if (/^(private|protected)\b|^#/.test(t)) { last = null; continue; }
          const mk = /^(?:public |static |readonly |get |set |abstract |async )*(\[[^\]]+\]|[\w$]+|\(|new|<)/.exec(t);
          last = put(`${name}.${mk ? mk[1] : t}`, t);
        } else if (last) out.set(last, `${out.get(last)} ${l.trim()}`);
      }
    } else put(name, block.map((l) => l.trim()).join(' '));
  }
  return out;
}

/** Keys whose signature changed or went away between two stages' members (new members don't count: tests force them). */
export function changedKeys(before: Map<string, string>, after: Map<string, string>): string[] {
  return [...before.keys()].filter((k) => after.get(k) !== before.get(k));
}

/** Whether a contract key speaks for a member key: the same name, or a member, head or overload of it. */
export const covers = (contractKey: string, key: string) =>
  key === contractKey || key.startsWith(`${contractKey}.`) || key.startsWith(`${contractKey}#`) || key.startsWith(`${contractKey}'`);

// ---------------------------------------------------------------------------------------------------------------
// Signatures and the named-types rule.

/** Splits on a separator at bracket depth 0 (ignores `=>`'s `>`). */
export function splitTop(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = '', quote: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) { cur += c; if (c === quote) quote = null; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; cur += c; continue; }
    if ('([{<'.includes(c)) depth++;
    else if (')]}>'.includes(c) && !(c === '>' && s[i - 1] === '=')) depth--;
    if (depth === 0 && s.startsWith(sep, i)) { out.push(cur); cur = ''; i += sep.length - 1; continue; }
    cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}
function closeOf(s: string, i: number) {
  let depth = 0, quote: string | null = null;
  for (; i < s.length; i++) {
    const c = s[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === "'" || c === '"') { quote = c; continue; }
    if ('([{<'.includes(c)) depth++;
    else if (')]}>'.includes(c) && !(c === '>' && s[i - 1] === '=')) { depth--; if (depth === 0) return i + 1; }
  }
  return s.length;
}
export interface Sig { typeParams: string[]; params: { name: string; type: string }[]; ret: string }
/** `name<T>(a: X, b?: Y): R` (anything before the first `<` or `(` is ignored). */
export function parseSig(sig: string): Sig | null {
  let i = sig.search(/[<(]/);
  if (i < 0) return null;
  let typeParams: string[] = [];
  if (sig[i] === '<') {
    const e = closeOf(sig, i);
    typeParams = splitTop(sig.slice(i + 1, e - 1), ',').map((t) => t.split(/\s/)[0]);
    i = e;
  }
  if (sig[i] !== '(') return null;
  const e = closeOf(sig, i);
  const params = splitTop(sig.slice(i + 1, e - 1), ',').map((p) => {
    const [n, ...t] = splitTop(p, ':');
    return { name: n.replace(/^\.\.\.|\?$/g, ''), type: t.join(':').trim() };
  });
  const rest = sig.slice(e).trim();
  return { typeParams, params, ret: rest.startsWith(':') ? rest.slice(1).replace(/;\s*$/, '').trim() : '' };
}

const BUILTINS = new Set(('Promise PromiseLike Iterable AsyncIterable Iterator AsyncIterator IterableIterator Array ReadonlyArray Record ' +
  'Partial Readonly Required Pick Omit Exclude Extract NonNullable ReturnType Parameters Awaited Map Set WeakMap ReadonlyMap ReadonlySet ' +
  'Date RegExp Error AbortSignal AbortController Symbol Function Object Uint8Array ArrayBuffer Generator AsyncGenerator Response Request ' +
  'Headers URL URLSearchParams Event EventTarget HTMLElement Element Node String Number Boolean BigInt InstanceType ThisType').split(' '));

/**
 * What's wrong with a parameter or result type, if anything. Inline object types and function types nested in other
 * types should be named in types.ts; so should any name the solution declares itself. A plain callback whose own
 * parameters and result are simple (`(item: T) => R | Promise<R>`, `() => void`) is fine inline, as are primitives,
 * literals, type parameters, built-ins and the solution's own classes.
 */
export function typeIssues(type: string, allowed: Set<string>): string[] {
  const issues: string[] = [];
  let t = type.replace(/'[^']*'|"[^"]*"/g, "''").trim();
  if (/^(?:<[^>]*>\s*)?\(/.test(t) && /=>/.test(t)) {
    const cb = parseSig(`f${t.replace(/\)\s*=>/, '): ')}`);
    if (cb) {
      const parts = [...cb.params.map((p) => p.type), cb.ret];
      if (parts.every((x) => !/=>|\{/.test(x))) t = parts.join(' | ');
    }
  }
  if (/=>/.test(t)) issues.push('an inline function type');
  if (/\{/.test(t)) issues.push('an inline object type');
  for (const id of t.match(/\b[A-Z][\w$]*/g) ?? []) if (!BUILTINS.has(id) && !allowed.has(id)) issues.push(`\`${id}\`, which types.ts doesn't export`);
  return [...new Set(issues)];
}

/** Named-type problems in one stage's emitted solution against the names its types file exports. */
export function namedTypeIssues(solutionDts: string, typesDts: string): string[] {
  const sol = dtsMembers(solutionDts);
  const typeNames = new Set([...dtsMembers(typesDts).keys()].map((k) => k.split(/[.#']/)[0]));
  const classes = [...sol.entries()].filter(([k, t]) => k.endsWith('#head') && /\bclass\b/.test(t)).map(([k]) => k.slice(0, -5));
  const classParams = new Map(classes.map((c) => {
    const head = sol.get(`${c}#head`)!;
    const at = head.indexOf('<', head.indexOf(` ${c}`) + c.length + 1);
    const own = at === head.indexOf(` ${c}<`) + c.length + 1 ? head.slice(at + 1, closeOf(head, at) - 1) : '';
    return [c, splitTop(own, ',').map((x) => x.split(/\s/)[0])];
  }));
  const out: string[] = [];
  for (const [key, text] of sol) {
    let sig: string | null = null;
    if (/^export declare function /.test(text)) sig = text.replace(/^export declare function [\w$]+/, 'f');
    else if (classes.includes(key.split('.')[0]) && key.includes('.') && /^(static )?([\w$]+|constructor)\s*[<(]/.test(text)) sig = text.replace(/^static /, '');
    else if (/^export declare const [\w$]+: (<[^>]*>\s*)?\(/.test(text)) sig = text.replace(/^export declare const [\w$]+: /, 'f').replace(/\)\s*=>/, '): ');
    const p = sig && parseSig(sig);
    if (!p) continue;
    const allowed = new Set([...typeNames, ...classes, ...p.typeParams, ...(classParams.get(key.split('.')[0]) ?? [])]);
    const name = key.replace(/'+$/, '');
    for (const prm of p.params) {
      const is = typeIssues(prm.type, allowed);
      if (is.length) out.push(`\`${name}\` parameter \`${prm.name}: ${prm.type}\` uses ${is.join(' and ')}`);
    }
    if (p.ret && !/^constructor/.test(text)) {
      const is = typeIssues(p.ret, allowed);
      if (is.length) out.push(`\`${name}\` returns \`${p.ret.length > 90 ? `${p.ret.slice(0, 90)}…` : p.ret}\`, which uses ${is.join(' and ')}`);
    }
  }
  return [...new Set(out)];
}
