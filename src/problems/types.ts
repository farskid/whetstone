import type { TestCase } from '../runner/types';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type Theme = 'Async' | 'Data/Caches' | 'Middleware' | 'Parsing' | 'State' | 'Utilities' | 'Browser/UI' | 'API/Network';

export interface Stage {
  title: string;
  /** What this stage asks for (from the catalog). v1 UI ignores stages; v2 will unlock them one by one. */
  summary: string;
}

export interface ProblemMeta {
  /** URL slug, also the folder name under src/problems. */
  id: string;
  /** Id in practical-problems-catalog.md, e.g. "E2". */
  catalogId: string;
  title: string;
  theme: Theme;
  difficulty: Difficulty;
  inspiredBy: string;
  /** One line for the problem list. */
  summary: string;
  /** The staged chain from the catalog. v1 shows the final stage as one full problem. */
  stages: Stage[];
}

export interface ProblemSources {
  statement: string;
  starterTs: string;
  solutionTs: string;
}

export interface Problem extends ProblemMeta {
  tests: TestCase[];
}
