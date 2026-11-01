import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'h5-circuit-breaker',
  catalogId: 'H5',
  title: 'Circuit breaker',
  theme: 'API/Network',
  difficulty: 'Medium',
  inspiredBy: 'opossum',
  tags: [
    { kind: 'library', name: 'opossum' },
    { kind: 'pattern', name: 'Circuit breaker' },
    { kind: 'pattern', name: 'Fallback' },
    { kind: 'pattern', name: 'Sliding window' },
  ],
  summary: 'Wrap an async call so that repeated failures open the circuit and fail fast, with a timed half-open trial, a rolling error-rate window, timeouts, a fallback, events, and an error filter.',
  stages: [
    { title: 'Failing fast', summary: 'fire(...args) wraps the call; N failures in a row open the circuit.' },
    { title: 'Half-open', summary: 'After resetTimeout, a limited number of trial calls close or reopen it.' },
    { title: 'Rolling window', summary: 'An error-percentage threshold with volumeThreshold; timeouts count as failures.' },
    { title: 'Fallback and events', summary: 'fallback(fn), the open/halfOpen/close/reject events, and errorFilter.' },
  ],
};
