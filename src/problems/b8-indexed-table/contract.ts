// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { Table } from './solution';
import type { FindOptions, IndexFields, IndexOptions, Row } from './types';

/**
 * @contract Table.createIndex
 * @change `createIndex(fields: IndexFields, opts?: IndexOptions)` takes several fields (a compound index) and a `unique` option.
 * Your `createIndex` doesn't take `fields: IndexFields` and `opts: IndexOptions` yet (from `./types`).
 */
export function compoundIndex(table: Table<Row>, fields: IndexFields, opts: IndexOptions) {
  table.createIndex(fields, opts);
}

/**
 * @contract Table.where
 * @change `where(query, opts?: FindOptions)` takes `orderBy` and `limit`.
 * Your `where` doesn't take `opts: FindOptions` yet (from `./types`).
 */
export function whereWithOptions(table: Table<Row>, opts: FindOptions) {
  return table.where({}, opts);
}
