import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'd7-object-path',
  catalogId: 'D7',
  title: 'Object path get/set/query',
  theme: 'Parsing',
  difficulty: 'Medium',
  inspiredBy: 'lodash.get, JSONPath',
  tags: [
    { kind: 'library', name: 'lodash' },
    { kind: 'library', name: 'JSONPath' },
    { kind: 'pattern', name: 'Path expressions' },
    { kind: 'pattern', name: 'Immutable updates' },
  ],
  summary: 'Parse paths like a.b[0]["x.y"], read and write through them (mutably and immutably), and query with wildcards and filter expressions that report concrete paths.',
  stages: [
    { title: 'get', summary: "Dots, [0] indexes and ['quoted'] keys, with a default for missing values.", groups: ['get'] },
    { title: 'set and setIn', summary: 'Create arrays for numeric segments and objects otherwise; an immutable variant shares untouched branches.', groups: ['set and setIn'] },
    { title: 'Wildcards', summary: 'a.*.b and a[*] return every match with its concrete path.', groups: ['Wildcards'] },
    { title: 'Filters', summary: '[?(@.price > 10 && @.tags contains "x")]', groups: ['Filters'] },
  ],
};
