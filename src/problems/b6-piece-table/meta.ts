import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'b6-piece-table',
  catalogId: 'B6',
  title: 'Piece table text buffer',
  theme: 'Data/Caches',
  difficulty: 'Hard',
  inspiredBy: 'VS Code text buffer',
  tags: [
    { kind: 'company', name: 'Microsoft' },
    { kind: 'pattern', name: 'Piece table' },
    { kind: 'pattern', name: 'Text buffer' },
  ],
  summary: 'An editor text buffer on a piece table: cheap inserts and deletes, line/column mapping with CRLF and surrogate pairs, and O(1) snapshots.',
  stages: [
    { title: 'Piece table', summary: 'insert, delete and getText without copying the whole document per edit.' },
    { title: 'Lines and positions', summary: 'offsetAt / positionAt and getLine with line starts tracked incrementally.' },
    { title: 'CRLF and Unicode', summary: 'Mixed CRLF and LF; columns in UTF-16 code units; never split a surrogate pair.' },
    { title: 'Snapshots', summary: 'snapshot() is O(1) and later edits do not affect it.' },
  ],
};
