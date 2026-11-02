import type { Mutation, Outcome, QueueOptions } from './types';

const defaultIsRetryable = (error: unknown) => {
  const status = (error as { status?: unknown } | null)?.status;
  return !(typeof status === 'number' && status >= 400 && status <= 499);
};

export function createOfflineQueue(options: QueueOptions) {
  const {
    send,
    storage,
    storageKey = 'offline-queue',
    maxRetries = 3,
    retryDelay = (n: number) => 1000 * 2 ** (n - 1),
    isRetryable = defaultIsRetryable,
    onSettled,
    clock = { setTimeout: (fn, ms) => setTimeout(fn, ms) as unknown as number, clearTimeout: (id) => clearTimeout(id) },
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
  let retryTimer: number | undefined = undefined;
  /** True after a failure until the retry delay has passed (or we come back online). */
  let waitingForRetry = false;

  const copy = (m: Mutation): Mutation => ({ ...m });
  const persist = () => storage.setItem(storageKey, JSON.stringify(queue.map(copy)));

  const remove = (m: Mutation, outcome: Outcome) => {
    queue = queue.filter((x) => x !== m);
    persist();
    onSettled?.(copy(m), outcome);
  };

  const process = () => {
    if (!online || inFlight || waitingForRetry || queue.length === 0) return;
    const m = queue[0];
    inFlight = m;
    let p: Promise<unknown>;
    try { p = Promise.resolve(send(copy(m))); } catch (e) { p = Promise.reject(e); }
    p.then(
      (value) => {
        inFlight = null;
        remove(m, { ok: true, value });
        process();
      },
      (error) => {
        inFlight = null;
        if (!isRetryable(error)) {
          remove(m, { ok: false, error });
          process();
          return;
        }
        m.attempts++;
        if (m.attempts > maxRetries) {
          remove(m, { ok: false, error });
          process();
          return;
        }
        persist();
        waitingForRetry = true;
        if (online) scheduleRetry(m.attempts);
      },
    );
  };

  const scheduleRetry = (attempts: number) => {
    retryTimer = clock.setTimeout(() => {
      retryTimer = undefined;
      waitingForRetry = false;
      process();
    }, retryDelay(attempts));
  };

  const kick = () => queueMicrotask(process);
  kick();

  return {
    enqueue(type: string, payload: unknown, opts: { dedupeKey?: string } = {}): number {
      const { dedupeKey } = opts;
      if (dedupeKey !== undefined) {
        const existing = queue.find((m) => m.dedupeKey === dedupeKey && m !== inFlight);
        if (existing) {
          existing.type = type;
          existing.payload = payload;
          persist();
          return existing.id;
        }
      }
      const m: Mutation = { id: nextId++, type, payload, attempts: 0 };
      if (dedupeKey !== undefined) m.dedupeKey = dedupeKey;
      queue.push(m);
      persist();
      kick();
      return m.id;
    },

    setOnline(next: boolean): void {
      if (next === online) return;
      online = next;
      if (!online) {
        if (retryTimer !== undefined) { clock.clearTimeout(retryTimer); retryTimer = undefined; }
      } else {
        waitingForRetry = false;
        kick();
      }
    },

    pending(): Mutation[] {
      return queue.map(copy);
    },
  };
}
