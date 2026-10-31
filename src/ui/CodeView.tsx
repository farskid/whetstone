import { useEffect, useState } from 'react';
import { monaco } from '../monaco';

export function CodeView({ code, language, theme }: { code: string; language: 'typescript' | 'javascript'; theme: string }) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    monaco.editor.colorize(code, language, { tabSize: 2 }).then((h) => live && setHtml(h));
    return () => { live = false; };
  }, [code, language, theme]);
  return html === null
    ? <pre className="codeview">{code}</pre>
    : <pre className="codeview" dangerouslySetInnerHTML={{ __html: html }} />;
}
