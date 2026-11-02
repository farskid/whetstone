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

/** `next()`, or `next('route')` to skip the rest of a route's handlers. */
export type Next = (signal?: 'route') => void;

export type Handler = (req: Request, res: Response, next: Next) => unknown;

export interface Router {
  use(pathOrFn: string | Handler, ...fns: Handler[]): Router;
  get(path: string, ...fns: Handler[]): Router;
  post(path: string, ...fns: Handler[]): Router;
  put(path: string, ...fns: Handler[]): Router;
  delete(path: string, ...fns: Handler[]): Router;
  all(path: string, ...fns: Handler[]): Router;
  /** Resolves when `res.end` is first called. */
  handle(req: Request, res: Response): Promise<void>;
}
