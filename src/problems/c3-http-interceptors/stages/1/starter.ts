import type { Response, Adapter, Client, ClientOptions } from './types';

export class HttpError extends Error {
  constructor(public response: Response) {
    super(`Request failed with status ${response.status}`);
    this.name = 'HttpError';
  }
  get status() { return this.response.status; }
  get config() { return this.response.config; }
}

export function createClient(options: ClientOptions): Client {
  throw new Error('Not implemented');
}
