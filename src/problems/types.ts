import type { TestCase } from '../runner/types';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type Theme = 'Async' | 'Data/Caches' | 'Middleware' | 'Parsing' | 'State' | 'Utilities' | 'Browser/UI' | 'API/Network';

/** library: a package or tool; framework: a UI or server framework; company: only when the work really comes from it; pattern: a technique. */
export type TagKind = 'library' | 'framework' | 'company' | 'pattern';

export interface Tag {
  kind: TagKind;
  name: string;
}

export interface Stage {
  title: string;
  /** What this stage asks for (from the catalog). */
  summary: string;
  /**
   * The test groups this stage adds. When every stage lists its groups the problem is staged: stages unlock one by one,
   * and stage k runs the groups of stages 1..k (earlier ones re-run as regression). Without groups the problem is
   * single-stage and the catalog chain is shown as information only.
   */
  groups?: string[];
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
  /** What this problem relates to. Only real relations. */
  tags: Tag[];
  /** One line for the problem list. */
  summary: string;
  /** The staged chain from the catalog. See Stage.groups for when it becomes a real staged problem. */
  stages: Stage[];
}

export interface ProblemSources {
  /** The full statement (single-stage problems, and the "full problem" mode of staged ones). */
  statement: string;
  /** The full starter. */
  starterTs: string;
  /** The reference solution for the whole problem (= the final stage). */
  solutionTs: string;
  /** Staged problems only: stages/<k>/statement.md, one section per stage (1-based folders, 0-based array). */
  stageStatements: string[];
  /** Staged problems only: the reference for each stage; stages/<k>/solution.ts, and solution.ts for the last one. */
  stageSolutionsTs: string[];
  /** Staged problems only: stages/1/starter.ts, the starting code for stage 1. */
  stageStarterTs?: string;
  /**
   * Staged problems only: the read-only types file of the final stage (types.ts), which the full starter and solution
   * import as './types'. Single-stage problems keep their types inline and have none.
   */
  typesTs?: string;
  /** Staged problems only: each stage's types file; stages/<k>/types.ts, and types.ts for the last one. */
  stageTypesTs: string[];
}

export interface Problem extends ProblemMeta {
  tests: TestCase[];
}
