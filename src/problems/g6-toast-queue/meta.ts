import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'g6-toast-queue',
  catalogId: 'G6',
  title: 'Toast queue',
  theme: 'Browser/UI',
  difficulty: 'Medium',
  inspiredBy: 'sonner, react-hot-toast',
  tags: [
    { kind: 'library', name: 'sonner' },
    { kind: 'library', name: 'react-hot-toast' },
    { kind: 'framework', name: 'React' },
    { kind: 'pattern', name: 'Toast notifications' },
    { kind: 'pattern', name: 'FIFO queue' },
  ],
  summary: 'A notification manager: a visible limit with a FIFO queue, auto-dismiss timers that only start on screen, pause and resume with remaining time, in-place updates, de-duplication and promise toasts.',
  stages: [
    { title: 'Show and dismiss', summary: 'Toasts auto-dismiss after their duration; dismiss one or all.' },
    { title: 'Queue and pause', summary: 'At most maxVisible on screen; queued timers wait; pause keeps the remaining time.' },
    { title: 'Updates and duplicates', summary: 'Update in place by id; identical toasts bump a counter instead of stacking.' },
    { title: 'Promise toasts', summary: 'A loading toast that turns into success or error when the promise settles.' },
  ],
};
