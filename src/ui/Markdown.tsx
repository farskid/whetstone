import { useEffect, useMemo, useRef } from 'react';
import { marked } from 'marked';
import { monaco } from '../monaco';
import type { TestStatus } from '../runner/types';
import { parseRuleMarks, ruleStatus, withRuleAnchors } from '../problems/ruleMarks';

const ICON: Record<string, string> = { pass: '✓', fail: '✗' };
const SAID: Record<string, string> = { pass: 'Rule passed', fail: 'Rule failed' };

/**
 * Render trusted, bundled markdown and colorize its code blocks with Monaco. Rules annotated with
 * `<!-- tests: … -->` (docs/rule-annotations.md) are painted from `results`, the last run's status per test title.
 */
export function Markdown({ source, theme, results }: { source: string; theme: string; results?: ReadonlyMap<string, TestStatus> }) {
  const rules = useMemo(() => parseRuleMarks(source), [source]);
  const html = useMemo(() => marked.parse(withRuleAnchors(source), { async: false, gfm: true }) as string, [source]);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.querySelectorAll('pre code').forEach((code) => {
      const cls = code.className.match(/language-(\w+)/)?.[1] ?? 'ts';
      const lang = ({ ts: 'typescript', typescript: 'typescript', js: 'javascript', javascript: 'javascript', json: 'json' } as Record<string, string>)[cls] ?? 'typescript';
      const text = code.textContent ?? '';
      monaco.editor.colorize(text, lang, { tabSize: 2 }).then((colored) => { code.innerHTML = colored; });
    });
  }, [html, theme]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.querySelectorAll<HTMLElement>('.rule-mark').forEach((mark) => {
      const tests = rules[Number(mark.dataset.rule)] ?? [];
      // The rule is the list item, table row or paragraph the marker sits in; the icon goes at the start of its text.
      const rule = mark.closest<HTMLElement>('li') ?? mark.closest<HTMLElement>('tr') ?? mark.closest<HTMLElement>('p') ?? mark.parentElement;
      const block = rule instanceof HTMLTableRowElement ? rule.cells[0] : mark.closest<HTMLElement>('p, li') ?? rule;
      if (!block || !rule || !el.contains(rule)) return;
      const status = results ? ruleStatus(tests, results) : 'idle';
      rule.classList.add('rule');
      rule.dataset.ruleStatus = status;
      rule.title = `${tests.length === 1 ? 'Test' : 'Tests'}: ${tests.join(' · ')}`;
      let icon = block.querySelector<HTMLElement>(':scope > .rule-icon');
      if (!icon) {
        icon = document.createElement('span');
        icon.className = 'rule-icon';
        block.prepend(icon);
      }
      icon.textContent = ICON[status] ?? '';
      if (SAID[status]) icon.setAttribute('aria-label', SAID[status]); else icon.removeAttribute('aria-label');
      icon.hidden = status === 'idle';
    });
  }, [html, rules, results]);
  return <div className="markdown" ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}
