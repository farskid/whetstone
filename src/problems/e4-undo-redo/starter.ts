import type { HistoryOptions, History, CommandHistory, CommandHistoryOptions } from './types';

export function createHistory<S, Sel = unknown>(initial: S, options: HistoryOptions = {}): History<S, Sel> {
  throw new Error('Not implemented');
}

export function createCommandHistory(options: CommandHistoryOptions = {}): CommandHistory {
  throw new Error('Not implemented');
}
