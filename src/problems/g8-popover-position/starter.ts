import type { Side, Alignment, Placement, Rect, MiddlewareState, Middleware, ComputeOptions, ComputeResult, Overflow, FloatingSize, DetectOverflowOptions, OffsetValue, FlipOptions, ShiftOptions, ArrowOptions, AutoPlacementOptions } from './types';

export function getSide(p: Placement): Side {
  return p.split('-')[0] as Side;
}

export function getAlignment(p: Placement): Alignment | undefined {
  return p.split('-')[1] as Alignment | undefined;
}

export function detectOverflow(state: Pick<MiddlewareState, 'x' | 'y' | 'rects' | 'viewport'>, options: DetectOverflowOptions = {}): Overflow {
  throw new Error('Not implemented');
}

export function computePosition(reference: Rect, floating: FloatingSize, options: ComputeOptions): ComputeResult {
  throw new Error('Not implemented');
}

export function offset(value: OffsetValue): Middleware {
  throw new Error('Not implemented');
}

export function flip(options: FlipOptions = {}): Middleware {
  throw new Error('Not implemented');
}

export function shift(options: ShiftOptions = {}): Middleware {
  throw new Error('Not implemented');
}

export function arrow(options: ArrowOptions): Middleware {
  throw new Error('Not implemented');
}

export function autoPlacement(options: AutoPlacementOptions = {}): Middleware {
  throw new Error('Not implemented');
}
