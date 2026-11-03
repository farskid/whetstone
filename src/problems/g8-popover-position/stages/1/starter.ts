import type { Side, Alignment, Placement, Rect, ComputeOptions, ComputeResult, FloatingSize } from './types';

export function getSide(p: Placement): Side {
  return p.split('-')[0] as Side;
}

export function getAlignment(p: Placement): Alignment | undefined {
  return p.split('-')[1] as Alignment | undefined;
}

export function computePosition(reference: Rect, floating: FloatingSize, options: ComputeOptions): ComputeResult {
  throw new Error('Not implemented');
}
