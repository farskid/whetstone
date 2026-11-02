import type { Mutation, QueueOptions } from './types';

export function createOfflineQueue(options: QueueOptions) {
  const {
    send,
    storage,
    storageKey = 'offline-queue',
  } = options;

  let online = options.online ?? true;
  let queue: Mutation[] = [];
  try {
    const raw = storage.getItem(storageKey);
    if (raw) queue = JSON.parse(raw);
  } catch {
    queue = [];
  }
  let nextId = queue.reduce((max, m) => Math.max(max, m.id), 0) + 1;

  let inFlight: Mutation | null = null;

  const copy = (m: Mutation): Mutation => ({ ...m });
  const persist = () => storage.setItem(storageKey, JSON.stringify(queue.map(copy)));

  const remove = (m: Mutation) => {
    queue = queue.filter((x) => x !== m);
    persist();
  };

  const process = () => {
    if (!online || inFlight || queue.length === 0) return;
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
  kick();

  return {
    enqueue(type: string, payload: unknown): number {
      const m: Mutation = { id: nextId++, type, payload, attempts: 0 };
      queue.push(m);
      persist();
      kick();
      return m.id;
    },

    setOnline(next: boolean): void {
      if (next === online) return;
      online = next;
      if (online) kick();
    },

    pending(): Mutation[] {
      return queue.map(copy);
    },
  };
}
