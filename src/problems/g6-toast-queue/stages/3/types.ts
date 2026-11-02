/** `'loading'` toasts default to an infinite duration. */
export type ToastType = 'default' | 'success' | 'error' | 'info' | 'loading';

/** Injected timers, so tests control time. */
export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

/** A read-only snapshot of one toast. */
export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  /** How many identical toasts were merged into this one. */
  count: number;
}

export interface ToastOptions {
  /** Reuse an id to update that toast instead of adding one. */
  id?: string;
  type?: ToastType;
  duration?: number;
}

export interface ToastPatch {
  message?: string;
  type?: ToastType;
  duration?: number;
}

export interface ToasterOptions {
  clock: Clock;
  /** Default 3. */
  maxVisible?: number;
  /** Default duration in ms. Default 4000. */
  duration?: number;
}

export interface Toaster {
  toast(message: string, options?: ToastOptions): string;
  update(id: string, patch: ToastPatch): boolean;
  dismiss(id?: string): void;
  pause(): void;
  resume(): void;
  getVisible(): Toast[];
  getQueued(): Toast[];
}
