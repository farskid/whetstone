export type Id = string | number;

/** Every row has a unique `id`. */
export type Row = { id: Id } & Record<string, unknown>;

/** field -> value; a row matches when every field is equal. */
export type Query = Record<string, unknown>;
