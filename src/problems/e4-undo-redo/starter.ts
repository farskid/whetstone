import type { HistoryOptions, History, CommandHistory } from './types';

export function createHistory<S, Sel = unknown>(initial: S, options: HistoryOptions = {}): History<S, Sel> {
  throw new Error('Not implemented');
}

export function createCommandHistory(options: { capacity?: number } = {}): CommandHistory {
  throw new Error('Not implemented');
}
