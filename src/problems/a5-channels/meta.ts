import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'a5-channels',
  catalogId: 'A5',
  title: 'Async channel with backpressure',
  theme: 'Async',
  difficulty: 'Hard',
  inspiredBy: 'Go channels, it-pushable',
  tags: [
    { kind: 'library', name: 'it-pushable' },
    { kind: 'pattern', name: 'Channels' },
    { kind: 'pattern', name: 'Backpressure' },
    { kind: 'pattern', name: 'Async iteration' },
  ],
  summary: 'A Go-style channel with rendezvous and buffered modes, close semantics, async iteration, merge and a lossless select.',
  stages: [
    { title: 'Unbuffered channel', summary: 'send() waits for a receiver and receive() waits for a sender (rendezvous), FIFO on both sides.', groups: ['Unbuffered channel'] },
    { title: 'Buffered channel', summary: 'capacity N: send resolves right away until the buffer is full.', groups: ['Buffered channel'] },
    { title: 'Close and iterate', summary: 'close() drains the buffer, then receivers get done; for await works; blocked senders reject.', groups: ['Close and iterate'] },
    { title: 'merge and select', summary: 'merge(...chs) fans in; select(chs) takes exactly one ready message without losing others.', groups: ['merge and select'] },
  ],
};
