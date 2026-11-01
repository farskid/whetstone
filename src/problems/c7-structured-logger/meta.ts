import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'c7-structured-logger',
  catalogId: 'C7',
  title: 'Structured logger',
  theme: 'Middleware',
  difficulty: 'Medium',
  inspiredBy: 'pino',
  tags: [
    { kind: 'library', name: 'pino' },
    { kind: 'pattern', name: 'Structured logging' },
    { kind: 'pattern', name: 'Redaction' },
  ],
  summary: 'A pino-style JSON logger with level filtering, child bindings, safe serialization, redaction paths, error serializers, buffered per-transport writes with flush(), and sampling.',
  stages: [
    { title: 'JSON lines', summary: 'info/warn/error(obj?, msg) write one JSON line each, filtered by level.' },
    { title: 'Child loggers', summary: 'child(bindings) merges context; more specific fields win; levels inherit live.' },
    { title: 'Redaction and serializers', summary: 'Redact dotted paths with * wildcards; serialize errors with stack and cause.' },
    { title: 'Transports', summary: 'Per-transport levels, buffered async writes, flush(), sampling.' },
  ],
};
