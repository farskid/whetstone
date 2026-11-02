export interface Request {
  method: string;
  /** Path plus optional query, e.g. '/a?x=1'. */
  url: string;
  [key: string]: unknown;
}

export interface Response {
  statusCode: number;
  end(body?: unknown): void;
  [key: string]: unknown;
}

export type Next = () => void;

export type Handler = (req: Request, res: Response, next: Next) => unknown;

export interface Router {
  use(...fns: Handler[]): Router;
  /** Resolves when `res.end` is first called. */
  handle(req: Request, res: Response): Promise<void>;
}
