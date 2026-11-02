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
  /** Always 1 until duplicates are merged in a later stage. */
  count: number;
}

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

export interface ToasterOptions {
  clock: Clock;
  /** Default duration in ms. Default 4000. */
  duration?: number;
}

export interface Toaster {
  toast(message: string, options?: ToastOptions): string;
  dismiss(id?: string): void;
  getVisible(): Toast[];
}
