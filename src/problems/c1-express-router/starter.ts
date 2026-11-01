export interface Request {
  method: string;
  url: string;
  originalUrl?: string;
  baseUrl?: string;
  params?: Record<string, string>;
  [key: string]: unknown;
}
export interface Response {
  statusCode: number;
  end(body?: unknown): void;
  [key: string]: unknown;
}
export type Next = (err?: unknown) => void;
export type Handler = (req: Request, res: Response, next: Next) => unknown;
export type ErrorHandler = (err: unknown, req: Request, res: Response, next: Next) => unknown;
// Handler or ErrorHandler; Express tells them apart by fn.length at runtime.
type Fn = (a: any, b: any, c: any, d?: any) => unknown;

export interface Router {
  (req: Request, res: Response, next: Next): void;
  use(pathOrFn: string | Fn, ...fns: Fn[]): Router; // a Router is itself an Fn
  get(path: string, ...fns: Fn[]): Router;
  post(path: string, ...fns: Fn[]): Router;
  put(path: string, ...fns: Fn[]): Router;
  delete(path: string, ...fns: Fn[]): Router;
  all(path: string, ...fns: Fn[]): Router;
  handle(req: Request, res: Response): Promise<void>;
}

export function createRouter(): Router {
  throw new Error('Not implemented');
}
