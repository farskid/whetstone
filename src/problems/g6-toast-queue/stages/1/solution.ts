import type { ToastType, Toast, ToasterOptions, Toaster } from './types';

interface Entry extends Toast {
  timer: number | undefined;
}

export function createToaster(options: ToasterOptions): Toaster {
  const { clock, duration: defaultDuration = 4000 } = options;
  const visible: Entry[] = [];
  let nextId = 1;

  const durationFor = (type: ToastType, given?: number) => given ?? (type === 'loading' ? Infinity : defaultDuration);

  function dismiss(id?: string) {
    const doomed = id === undefined ? [...visible] : visible.filter((t) => t.id === id);
    for (const t of doomed) {
      if (t.timer !== undefined) clock.clearTimeout(t.timer);
      visible.splice(visible.indexOf(t), 1);
    }
  }

  const view = ({ id, message, type, duration, count }: Entry): Toast => ({ id, message, type, duration, count });

  return {
    toast(message, opts = {}) {
      const type = opts.type ?? 'default';
      const duration = durationFor(type, opts.duration);
      const t: Entry = { id: `toast-${nextId++}`, message, type, duration, count: 1, timer: undefined };
      if (duration !== Infinity) t.timer = clock.setTimeout(() => dismiss(t.id), duration);
      visible.push(t);
      return t.id;
    },
    dismiss,
    getVisible: () => visible.map(view),
  };
}
