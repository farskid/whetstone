import type { Clock, SocketLike, ReconnectingOptions, SocketState, SocketEvents, ReconnectingSocket } from './types';

export function createReconnectingSocket(options: ReconnectingOptions): ReconnectingSocket {
  const clock: Clock = options.clock ?? {
    setTimeout: (fn, ms) => setTimeout(fn, ms) as unknown as number,
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
  const channels = new Map<string, number>();
  const lastEventId = new Map<string, string>();
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

  const subscribeMessage = (channel: string) => {
    const id = lastEventId.get(channel);
    return JSON.stringify(id === undefined ? { type: 'subscribe', channel } : { type: 'subscribe', channel, lastEventId: id });
  };

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
      for (const ch of channels.keys()) s.send(subscribeMessage(ch));
      for (const data of buffer.splice(0)) s.send(data);
      timers.stable = clock.setTimeout(() => {
        timers.stable = undefined;
        attempts = 0;
      }, stableAfterMs);
      emit('open');
    };
    s.onmessage = (event) => {
      if (s !== socket || state !== 'open') return;
      try {
        const msg: unknown = JSON.parse(event.data);
        if (msg && typeof msg === 'object') {
          const { channel, id } = msg as { channel?: unknown; id?: unknown };
          if (typeof channel === 'string' && typeof id === 'string' && channels.has(channel)) lastEventId.set(channel, id);
        }
      } catch {
        // not JSON: pass it through as-is
      }
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
    subscribe(channel) {
      if (state === 'closed') throw new Error('Socket is closed');
      const count = channels.get(channel) ?? 0;
      channels.set(channel, count + 1);
      if (count === 0 && state === 'open') socket!.send(subscribeMessage(channel));
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        const left = (channels.get(channel) ?? 1) - 1;
        if (left > 0) {
          channels.set(channel, left);
          return;
        }
        channels.delete(channel);
        lastEventId.delete(channel);
        if (state === 'open') socket!.send(JSON.stringify({ type: 'unsubscribe', channel }));
      };
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
