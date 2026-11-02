// Staged problems keep their public types in a separate, read-only types.ts that each stage replaces.
// The user's solution imports them with `import type { … } from './types'`. These helpers find, move and adopt
// top-level type declarations by scanning text (no TypeScript parser in the bundle). Shared by the UI and scripts.

/** How solution files refer to the types file. */
export const TYPES_SPECIFIER = './types';

/** Matches an import or re-export of the types file (`'./types'`, `'./types.ts'`, `'./types.js'`). */
export const TYPES_IMPORT_RE = /(\bfrom\s*|\bimport\s*\(?\s*)(['"])\.\/types(?:\.ts|\.js)?\2/g;

export interface TypeDecl {
  name: string;
  exported: boolean;
  /** Offsets into the source: [start, end) covers leading comments, the declaration and its line break. */
  start: number;
  end: number;
}

const DECL_RE = /^(export\s+)?(?:declare\s+)?(interface|type)\s+([A-Za-z_$][\w$]*)/;

/** Skips a string, template or comment starting at i; returns the index after it, or i if there is none. */
function skipTrivia(src: string, i: number): number {
  const c = src[i];
  if (c === '/' && src[i + 1] === '/') { const e = src.indexOf('\n', i); return e < 0 ? src.length : e; }
  if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); return e < 0 ? src.length : e + 2; }
  if (c === '"' || c === "'" || c === '`') {
    let j = i + 1;
    while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1;
    return j + 1;
  }
  return i;
}

/** End offset (exclusive, after the line break) of the declaration that starts at `from`. */
function declEnd(src: string, from: number, kind: 'interface' | 'type'): number {
  let depth = 0;
  let sawBody = false;
  let i = from;
  while (i < src.length) {
    const skipped = skipTrivia(src, i);
    if (skipped !== i) { i = skipped; continue; }
    const c = src[i];
    if (c === '{' || c === '(' || c === '[') { depth++; if (c === '{') sawBody = true; }
    else if (c === '}' || c === ')' || c === ']') {
      depth--;
      if (depth === 0 && kind === 'interface' && c === '}' && sawBody) { i++; break; }
    } else if (depth === 0 && kind === 'type') {
      if (c === ';') { i++; break; }
      if (c === '\n') {
        // A type alias without a semicolon ends at a line break unless the next line continues it.
        const before = src.slice(from, i).trimEnd();
        const next = src.slice(i + 1).match(/^\s*(\S)/)?.[1] ?? '';
        if (!/[=|&,(<:?]$|=>$/.test(before) && !/[|&?:=.)\]}>]/.test(next)) break;
      }
    }
    i++;
  }
  // Take the rest of the line (a trailing comment) and the line break.
  const nl = src.indexOf('\n', i);
  if (nl >= 0 && /^[ \t]*(\/\/.*)?$/.test(src.slice(i, nl))) return nl + 1;
  return nl < 0 ? src.length : i;
}

/** Start offset of the comment lines directly above the line at `lineStart`. */
function leadingCommentStart(src: string, lineStart: number): number {
  let start = lineStart;
  for (;;) {
    if (start === 0) return start;
    const prevEnd = start - 1;
    const prevStart = src.lastIndexOf('\n', prevEnd - 1) + 1;
    const line = src.slice(prevStart, prevEnd).trim();
    if (line.startsWith('//')) { start = prevStart; continue; }
    if (line.endsWith('*/')) {
      const open = src.lastIndexOf('/*', prevEnd);
      if (open < 0) return start;
      const openLine = src.lastIndexOf('\n', open - 1) + 1;
      if (src.slice(openLine, open).trim()) return start;
      start = openLine;
      continue;
    }
    return start;
  }
}

