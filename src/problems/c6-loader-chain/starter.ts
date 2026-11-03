import type { RunOptions, RunResult, ParsedLoader } from './types';

export function parseLoader(request: string): ParsedLoader {
  throw new Error('Not implemented');
}

export async function runLoaders(opts: RunOptions): Promise<RunResult> {
  throw new Error('Not implemented');
}
