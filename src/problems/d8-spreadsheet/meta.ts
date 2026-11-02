import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'd8-spreadsheet',
  catalogId: 'D8',
  title: 'Spreadsheet formulas',
  theme: 'Parsing',
  difficulty: 'Hard',
  inspiredBy: 'HyperFormula',
  tags: [
    { kind: 'library', name: 'HyperFormula' },
    { kind: 'company', name: 'Handsontable' },
    { kind: 'pattern', name: 'Formula parsing' },
    { kind: 'pattern', name: 'Dependency graph' },
    { kind: 'pattern', name: 'Topological sort' },
  ],
  summary: 'A spreadsheet engine: parse formulas with precedence, ranges and functions, track dependencies, recalculate only what changed in topological order, detect cycles, and propagate errors.',
  stages: [
    { title: 'Formulas', summary: 'Literals, references, operator precedence, comparisons, & and error values.', groups: ['Formulas'] },
    { title: 'Functions and errors', summary: 'SUM/AVERAGE/MIN/MAX/COUNT/IF/CONCAT, ranges, #DIV/0!, #VALUE!, #NAME?, #ERROR!.', groups: ['Functions and errors'] },
    { title: 'Recalculation and custom functions', summary: 'Dependents update; set returns what changed; each formula evaluates once; define() custom functions.', groups: ['Recalculation and custom functions'] },
    { title: 'Cycles', summary: '#CYCLE! for cells on or downstream of a cycle, and recovery when it breaks.', groups: ['Cycles'] },
  ],
};
