import type { Mutation, QueueOptions, OfflineQueue } from './types';

export function createOfflineQueue(options: QueueOptions): OfflineQueue {
  const { send } = options;

  let queue: Mutation[] = [];
  let nextId = 1;

  let inFlight: Mutation | null = null;

  const copy = (m: Mutation): Mutation => ({ ...m });

  const remove = (m: Mutation) => {
    queue = queue.filter((x) => x !== m);
  };

  const process = () => {
    if (inFlight || queue.length === 0) return;
    const m = queue[0];
    inFlight = m;
    let p: Promise<unknown>;
    try {
      p = send(copy(m));
    } catch (e) {
      p = Promise.reject(e);
    }
    p.then(
      () => {
        inFlight = null;
        remove(m);
        process();
      },
      () => {
        // Failures are handled from stage 3 on.
      },
    );
  };

  const kick = () => queueMicrotask(process);

  return {
    enqueue(type: string, payload: unknown): number {
      const m: Mutation = { id: nextId++, type, payload, attempts: 0 };
      queue.push(m);
      kick();
      return m.id;
    },

    pending(): Mutation[] {
      return queue.map(copy);
    },
  };
}
