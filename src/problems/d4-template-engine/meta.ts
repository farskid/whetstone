import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'd4-template-engine',
  catalogId: 'D4',
  title: 'Template engine',
  theme: 'Parsing',
  difficulty: 'Medium',
  inspiredBy: 'Mustache, Handlebars',
  tags: [
    { kind: 'library', name: 'Mustache' },
    { kind: 'library', name: 'Handlebars' },
    { kind: 'pattern', name: 'Templating' },
    { kind: 'pattern', name: 'HTML escaping' },
  ],
  summary: 'A Mustache-style engine: escaping, dotted paths through a context stack, sections and inverted sections, partials with a depth limit, helpers, compile(), and errors with line and column.',
  stages: [
    { title: 'Variables', summary: '{{name}} escaped, {{{raw}}} and {{& raw}}, missing renders empty.', groups: ['Variables'] },
    { title: 'Sections', summary: 'Dotted paths, the context stack, {{#loops}}, {{^inverted}}, {{.}}.', groups: ['Sections'] },
    { title: 'Partials and helpers', summary: '{{> partial}} with a depth limit; {{upper name}} helpers with literal args.', groups: ['Partials and helpers'] },
    { title: 'compile and errors', summary: 'Parse once, render many; errors with line and column.', groups: ['compile and errors'] },
  ],
};