/** Top-level `interface` and `type` declarations (only ones that start at column 0). */
export function findTypeDecls(src: string): TypeDecl[] {
  const out: TypeDecl[] = [];
  let i = 0;
  let lineStart = true;
  let depth = 0;
  while (i < src.length) {
    if (lineStart && depth === 0) {
      const m = src.slice(i, i + 200).match(DECL_RE);
      if (m) {
        const end = declEnd(src, i, m[2] as 'interface' | 'type');
        out.push({ name: m[3], exported: !!m[1], start: leadingCommentStart(src, i), end });
        i = end;
        lineStart = src[end - 1] === '\n';
        continue;
      }
    }
    const skipped = skipTrivia(src, i);
    if (skipped !== i) { lineStart = false; i = skipped; continue; }
    const c = src[i];
    if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') depth = Math.max(0, depth - 1);
    lineStart = c === '\n';
    i++;
  }
  return out;
}

/** Names the types file exports. */
export function exportedTypeNames(typesTs: string): string[] {
  return findTypeDecls(typesTs).filter((d) => d.exported).map((d) => d.name);
}

/** Does this code import (or re-export from) the types file? */
export function importsTypesFile(code: string): boolean {
  return new RegExp(TYPES_IMPORT_RE.source).test(code);
}

/** Types-file names that `code` declares itself (old single-file code that predates the types file). */
export function ownCopiesOfTypes(code: string, typesTs: string): string[] {
  const names = new Set(exportedTypeNames(typesTs));
  return findTypeDecls(code).filter((d) => names.has(d.name)).map((d) => d.name);
}

function removeRanges(src: string, ranges: { start: number; end: number }[]): string {
  let out = '';
  let at = 0;
  for (const r of [...ranges].sort((a, b) => a.start - b.start)) { out += src.slice(at, r.start); at = Math.max(at, r.end); }
  return out + src.slice(at);
}

/** Code with strings and comments blanked out, for "is this name used" checks. */
function codeOnly(src: string): string {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const j = skipTrivia(src, i);
    if (j !== i) { out += ' '; i = j; } else { out += src[i]; i++; }
  }
  return out;
}

const IMPORT_LINE_RE = /^import\s+(?:type\s+)?\{[^}]*\}\s*from\s*(['"])\.\/types(?:\.ts|\.js)?\1;?[ \t]*\r?\n?/gm;

/** `import type { … } from './types';` for the types-file names the code uses, or '' when it uses none. */
function importLine(code: string, names: string[], all = false): string {
  const body = codeOnly(code);
  const used = all ? names : names.filter((n) => new RegExp(`(?<![\\w$.])${n.replace(/\$/g, '\\$')}(?![\\w$])`).test(body));
  return used.length ? `import type { ${used.join(', ')} } from '${TYPES_SPECIFIER}';\n` : '';
}

/** Drops blank lines at the top and collapses runs of 3+ line breaks left by removed declarations. */
const tidy = (s: string) => s.replace(/^\s*\n/, '').replace(/\n{3,}/g, '\n\n');

/**
 * Old single-file code -> code that uses the types file: removes the code's own declarations of every type the types
 * file exports and imports the ones it uses. Everything else (including the user's own helper types) stays.
 */
export function adoptTypesFile(code: string, typesTs: string): { code: string; moved: string[] } {
  const names = exportedTypeNames(typesTs);
  const set = new Set(names);
  const own = findTypeDecls(code).filter((d) => set.has(d.name));
  const rest = tidy(removeRanges(code, own).replace(IMPORT_LINE_RE, ''));
  const imp = importLine(rest, names);
  return { code: imp ? `${imp}\n${rest}` : rest, moved: own.map((d) => d.name) };
}

/**
 * Authoring helper: splits a single-file solution into its exported types (for types.ts) and the rest, which then
 * imports them (all of them with `importAll`, as starters do). Only `export interface` / `export type` move; private
 * helper types stay with the code.
 */
export function splitTypes(code: string, importAll = false): { types: string; rest: string; names: string[] } {
  const exported = findTypeDecls(code).filter((d) => d.exported);
  const types = tidy(exported.map((d) => code.slice(d.start, d.end).replace(/\s*$/, '\n')).join('\n'));
  const names = exported.map((d) => d.name);
  const rest = tidy(removeRanges(code, exported));
  const imp = importLine(rest, names, importAll);
  return { types, rest: imp ? `${imp}\n${rest}` : rest, names };
}
