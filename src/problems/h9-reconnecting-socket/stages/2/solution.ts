import type { Clock, SocketLike, ReconnectingOptions, SocketState, SocketEvents, ReconnectingSocket } from './types';

export function createReconnectingSocket(options: ReconnectingOptions): ReconnectingSocket {
  const clock: Clock = options.clock ?? {
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
  };
  const minDelay = options.minDelay ?? 1000;
  const maxDelay = options.maxDelay ?? 30000;
  const factor = options.factor ?? 2;
  const maxBuffer = options.maxBuffer ?? 100;
  const stableAfterMs = options.stableAfterMs ?? 5000;

  let state: SocketState = 'connecting';
  let socket: SocketLike | null = null;
  let attempts = 0;
  const buffer: string[] = [];
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
    if (s !== socket || state === 'closed') return;
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
      for (const data of buffer.splice(0)) s.send(data);
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
    send(data) {
      if (state === 'closed') throw new Error('Socket is closed');
      if (state === 'open') {
        socket!.send(data);
        return true;
      }
      if (buffer.length >= maxBuffer) return false;
      buffer.push(data);
      return true;
    },
    on(event, fn) {
      listeners[event].add(fn);
      return () => {
        listeners[event].delete(fn);
      };
    },
    close() {
      if (state === 'closed') return;
      state = 'closed';
      clearAll();
      buffer.length = 0;
      const s = socket;
      socket = null;
      s?.close();
    },
  };
}
