export interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

/** The part of a WebSocket this needs. */
export interface SocketLike {
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onclose: (() => void) | null;
}

export interface HeartbeatOptions {
  intervalMs: number;
  timeoutMs: number;
  ping: () => string;
  isPong: (data: string) => boolean;
}

export interface ReconnectingOptions {
  url: string;
  createSocket: (url: string) => SocketLike;
  clock?: Clock;
  minDelay?: number;
  maxDelay?: number;
  factor?: number;
  maxBuffer?: number;
  heartbeat?: HeartbeatOptions;
  stableAfterMs?: number;
}

export type SocketState = 'connecting' | 'open' | 'closed';

export interface SocketEvents {
  open: () => void;
  message: (data: string) => void;
  close: () => void;
  reconnecting: (info: { attempt: number; delay: number }) => void;
}

export interface ReconnectingSocket {
  readonly state: SocketState;
  send(data: string): boolean;
  subscribe(channel: string): () => void;
  on<K extends keyof SocketEvents>(event: K, fn: SocketEvents[K]): () => void;
  close(): void;
}

export function createReconnectingSocket(options: ReconnectingOptions): ReconnectingSocket {
  throw new Error('Not implemented');
}
