export interface Request {
  method: string;
  /** Path plus optional query. Inside a `use(path)` layer the prefix is stripped. */
  url: string;
  /** The url `handle` was called with. Never changes. */
  originalUrl?: string;
  /** Prefixes stripped so far by `use(path)` layers. */
  baseUrl?: string;
  /** The current route's `:params`, URL-decoded. */
  params?: Record<string, string>;
  [key: string]: unknown;
}

export interface Response {
  statusCode: number;
  end(body?: unknown): void;
  [key: string]: unknown;
}

/** `next()`, `next(err)` or `next('route')`. */
export type Next = (err?: unknown) => void;

export type Handler = (req: Request, res: Response, next: Next) => unknown;

export type ErrorHandler = (err: unknown, req: Request, res: Response, next: Next) => unknown;

/** Handler or ErrorHandler; they are told apart by `fn.length` at runtime. */
export type Fn = (a: any, b: any, c: any, d?: any) => unknown;

export interface Router {
  use(pathOrFn: string | Fn, ...fns: Fn[]): Router;
  get(path: string, ...fns: Fn[]): Router;
  post(path: string, ...fns: Fn[]): Router;
  put(path: string, ...fns: Fn[]): Router;
  delete(path: string, ...fns: Fn[]): Router;
  all(path: string, ...fns: Fn[]): Router;
  /** Resolves when `res.end` is first called. */
  handle(req: Request, res: Response): Promise<void>;
}
