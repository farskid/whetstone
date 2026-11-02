import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'c4-event-emitter',
  catalogId: 'C4',
  title: 'EventEmitter',
  theme: 'Middleware',
  difficulty: 'Medium',
  inspiredBy: 'Node events, mitt',
  tags: [
    { kind: 'library', name: 'Node.js events' },
    { kind: 'library', name: 'mitt' },
    { kind: 'pattern', name: 'Event emitter' },
    { kind: 'pattern', name: 'Pub/sub' },
  ],
  summary: 'A typed emitter with once, prepend, wildcard listeners, snapshot-on-emit, Node error and max-listener semantics, and an abortable events.once promise.',
  stages: [
    { title: 'on/off/emit', summary: 'Register, remove and call listeners; emit reports whether anyone listened; listenerCount.', groups: ['on/off/emit'] },
    { title: 'once, prepend and wildcard', summary: 'once and prependListener; off works with the original fn of a once listener; a * listener sees every event.', groups: ['once and prepend', 'Typed and wildcard'] },
    { title: 'Node semantics', summary: 'Unhandled error throws, max-listener warning, and once(emitter, name, { signal }).', groups: ['Node semantics'] },
  ],
};
