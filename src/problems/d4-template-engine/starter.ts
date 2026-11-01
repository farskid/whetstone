export type Helper = (...args: unknown[]) => unknown;
export interface RenderOptions {
  partials?: Record<string, string>;
  helpers?: Record<string, Helper>;
}

export class TemplateError extends Error {
  constructor(message: string, public line: number, public column: number) {
    super(`${message} (line ${line}, column ${column})`);
    this.name = 'TemplateError';
  }
}

export function compile(template: string, options: RenderOptions = {}): (data: unknown) => string {
  throw new Error('Not implemented');
}

export function render(template: string, data: unknown, options: RenderOptions = {}): string {
  throw new Error('Not implemented');
}
