import type { Clock, SocketLike, ReconnectingOptions, SocketState, SocketEvents, ReconnectingSocket } from './types';

export function createReconnectingSocket(options: ReconnectingOptions): ReconnectingSocket {
  const clock: Clock = options.clock ?? {
    setTimeout: (fn, ms) => setTimeout(fn, ms) as unknown as number,
    clearTimeout: (id) => clearTimeout(id),
  };
  const minDelay = options.minDelay ?? 1000;
  const maxDelay = options.maxDelay ?? 30000;
  const factor = options.factor ?? 2;
  const stableAfterMs = options.stableAfterMs ?? 5000;

  let state: SocketState = 'connecting';
  let socket: SocketLike | null = null;
  let attempts = 0;
  const listeners: { [K in keyof SocketEvents]: Set<SocketEvents[K]> } = {
    open: new Set(), message: new Set(), close: new Set(), reconnecting: new Set(),
  };
  const timers: Record<'retry' | 'stable', number | undefined> = { retry: undefined, stable: undefined };

  const emit = <K extends keyof SocketEvents>(event: K, ...args: Parameters<SocketEvents[K]>) => {
    for (const fn of [...listeners[event]]) (fn as (...a: unknown[]) => void)(...args);
  };
  const clear = (name: keyof typeof timers) => {
    if (timers[name] !== undefined) clock.clearTimeout(timers[name]);
    timers[name] = undefined;
  };
  const clearAll = () => (Object.keys(timers) as (keyof typeof timers)[]).forEach(clear);

  const lost = (s: SocketLike) => {
    if (s !== socket) return;
    const wasOpen = state === 'open';
    clearAll();
    socket = null;
    state = 'connecting';
    if (wasOpen) emit('close');
    const delay = Math.min(maxDelay, minDelay * Math.pow(factor, attempts));
    attempts++;
    timers.retry = clock.setTimeout(() => {
      timers.retry = undefined;
      connect();
    }, delay);
    emit('reconnecting', { attempt: attempts, delay });
  };

  const connect = () => {
    const s = options.createSocket(options.url);
    socket = s;
    s.onopen = () => {
      if (s !== socket || state !== 'connecting') return;
      state = 'open';
      timers.stable = clock.setTimeout(() => {
        timers.stable = undefined;
        attempts = 0;
      }, stableAfterMs);
      emit('open');
    };
    s.onmessage = (event) => {
      if (s !== socket || state !== 'open') return;
      emit('message', event.data);
    };
    s.onclose = () => lost(s);
  };

  connect();

  return {
    get state() {
      return state;
    },
    on(event, fn) {
      listeners[event].add(fn);
      return () => {
        listeners[event].delete(fn);
      };
    },
  };
}
