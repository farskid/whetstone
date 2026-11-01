export type ToastType = 'default' | 'success' | 'error' | 'info' | 'loading';

export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  count: number;
}

export interface ToastOptions {
  id?: string;
  type?: ToastType;
  duration?: number;
}

export interface ToastPatch {
  message?: string;
  type?: ToastType;
  duration?: number;
}

export interface PromiseMessages<T> {
  loading: string;
  success: string | ((value: T) => string);
  error: string | ((reason: unknown) => string);
}

export interface ToasterOptions {
  clock: Clock;
  maxVisible?: number;
  duration?: number;
}

export interface Toaster {
  toast(message: string, options?: ToastOptions): string;
  update(id: string, patch: ToastPatch): boolean;
  dismiss(id?: string): void;
  pause(): void;
  resume(): void;
  promise<T>(promise: Promise<T>, messages: PromiseMessages<T>): string;
  getVisible(): Toast[];
  getQueued(): Toast[];
}

export function createToaster(options: ToasterOptions): Toaster {
  throw new Error('Not implemented');
}
