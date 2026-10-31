import { useEffect, useMemo, useRef } from 'react';
import { marked } from 'marked';
import { monaco } from '../monaco';

/** Render trusted, bundled markdown and colorize its code blocks with Monaco. */
export function Markdown({ source, theme }: { source: string; theme: string }) {
  const html = useMemo(() => marked.parse(source, { async: false, gfm: true }) as string, [source]);
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
  return <div className="markdown" ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}
