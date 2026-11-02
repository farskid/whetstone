import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'c8-mini-bundler',
  catalogId: 'C8',
  title: 'Mini bundler with plugins',
  theme: 'Middleware',
  difficulty: 'Hard',
  inspiredBy: 'Rollup',
  tags: [
    { kind: 'library', name: 'Rollup' },
    { kind: 'pattern', name: 'Module bundling' },
    { kind: 'pattern', name: 'Plugin hooks' },
    { kind: 'pattern', name: 'Code splitting' },
    { kind: 'pattern', name: 'Topological sort' },
  ],
  summary: 'Bundle a virtual file system of ES modules: dependency order, resolveId/load/transform plugin hooks, circular imports, a define() registry output, virtual modules and dynamic-import code splitting.',
  stages: [
    { title: 'Dependency order', summary: 'Resolve relative imports and list modules dependencies-first, each once.', groups: ['Dependency order'] },
    { title: 'Plugin hooks', summary: 'resolveId and load: first non-null wins; transform chains.', groups: ['Plugin hooks'] },
    { title: 'Cycles and output', summary: 'Allow and report circular imports; wrap modules in define() calls.', groups: ['Cycles and output'] },
    { title: 'Virtual modules and chunks', summary: '\\0virtual ids and a separate chunk per dynamic import(), in a deterministic order.', groups: ['Virtual modules and chunks'] },
  ],
};
