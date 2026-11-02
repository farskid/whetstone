/** Timer source; ids are numbers. */
export interface Clock {
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

/** The part of a WebSocket this needs. */
export interface SocketLike {
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onclose: (() => void) | null;
}

export interface ReconnectingOptions {
  url: string;
  createSocket: (url: string) => SocketLike;
  clock?: Clock;
  /** Default 1000 ms. */
  minDelay?: number;
  /** Default 30000 ms. */
  maxDelay?: number;
  /** Default 2. */
  factor?: number;
  /** How long a connection must stay open before the backoff resets (default 5000 ms). */
  stableAfterMs?: number;
}

export type SocketState = 'connecting' | 'open';

export interface SocketEvents {
  open: () => void;
  message: (data: string) => void;
  close: () => void;
  reconnecting: (info: { attempt: number; delay: number }) => void;
}

export interface ReconnectingSocket {
  readonly state: SocketState;
  on<K extends keyof SocketEvents>(event: K, fn: SocketEvents[K]): () => void;
}
