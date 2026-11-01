import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'd8-spreadsheet',
  catalogId: 'D8',
  title: 'Spreadsheet formulas',
  theme: 'Parsing',
  difficulty: 'Hard',
  inspiredBy: 'HyperFormula',
  summary: 'A spreadsheet engine: parse formulas with precedence, ranges and functions, track dependencies, recalculate only what changed in topological order, detect cycles, and propagate errors.',
  stages: [
    { title: 'Formulas', summary: 'Literals, references, operator precedence, comparisons and &.' },
    { title: 'Functions and errors', summary: 'SUM/AVERAGE/MIN/MAX/COUNT/IF/CONCAT, ranges, #DIV/0!, #VALUE!, #NAME?, #ERROR!.' },
    { title: 'Recalculation', summary: 'Dependents update; set returns what changed; each formula evaluates once.' },
    { title: 'Cycles and custom functions', summary: '#CYCLE! and recovery; define() custom functions.' },
  ],
};
