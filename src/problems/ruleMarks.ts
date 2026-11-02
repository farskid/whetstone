// Rule annotations in stage statements (see docs/rule-annotations.md).
// A rule (a list item or paragraph) ends with `<!-- tests: title A | title B -->`, naming the tests that pin it.
// Pure string helpers, shared by the browser (Markdown.tsx) and scripts/verify.ts.
import type { TestStatus } from '../runner/types';

export const RULE_MARK_RE = /<!--\s*tests:\s*([\s\S]*?)\s*-->/g;

/** The test titles each marker names, in source order. */
export function parseRuleMarks(md: string): string[][] {
  return [...md.matchAll(RULE_MARK_RE)].map((m) => m[1].split('|').map((s) => s.trim()).filter(Boolean));
}

/**
 * Swap each marker for an empty `<span class="rule-mark" data-rule="i">` (i = its index in parseRuleMarks), which
 * markdown keeps as inline HTML, so the renderer can find the element the rule lives in.
 */
export function withRuleAnchors(md: string): string {
  let i = 0;
  return md.replace(RULE_MARK_RE, () => `<span class="rule-mark" data-rule="${i++}"></span>`);
}

export type RuleStatus = 'pass' | 'fail' | 'idle';

/**
 * A rule passes when every linked test passed in the last run, fails when any linked test failed or timed out, and
 * stays idle while there's no result for one of them (no run yet, not run in this stage, or still running).
 */
export function ruleStatus(tests: string[], results: ReadonlyMap<string, TestStatus>): RuleStatus {
  if (!tests.length) return 'idle';
  const st = tests.map((t) => results.get(t));
  if (st.some((s) => s === 'fail' || s === 'timeout')) return 'fail';
  if (st.every((s) => s === 'pass')) return 'pass';
  return 'idle';
}
