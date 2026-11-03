/**
 * Stage contracts (TypeScript mode only).
 *
 * Code carries over from stage to stage and the tests run on the type-stripped JS, so nothing at runtime makes a user
 * update a signature when a stage changes it (A3 stage 3 lets `withTimeout` take a task function as well as a
 * promise). A stage can say so in a hidden contract file, `stages/<k>/contract.ts` (`contract.ts` at the problem root
 * for the last stage), that imports the user's code as `./solution` and the stage's types as `./types` and only
 * type-checks if the code accepts what the stage hands it:
 *
 *   /**
 *    * @contract withTimeout, TimeoutInput
 *    * @change `withTimeout` now takes a `TimeoutInput<T>`: a promise, or a function that gets an `AbortSignal`.
 *    * Your `withTimeout` doesn't accept a task function yet: stage 3 changes its first argument to `TimeoutInput<T>`.
 *    *\/
 *   export const acceptsTask: <T>(input: TimeoutInput<T>, ms: number, options?: TimeoutOptions<T>) => Promise<T> = withTimeout;
 *
 * Each `@contract` doc comment opens a check that runs to the next one: the keys it covers (the exported names, or
 * `Class.member`, whose signature it pins), an optional `@change` line for the stage statement, and the message a user
 * sees when type errors land in it. `// @contract-skip <key>: <reason>` records a signature change that needs no
 * check (an output that only got wider, say). Targets are function types, not methods, so parameters are checked
 * strictly; a `new (…) => …` type checks a constructor. Typing a parameter `any` passes, which is the user's call.
 *
 * The browser checks with Monaco's TypeScript worker (ui/contractCheck.ts) and scripts/verify.ts with tsc; both hand
 * their diagnostics to explainContract().
 */

export interface ContractBlock {
  keys: string[];
  /** Shown in the results when the check fails. */
  message: string;
  /** One line for the stage statement, when the stage introduces this change. */
  change?: string;
  /** 1-based, inclusive: the doc comment through the line before the next block (or the end). */
  startLine: number;
  endLine: number;
}
export interface ContractSkip { key: string; reason: string }
export interface Contract { blocks: ContractBlock[]; skips: ContractSkip[] }

/** A failed check, as the results panel shows it. */
export interface ContractFailure {
  keys: string[];
  message: string;
  /** What TypeScript said, the first lines of each diagnostic. */
  details: string[];
}

/** A type error in the contract file, 1-based line. */
export interface ContractDiagnostic { line: number; message: string }

const BLOCK_RE = /\/\*\*((?:(?!\*\/)[\s\S])*?@contract\s(?:(?!\*\/)[\s\S])*)\*\//g;
const SKIP_RE = /^\s*\/\/\s*@contract-skip\s+([^:]+):\s*(.+)$/gm;

const lineAt = (src: string, index: number) => src.slice(0, index).split('\n').length;

export function parseContract(src: string): Contract {
  const lines = src.split('\n').length;
  const blocks: ContractBlock[] = [];
  for (const m of src.matchAll(BLOCK_RE)) {
    const body = m[1].split('\n').map((l) => l.replace(/^\s*\*\s?/, '').trim()).filter(Boolean);
    let keys: string[] = [];
    let change: string | undefined;
    const message: string[] = [];
    for (const l of body) {
      const tag = /^@(contract|change)\s+(.*)$/.exec(l);
      if (tag?.[1] === 'contract') keys = tag[2].split(',').map((k) => k.trim()).filter(Boolean);
      else if (tag?.[1] === 'change') change = tag[2].trim();
      else message.push(l);
    }
    blocks.push({ keys, message: message.join(' '), change, startLine: lineAt(src, m.index!), endLine: lines });
  }
  blocks.forEach((b, i) => { if (blocks[i + 1]) b.endLine = blocks[i + 1].startLine - 1; });
  const skips = [...src.matchAll(SKIP_RE)].map((m) => ({ key: m[1].trim(), reason: m[2].trim() }));
  return { blocks, skips };
}

/** Every key a contract speaks for, checked or skipped. */
export const contractKeys = (c: Contract) => new Set([...c.blocks.flatMap((b) => b.keys), ...c.skips.map((s) => s.key)]);

/**
 * Groups type errors in the contract file by check. Errors above the first check (an import the user's code doesn't
 * export, say) get a message of their own.
 */
export function explainContract(contract: Contract, diagnostics: ContractDiagnostic[]): ContractFailure[] {
  const out: ContractFailure[] = [];
  /** TypeScript's message chain, cut to its first few lines (the most specific reason is usually near the top). */
  const firstLine = (m: string) => m.split('\n').slice(0, 4).join('\n').trimEnd();
  const preamble = diagnostics.filter((d) => !contract.blocks.some((b) => d.line >= b.startLine && d.line <= b.endLine));
  if (preamble.length) {
    const missing = preamble.map((d) => /has no exported member (?:named )?'([^']+)'/.exec(d.message)?.[1]).filter((x): x is string => !!x);
    out.push({
      keys: missing,
      message: missing.length
        ? `Your code doesn't export ${missing.map((m) => `\`${m}\``).join(', ')}, which this stage needs.`
        : 'Your code doesn\'t match what this stage expects.',
      details: preamble.map((d) => firstLine(d.message)),
    });
  }
  for (const b of contract.blocks) {
    const mine = diagnostics.filter((d) => d.line >= b.startLine && d.line <= b.endLine);
    if (mine.length) out.push({ keys: b.keys, message: b.message, details: [...new Set(mine.map((d) => firstLine(d.message)))] });
  }
  return out;
}

/** The checks a stage adds: its blocks with a `@change` line whose text the previous stage's contract doesn't have. */
export function contractChanges(contract: string | undefined, previous: string | undefined): string[] {
  if (!contract) return [];
  const before = new Set(previous ? parseContract(previous).blocks.map((b) => b.change) : []);
  return parseContract(contract).blocks.flatMap((b) => (b.change && !before.has(b.change) ? [b.change] : []));
}
