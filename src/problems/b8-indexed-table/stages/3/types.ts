export type Id = string | number;

/** Every row has a unique `id`. */
export type Row = { id: Id } & Record<string, unknown>;

/** Range condition on one field; the bounds combine with AND. */
export type Range = { $gt?: unknown; $gte?: unknown; $lt?: unknown; $lte?: unknown };

/** field -> value (equality), or field -> Range. */
export type Query = Record<string, unknown>;

export interface FindOptions {
  /** One field, ascending by default. */
  orderBy?: string | [string, 'asc' | 'desc'];
  /** Applied after sorting. */
  limit?: number;
}
