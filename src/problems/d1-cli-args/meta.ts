import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'd1-cli-args',
  catalogId: 'D1',
  title: 'CLI argument parser',
  theme: 'Parsing',
  difficulty: 'Medium',
  inspiredBy: 'minimist, yargs',
  tags: [
    { kind: 'library', name: 'minimist' },
    { kind: 'library', name: 'yargs' },
    { kind: 'pattern', name: 'Argument parsing' },
    { kind: 'pattern', name: 'Did-you-mean suggestions' },
  ],
  summary: 'Parse argv minimist-style, then with a schema: types, aliases, defaults, --no-flags, nested subcommands, unknown/required errors with "did you mean", and generated help.',
  stages: [
    { title: 'Schema-less parsing', summary: '--a=1 --b 2 -xyz pos -- rest, repeated flags, negative numbers.', groups: ['Schema-less parsing'] },
    { title: 'Schema', summary: 'Types, defaults, aliases, --no-flag, short groups.', groups: ['Schema'] },
    { title: 'Subcommands and errors', summary: 'Nested commands with inherited options; unknown, invalid and missing-required errors.', groups: ['Subcommands and errors'] },
    { title: 'Help and suggestions', summary: 'Generated --help text and "did you mean" for typos.', groups: ['Help and suggestions'] },
  ],
};
