import type { Options, Api } from './types';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head';

export class HTTPError extends Error {
  readonly response: Response;
  readonly request: Request;
  constructor(response: Response, request: Request) {
    super(`Request failed with status ${response.status}: ${request.method} ${request.url}`);
    this.name = 'HTTPError';
    this.response = response;
    this.request = request;
  }
}

export class TimeoutError extends Error {
  readonly request: Request;
  constructor(request: Request) {
    super(`Request timed out: ${request.method} ${request.url}`);
    this.name = 'TimeoutError';
    this.request = request;
  }
}

export function createApi(defaults: Options = {}): Api {
  throw new Error('Not implemented');
}
