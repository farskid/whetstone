export interface Clock { setTimeout(fn: () => void, ms: number): number; clearTimeout(id: number): void }

/** Gives the held units back. Calling it again does nothing. */
export type Release = () => void;
