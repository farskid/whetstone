import type { ToastType, Toast, ToasterOptions, Toaster } from './types';

interface Entry extends Toast {
  timer: number | undefined;
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
    if (t.timer !== undefined) clock.clearTimeout(t.timer);
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

  function create(message: string, type: ToastType, duration: number): string {
    const t: Entry = { id: `toast-${nextId++}`, message, type, duration, count: 1, timer: undefined, dueAt: 0, remaining: duration };
    queued.push(t);
    promote();
    return t.id;
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
      return create(message, type, durationFor(type, opts.duration));
    },
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
    getVisible: () => visible.map(view),
    getQueued: () => queued.map(view),
  };
}
