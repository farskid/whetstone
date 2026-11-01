import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'e5-state-machine',
  catalogId: 'E5',
  title: 'State machine interpreter',
  theme: 'State',
  difficulty: 'Hard',
  inspiredBy: 'XState',
  summary: 'Interpret a statechart config: nested states, guards, assign, exit/transition/entry action order, final states with onDone, delayed transitions and invoked promises that cancel on exit.',
  stages: [
    { title: 'Flat machine', summary: 'createMachine + transition(state, event) for flat states.' },
    { title: 'Guards, context, actions', summary: 'Guards, assign, and the exit → transition → entry order.' },
    { title: 'Hierarchy', summary: 'Nested states, bubbling, #absolute targets, final states and onDone.' },
    { title: 'Interpreter', summary: 'interpret() runs actions, after timers and invoked promises; stale ones are ignored.' },
  ],
};
