import type { RunOptions, RunResult } from './types';

export function parseLoader(request: string): { name: string; options: Record<string, unknown> } {
  throw new Error('Not implemented');
}

export async function runLoaders(opts: RunOptions): Promise<RunResult> {
  throw new Error('Not implemented');
}
