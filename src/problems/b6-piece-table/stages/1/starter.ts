import type {} from './types';

export class TextBuffer {
  constructor(initial = '') { throw new Error('Not implemented'); }
  get length(): number { throw new Error('Not implemented'); }
  getText(): string { throw new Error('Not implemented'); }
  insert(offset: number, text: string): void { throw new Error('Not implemented'); }
  delete(offset: number, length: number): void { throw new Error('Not implemented'); }
}
