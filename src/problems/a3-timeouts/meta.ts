import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'a3-timeouts',
  catalogId: 'A3',
  title: 'Timeouts & cancellation',
  theme: 'Async',
  difficulty: 'Medium',
  inspiredBy: 'p-timeout, AbortSignal.timeout/any',
  tags: [
    { kind: 'library', name: 'p-timeout' },
    { kind: 'pattern', name: 'Timeout' },
    { kind: 'pattern', name: 'Cancellation' },
  ],
  summary: 'withTimeout for promises and abortable tasks, with fallback, custom errors and no leaked timers, plus anySignal().',
  stages: [
    { title: 'Reject on timeout', summary: 'withTimeout(input, ms) rejects with TimeoutError if the promise has not settled by then.', groups: ['Reject on timeout'] },
    { title: 'Fallback, message and cleanup', summary: 'fallback value or function, custom message or error, and the timer is cleared on settle.', groups: ['Fallback, message and cleanup'] },
    { title: 'Abortable tasks', summary: 'Take a task (signal) => Promise and abort its signal on timeout.', groups: ['Abortable tasks'] },
    { title: 'anySignal', summary: 'Combine signals: abort when any input does, keep the first reason, remove listeners.', groups: ['anySignal'] },
  ],
};
