/** A tap name, or options. Lower `stage` runs first (default 0). */
export type TapOptions = string | { name: string; stage?: number; before?: string | string[] };

/** 'sync' for tap(), 'promise' for tapPromise(). */
export type TapType = 'sync' | 'promise';

/** What an interceptor's `tap` callback receives. */
export interface TapInfo { name: string; type: TapType; stage: number; fn: (...args: any[]) => any }

export interface Interceptor {
  /** Once per call, before any tap, with the call's arguments. */
  call?: (...args: any[]) => void;
  /** Just before each tap runs. */
  tap?: (tap: TapInfo) => void;
}
