# Offline mutation queue: offline and persistence

Add the "offline" part: hold writes while there's no connection, and keep them in `storage` so they survive a reload.

```ts
const q = createOfflineQueue({ send, storage: localStorage, online: navigator.onLine });
window.addEventListener('online', () => q.setOnline(true));
window.addEventListener('offline', () => q.setOnline(false));
```

## New options and methods

```ts
storage: { getItem(key: string): string | null; setItem(key: string, value: string): void };
storageKey?: string; // default 'offline-queue'
online?: boolean;    // initial connectivity, default true

// OfflineQueue gains:
setOnline(online: boolean): void;
```

## Rules

**Starting.** Sending now also starts on `setOnline(true)` and at startup, again on a microtask. <!-- tests: restored queue is sent at startup when online; custom storageKey -->

**Offline**
- While offline, nothing new is sent. <!-- tests: offline: nothing is sent until setOnline(true), then order is kept -->
- A send that is already in flight finishes, and its outcome is handled normally.

**Persistence**
- After every change to the queue (enqueue and success), write `JSON.stringify(pending())` to `storage` under `storageKey`. <!-- tests: persists after every change and restores on startup -->
- On creation, restore the queue from storage. New ids continue after the largest restored id; ids start at 1. <!-- tests: persists after every change and restores on startup -->

- Restored mutations keep their stored fields, including `attempts`. You can still assume `send` always resolves.

Everything from earlier stages still applies.
