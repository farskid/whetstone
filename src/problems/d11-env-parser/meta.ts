import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'd11-env-parser',
  catalogId: 'D11',
  title: '.env parser',
  theme: 'Parsing',
  difficulty: 'Easy',
  inspiredBy: 'dotenv, dotenv-expand',
  tags: [
    { kind: 'library', name: 'dotenv' },
    { kind: 'library', name: 'dotenv-expand' },
    { kind: 'pattern', name: 'Config parsing' },
    { kind: 'pattern', name: 'Variable expansion' },
  ],
  summary: 'Parse .env files (comments, export, quotes, multiline values, inline comments) and expand ${VAR} and ${VAR:-default} references with cycle detection.',
  stages: [
    { title: 'KEY=value', summary: 'Parse lines, skip comments and blanks; export prefixes and simply quoted values.', groups: ['KEY=value'] },
    { title: 'Quotes and comments', summary: 'Single, double and backtick quotes, \\n in double quotes, multiline values, inline #.', groups: ['Quotes and comments'] },
    { title: 'Expansion', summary: '${VAR}, $VAR and ${VAR:-default} from the file or env, \\$ escapes, cycle errors.', groups: ['Expansion'] },
  ],
};
