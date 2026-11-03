export interface Received<T> { value: T | undefined; done: boolean }

/** What `select` resolves with: which channel delivered first, and what it delivered. */
export interface Selected<T> { index: number; value: T | undefined; done: boolean }
