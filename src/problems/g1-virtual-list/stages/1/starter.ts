import type { VirtualItem, VirtualizerOptions, Virtualizer } from './types';

export function createVirtualizer(options: VirtualizerOptions): Virtualizer {
  return {
    getVirtualItems(scrollTop: number): VirtualItem[] {
      throw new Error('Not implemented');
    },
    getTotalSize(): number {
      throw new Error('Not implemented');
    },
  };
}
