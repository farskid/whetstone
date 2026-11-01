import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'd5-markdown-lite',
  catalogId: 'D5',
  title: 'Markdown lite',
  theme: 'Parsing',
  difficulty: 'Hard',
  inspiredBy: 'marked',
  tags: [
    { kind: 'library', name: 'marked' },
    { kind: 'pattern', name: 'Markdown' },
    { kind: 'pattern', name: 'HTML escaping' },
  ],
  summary: 'Render a Markdown subset to HTML: headings, paragraphs, fenced code, blockquotes, nested lists, emphasis, code spans and links, with HTML escaping and unsafe-URL filtering.',
  stages: [
    { title: 'Blocks', summary: 'Headings, paragraphs, fenced code, HTML escaping.' },
    { title: 'Inline', summary: 'Code spans, emphasis, strong, backslash escapes, unclosed delimiters.' },
    { title: 'Links', summary: 'Inline links with safe URLs only.' },
    { title: 'Lists and quotes', summary: 'Nested lists, ordered start numbers, nested blockquotes.' },
  ],
};
