import type { VirtualItem, VirtualizerOptions } from './types';

export function createVirtualizer(options: VirtualizerOptions) {
  return {
    getVirtualItems(scrollTop: number): VirtualItem[] {
      throw new Error('Not implemented');
    },
    getTotalSize(): number {
      throw new Error('Not implemented');
    },
  };
}
