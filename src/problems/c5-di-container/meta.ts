import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'c5-di-container',
  catalogId: 'C5',
  title: 'DI container',
  theme: 'Middleware',
  difficulty: 'Hard',
  inspiredBy: 'tsyringe, InversifyJS',
  tags: [
    { kind: 'library', name: 'tsyringe' },
    { kind: 'library', name: 'InversifyJS' },
    { kind: 'pattern', name: 'Dependency injection' },
    { kind: 'pattern', name: 'Scoped lifetimes' },
  ],
  summary: 'A dependency injection container with value/factory/class providers, singleton/transient/scoped lifetimes, child scopes, captive and circular dependency errors, async factories and dispose.',
  stages: [
    { title: 'Values and factories', summary: 'register(token, { useValue | useFactory }) and resolve(token).', groups: ['Values and factories'] },
    { title: 'Classes and lifetimes', summary: 'useClass with static inject deps; singleton vs transient.', groups: ['Classes and lifetimes'] },
    { title: 'Child containers', summary: 'Children override or fall back to the parent; scoped instances are per child.', groups: ['Child containers'] },
    { title: 'Safety, async, dispose', summary: 'Circular and captive dependency errors, resolveAsync, dispose in reverse creation order.', groups: ['Safety, async, dispose'] },
  ],
};
