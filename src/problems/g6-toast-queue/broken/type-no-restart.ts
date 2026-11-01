// Bug: a type change does not restart the timer
export type ToastType = 'default' | 'success' | 'error' | 'info' | 'loading';

export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  count: number;
}

export interface ToastOptions {
  id?: string;
  type?: ToastType;
  duration?: number;
}

export interface ToastPatch {
  message?: string;
  type?: ToastType;
  duration?: number;
}

export interface PromiseMessages<T> {
  loading: string;
  success: string | ((value: T) => string);
  error: string | ((reason: unknown) => string);
}

export interface ToasterOptions {
  clock: Clock;
  maxVisible?: number;
  duration?: number;
}

export interface Toaster {
  toast(message: string, options?: ToastOptions): string;
  update(id: string, patch: ToastPatch): boolean;
  dismiss(id?: string): void;
  pause(): void;
  resume(): void;
  promise<T>(promise: Promise<T>, messages: PromiseMessages<T>): string;
  getVisible(): Toast[];
  getQueued(): Toast[];
}

interface Entry extends Toast {
  timer: unknown;
  dueAt: number;
  remaining: number;
}

export function createToaster(options: ToasterOptions): Toaster {
  const { clock, maxVisible = 3, duration: defaultDuration = 4000 } = options;
  const visible: Entry[] = [];
  const queued: Entry[] = [];
  let paused = false;
  let nextId = 1;

  const durationFor = (type: ToastType, given?: number) => given ?? (type === 'loading' ? Infinity : defaultDuration);
  const find = (id: string) => visible.find((t) => t.id === id) ?? queued.find((t) => t.id === id);
  const isVisible = (t: Entry) => visible.includes(t);

  function stop(t: Entry) {
    clock.clearTimeout(t.timer);
    t.timer = undefined;
  }

  function run(t: Entry) {
    stop(t);
    if (paused || t.remaining === Infinity) return;
    t.dueAt = clock.now() + t.remaining;
    t.timer = clock.setTimeout(() => dismiss(t.id), t.remaining);
  }

  /** Restart the full duration (only matters once the toast is on screen). */
  function restart(t: Entry) {
    t.remaining = t.duration;
    if (isVisible(t)) run(t);
  }

  function promote() {
    while (visible.length < maxVisible && queued.length) {
      const t = queued.shift()!;
      visible.push(t);
      restart(t);
    }
  }

  function create(message: string, type: ToastType, duration: number, id?: string): string {
    const t: Entry = { id: id ?? `toast-${nextId++}`, message, type, duration, count: 1, timer: undefined, dueAt: 0, remaining: duration };
    queued.push(t);
    promote();
    return t.id;
  }

  function update(id: string, patch: ToastPatch): boolean {
    const t = find(id);
    if (!t) return false;
    const typeChanged = (false as boolean);
    if (patch.message !== undefined) t.message = patch.message;
    if (patch.type !== undefined) t.type = patch.type;
    if (patch.duration !== undefined || typeChanged) {
      t.duration = durationFor(t.type, patch.duration);
      restart(t);
    }
    return true;
  }

  function dismiss(id?: string) {
    const doomed = id === undefined ? [...visible, ...queued] : [find(id)].filter((t): t is Entry => !!t);
    for (const t of doomed) {
      stop(t);
      const list = isVisible(t) ? visible : queued;
      list.splice(list.indexOf(t), 1);
    }
    promote();
  }

  const view = ({ id, message, type, duration, count }: Entry): Toast => ({ id, message, type, duration, count });

  return {
    toast(message, opts = {}) {
      const type = opts.type ?? 'default';
      if (opts.id !== undefined && find(opts.id)) {
        update(opts.id, { message, type, duration: opts.duration });
        return opts.id;
      }
      if (opts.id === undefined) {
        const same = [...visible, ...queued].find((t) => t.message === message && t.type === type);
        if (same) {
          same.count++;
          restart(same);
          return same.id;
        }
      }
      return create(message, type, durationFor(type, opts.duration), opts.id);
    },
    update,
    dismiss,
    pause() {
      if (paused) return;
      paused = true;
      for (const t of visible) {
        if (t.timer === undefined) continue;
        t.remaining = t.dueAt - clock.now();
        stop(t);
      }
    },
    resume() {
      if (!paused) return;
      paused = false;
      visible.forEach(run);
    },
    promise(p, messages) {
      const id = create(messages.loading, 'loading', Infinity);
      p.then(
        (value) => update(id, { type: 'success', message: typeof messages.success === 'function' ? messages.success(value) : messages.success }),
        (reason) => update(id, { type: 'error', message: typeof messages.error === 'function' ? messages.error(reason) : messages.error }),
      );
      return id;
    },
    getVisible: () => visible.map(view),
    getQueued: () => queued.map(view),
  };
}
