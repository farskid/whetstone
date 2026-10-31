import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'f6-schema-validation',
  catalogId: 'F6',
  title: 'Schema validation',
  theme: 'Parsing',
  difficulty: 'Medium',
  inspiredBy: 'Zod, Valibot, Yup',
  summary: 'A Zod-style runtime validator: primitives with checks, objects (strip/strict/passthrough), arrays, unions, optional/default, refine/transform, lazy recursion, all issues with paths.',
  stages: [
    { title: 'Primitives', summary: 'string/number/boolean/literal/enum with parse and safeParse and typed issues.' },
    { title: 'Objects and arrays', summary: 'Nested shapes, every issue collected with its path; unknown keys stripped.' },
    { title: 'Modifiers', summary: 'optional, nullable, default, union, strict/passthrough.' },
    { title: 'Refine, transform, lazy', summary: 'Custom checks and output transforms that only run on valid input; recursive schemas. (Type-level Infer is out of scope in v1.)' },
  ],
};
