import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'h9-reconnecting-socket',
  catalogId: 'H9',
  title: 'Reconnecting socket client',
  theme: 'API/Network',
  difficulty: 'Hard',
  inspiredBy: 'reconnecting-websocket, EventSource',
  tags: [
    { kind: 'library', name: 'reconnecting-websocket' },
    { kind: 'pattern', name: 'WebSocket' },
    { kind: 'pattern', name: 'Reconnect with backoff' },
    { kind: 'pattern', name: 'Heartbeat' },
    { kind: 'pattern', name: 'Last-Event-ID resume' },
  ],
  summary: 'Wrap a WebSocket so it reconnects with capped exponential backoff, buffers sends while down, resubscribes channels from their last event id, and detects dead connections with a ping/pong heartbeat, without leaking timers or listening to stale sockets.',
  stages: [
    { title: 'Connecting and backoff', summary: 'Reconnect with capped exponential backoff that resets after a stable connection.' },
    { title: 'Send buffer', summary: 'Queue sends while disconnected, flush in order, cap the queue, and close for good.' },
    { title: 'Subscriptions', summary: 'Resubscribe channels on reconnect, resuming from the last event id.' },
    { title: 'Heartbeat', summary: 'Ping on an interval and reconnect when a pong does not come back in time.' },
  ],
};
