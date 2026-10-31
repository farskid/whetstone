export interface Match<H> {
  handler: H;
  params: Record<string, string>;
  pattern: string;
}

export interface Router<H> {
  add(method: string, pattern: string, handler: H): void;
  match(method: string, path: string): Match<H> | null;
  allowedMethods(path: string): string[];
}

export function createRouter<H>(): Router<H> {
  throw new Error('Not implemented');
}

export function buildPath(pattern: string, params: Record<string, string | number>): string {
  throw new Error('Not implemented');
}
