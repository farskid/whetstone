import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

class FakeSocket {
  sent: string[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(public url: string) {}
  send(data: string) {
    if (this.closed) throw new Error('send on a closed socket');
    this.sent.push(data);
  }
  close() {
    this.closed = true;
  }
  /** Server side: the connection opens. */
  open() {
    this.onopen?.();
  }
  receive(data: string) {
    this.onmessage?.({ data });
  }
  /** Server side: the connection drops (or fails to connect). */
  drop() {
    this.onclose?.();
  }
}

function server() {
  const sockets: FakeSocket[] = [];
  return {
    sockets,
    createSocket: (url: string) => {
      const s = new FakeSocket(url);
      sockets.push(s);
      return s;
    },
    get last() {
      return sockets[sockets.length - 1];
    },
  };
}

/** Records every event as a short string. */
function record(sock: { on(event: any, fn: (...a: any[]) => void): () => void }) {
  const log: string[] = [];
  sock.on('open', () => log.push('open'));
  sock.on('close', () => log.push('close'));
  sock.on('message', (d: string) => log.push(`message ${d}`));
  sock.on('reconnecting', (i: { attempt: number; delay: number }) => log.push(`reconnecting ${i.attempt} ${i.delay}`));
  return log;
}

const parse = (sent: string[]) => sent.map((s) => { try { return JSON.parse(s); } catch { return s; } });
const HB = { intervalMs: 10_000, timeoutMs: 3000, ping: () => 'ping', isPong: (d: string) => d === 'pong' };

export const tests: TestCase<M>[] = [
  {
    group: 'Connecting and backoff',
    title: 'connects at once and reconnects with capped exponential backoff',
    run({ createReconnectingSocket }, { expect, clock }) {
      const c = clock();
      const srv = server();
      const sock = createReconnectingSocket({ url: 'wss://x/feed', createSocket: srv.createSocket, clock: c, maxDelay: 5000 });
      const log = record(sock);
      expect(srv.sockets.length).toBe(1);
      expect(srv.last.url).toBe('wss://x/feed');
      expect(sock.state).toBe('connecting');
      srv.last.open();
      expect(sock.state).toBe('open');
      srv.last.drop();
      expect(sock.state).toBe('connecting');
      c.tick(999);
      expect(srv.sockets.length).toBe(1);
      c.tick(1);
      expect(srv.sockets.length).toBe(2);
      for (const wait of [2000, 4000, 5000, 5000]) {
        srv.last.drop();
        c.tick(wait);
      }
      expect(srv.sockets.length).toBe(6);
      expect(log, 'close only when an open connection drops').toEqual([
        'open', 'close', 'reconnecting 1 1000', 'reconnecting 2 2000', 'reconnecting 3 4000', 'reconnecting 4 5000', 'reconnecting 5 5000',
      ]);
    },
  },
  {
    group: 'Connecting and backoff',
    title: 'the backoff resets only after a connection stays up for stableAfterMs',
    run({ createReconnectingSocket }, { expect, clock }) {
      const c = clock();
      const srv = server();
      const sock = createReconnectingSocket({ url: 'u', createSocket: srv.createSocket, clock: c, minDelay: 100, factor: 3 });
      const delays: number[] = [];
      sock.on('reconnecting', (i) => delays.push(i.delay));
      srv.last.drop();
      c.tick(100);
      srv.last.open();
      c.tick(4999);
      srv.last.drop();
      c.tick(300);
      srv.last.open();
      c.tick(5000);
      srv.last.drop();
      c.tick(100);
      srv.last.drop();
      expect(delays).toEqual([100, 300, 100, 300]);
    },
  },
  {
    group: 'Connecting and backoff',
    title: 'ignores events from old sockets and never doubles up timers',
    run({ createReconnectingSocket }, { expect, clock }) {
      const c = clock();
      const srv = server();
      const sock = createReconnectingSocket({ url: 'u', createSocket: srv.createSocket, clock: c, stableAfterMs: 50_000 });
      const log = record(sock);
      const first = srv.last;
      first.open();
      first.drop();
      first.drop();
      expect(c.pendingTimers(), 'one retry timer').toBe(1);
      c.tick(1000);
      expect(srv.sockets.length).toBe(2);
      first.open();
      first.receive('late');
      expect(sock.state, 'an old socket cannot open the new connection').toBe('connecting');
      srv.last.open();
      srv.last.open();
      first.drop();
      expect(sock.state).toBe('open');
      srv.last.receive('hi');
      expect(log).toEqual(['open', 'close', 'reconnecting 1 1000', 'open', 'message hi']);
      expect(c.pendingTimers(), 'just the stable timer').toBe(1);
    },
  },
  {
    group: 'Send buffer',
    title: 'buffers while disconnected and flushes in order on open',
    run({ createReconnectingSocket }, { expect, clock }) {
      const c = clock();
      const srv = server();
      const sock = createReconnectingSocket({ url: 'u', createSocket: srv.createSocket, clock: c });
      expect(sock.send('a')).toBe(true);
      expect(sock.send('b')).toBe(true);
      expect(srv.last.sent).toEqual([]);
      srv.last.open();
      expect(srv.last.sent).toEqual(['a', 'b']);
      sock.send('c');
      expect(srv.last.sent).toEqual(['a', 'b', 'c']);
      srv.last.drop();
      sock.send('d');
      c.tick(1000);
      sock.send('e');
      srv.last.open();
      expect(srv.last.sent, 'nothing is sent twice').toEqual(['d', 'e']);
      expect(srv.sockets[0].sent).toEqual(['a', 'b', 'c']);
    },
  },
  {
    group: 'Send buffer',
    title: 'caps the buffer, and close() is permanent',
    run({ createReconnectingSocket }, { expect, clock }) {
      const c = clock();
      const srv = server();
      const sock = createReconnectingSocket({ url: 'u', createSocket: srv.createSocket, clock: c, maxBuffer: 2 });
      expect([sock.send('1'), sock.send('2'), sock.send('3')]).toEqual([true, true, false]);
      srv.last.open();
      expect(srv.last.sent).toEqual(['1', '2']);
      expect(sock.send('4'), 'no cap while open').toBe(true);
      srv.last.drop();
      sock.send('lost');
      sock.close();
      expect(sock.state).toBe('closed');
      expect(c.pendingTimers(), 'the retry is cancelled').toBe(0);
      c.tick(60_000);
      expect(srv.sockets.length).toBe(1);
      expect(() => sock.send('x')).toThrow(/closed/i);

      const srv2 = server();
      const live = createReconnectingSocket({ url: 'u', createSocket: srv2.createSocket, clock: c });
      const log = record(live);
      srv2.last.open();
      live.close();
      live.close();
      expect(srv2.last.closed).toBe(true);
      srv2.last.drop();
      c.tick(60_000);
      expect([srv2.sockets.length, live.state, c.pendingTimers()]).toEqual([1, 'closed', 0]);
      expect(log, 'close() itself does not emit').toEqual(['open']);
    },
  },
  {
    group: 'Subscriptions',
    title: 'subscribes on open and resubscribes before flushing the buffer',
    run({ createReconnectingSocket }, { expect, clock }) {
      const c = clock();
      const srv = server();
      const sock = createReconnectingSocket({ url: 'u', createSocket: srv.createSocket, clock: c });
      sock.subscribe('a');
      sock.send('early');
      expect(srv.last.sent).toEqual([]);
      srv.last.open();
      sock.subscribe('b');
      expect(parse(srv.last.sent)).toEqual([{ type: 'subscribe', channel: 'a' }, 'early', { type: 'subscribe', channel: 'b' }]);
      srv.last.drop();
      sock.send('x');
      c.tick(1000);
      srv.last.open();
      expect(parse(srv.last.sent)).toEqual([{ type: 'subscribe', channel: 'a' }, { type: 'subscribe', channel: 'b' }, 'x']);
    },
  },
  {
    group: 'Subscriptions',
    title: 'resumes each channel from its last event id',
    run({ createReconnectingSocket }, { expect, clock }) {
      const c = clock();
      const srv = server();
      const sock = createReconnectingSocket({ url: 'u', createSocket: srv.createSocket, clock: c });
      const log = record(sock);
      const offA = sock.subscribe('a');
      sock.subscribe('b');
      srv.last.open();
      const m1 = JSON.stringify({ channel: 'a', id: '5', text: 'hi' });
      const m2 = JSON.stringify({ channel: 'a', id: '7' });
      const m3 = JSON.stringify({ channel: 'zzz', id: '9' });
      const seen: string[] = [];
      const off = sock.on('message', (d) => seen.push(d));
      for (const m of [m1, m2, m3, 'plain text']) srv.last.receive(m);
      off();
      srv.last.receive('after off');
      expect(log.slice(1)).toEqual([`message ${m1}`, `message ${m2}`, `message ${m3}`, 'message plain text', 'message after off']);
      expect(seen.length, 'on() returns an unsubscribe').toBe(4);
      srv.last.drop();
      c.tick(1000);
      srv.last.open();
      expect(parse(srv.last.sent)).toEqual([{ type: 'subscribe', channel: 'a', lastEventId: '7' }, { type: 'subscribe', channel: 'b' }]);
      offA();
      expect(parse(srv.last.sent.slice(2))).toEqual([{ type: 'unsubscribe', channel: 'a' }]);
      sock.subscribe('zzz');
      sock.subscribe('a');
      expect(parse(srv.last.sent.slice(3)), 'a fresh subscription has no id').toEqual([{ type: 'subscribe', channel: 'zzz' }, { type: 'subscribe', channel: 'a' }]);
    },
  },
  {
    group: 'Subscriptions',
    title: 'counts subscriptions to the same channel',
    run({ createReconnectingSocket }, { expect, clock }) {
      const c = clock();
      const srv = server();
      const sock = createReconnectingSocket({ url: 'u', createSocket: srv.createSocket, clock: c });
      srv.last.open();
      const off1 = sock.subscribe('a');
      const off2 = sock.subscribe('a');
      expect(srv.last.sent.length).toBe(1);
      off1();
      off1();
      expect(srv.last.sent.length, 'one subscriber is left').toBe(1);
      srv.last.drop();
      c.tick(1000);
      srv.last.open();
      expect(parse(srv.last.sent)).toEqual([{ type: 'subscribe', channel: 'a' }]);
      off2();
      expect(parse(srv.last.sent)).toEqual([{ type: 'subscribe', channel: 'a' }, { type: 'unsubscribe', channel: 'a' }]);
      const off3 = sock.subscribe('b');
      srv.last.drop();
      off3();
      c.tick(2000);
      srv.last.open();
      expect(srv.last.sent, 'unsubscribing while disconnected sends nothing later').toEqual([]);
    },
  },
  {
    group: 'Heartbeat',
    title: 'pings on an interval while pongs come back',
    run({ createReconnectingSocket }, { expect, clock }) {
      const c = clock();
      const srv = server();
      const sock = createReconnectingSocket({ url: 'u', createSocket: srv.createSocket, clock: c, heartbeat: HB });
      const log = record(sock);
      srv.last.open();
      c.tick(9999);
      expect(srv.last.sent).toEqual([]);
      c.tick(1);
      expect(srv.last.sent).toEqual(['ping']);
      c.tick(2000);
      srv.last.receive('pong');
      c.tick(9999);
      expect(srv.last.sent.length, 'the next ping is intervalMs after the pong').toBe(1);
      c.tick(1);
      expect(srv.last.sent).toEqual(['ping', 'ping']);
      srv.last.receive('pong');
      srv.last.receive('pong');
      c.tick(9999);
      expect(sock.state).toBe('open');
      expect(srv.last.sent.length, 'an extra pong does not add a ping').toBe(2);
      expect(log, 'pongs are not messages').toEqual(['open']);
    },
  },
  {
    group: 'Heartbeat',
    title: 'a missing pong drops the socket and reconnects',
    run({ createReconnectingSocket }, { expect, clock }) {
      const c = clock();
      const srv = server();
      const sock = createReconnectingSocket({ url: 'u', createSocket: srv.createSocket, clock: c, heartbeat: HB, stableAfterMs: 100_000 });
      const log = record(sock);
      const first = srv.last;
      first.open();
      c.tick(10_000 + 2999);
      expect(sock.state).toBe('open');
      c.tick(1);
      expect([sock.state, first.closed]).toEqual(['connecting', true]);
      first.drop();
      first.receive('pong');
      expect(log).toEqual(['open', 'close', 'reconnecting 1 1000']);
      expect(c.pendingTimers(), 'only the retry').toBe(1);
      c.tick(1000);
      srv.last.open();
      c.tick(10_000);
      expect(srv.last.sent).toEqual(['ping']);
      expect(first.sent).toEqual(['ping']);
    },
  },
  {
    group: 'Heartbeat',
    title: 'heartbeat timers stop while disconnected and after close',
    run({ createReconnectingSocket }, { expect, clock }) {
      const c = clock();
      const srv = server();
      const sock = createReconnectingSocket({ url: 'u', createSocket: srv.createSocket, clock: c, heartbeat: HB, stableAfterMs: 1000 });
      srv.last.open();
      c.tick(10_000);
      srv.last.drop();
      expect(c.pendingTimers(), 'no ping or pong timer left').toBe(1);
      c.tick(1000);
      expect(srv.last.sent).toEqual([]);
      srv.last.open();
      c.tick(5000);
      srv.last.receive('pong');
      c.tick(5000);
      expect(srv.last.sent, 'an unexpected pong does not add a ping').toEqual(['ping']);
      sock.close();
      expect(c.pendingTimers()).toBe(0);
      expect(srv.sockets.length).toBe(2);
    },
  },
];
