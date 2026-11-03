export type Entry = { member: string; score: number };

/** 5, '5', '(5' (exclusive), '-inf', '+inf'. */
export type Bound = number | string;

/** Options for `rangeByRank`. */
export interface RankRangeOptions {
  /** Count ranks from the highest score down. */
  rev?: boolean;
}

/** Options for `rangeByScore`: skip `offset` matches, then return at most `count`. */
export interface ScoreRangeOptions {
  offset?: number;
  count?: number;
}
