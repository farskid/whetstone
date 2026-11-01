import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'a3-timeouts',
  catalogId: 'A3',
  title: 'Timeouts & cancellation',
  theme: 'Async',
  difficulty: 'Medium',
  inspiredBy: 'p-timeout, AbortSignal.timeout/any',
  summary: 'withTimeout for promises and abortable tasks, with fallback, custom errors and no leaked timers, plus anySignal().',
  stages: [
    { title: 'Reject on timeout', summary: 'withTimeout(promise, ms) rejects with TimeoutError if the promise has not settled by then.' },
    { title: 'Fallback, message and cleanup', summary: 'fallback value or function, custom message or error, and the timer is cleared on settle.' },
    { title: 'Abortable tasks', summary: 'Take a task (signal) => Promise and abort its signal on timeout.' },
    { title: 'anySignal', summary: 'Combine signals: abort when any input does, keep the first reason, remove listeners.' },
  ],
};
