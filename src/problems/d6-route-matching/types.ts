/** A successful match. */
export interface Match<H> {
  handler: H;
  /** Decoded param values by name (`'*'` for a wildcard). */
  params: Record<string, string>;
  /** The pattern exactly as it was added. */
  pattern: string;
}

export interface Router<H> {
  add(method: string, pattern: string, handler: H): void;
  /** The best route for this method and path, or null. */
  match(method: string, path: string): Match<H> | null;
  /** Sorted methods with any route matching the path. */
  allowedMethods(path: string): string[];
}
