import type { Side, Alignment, Placement, Rect, MiddlewareState, Middleware, ComputeOptions, ComputeResult, Overflow } from './types';

export function getSide(p: Placement): Side {
  return p.split('-')[0] as Side;
}

export function getAlignment(p: Placement): Alignment | undefined {
  return p.split('-')[1] as Alignment | undefined;
}

export function detectOverflow(state: Pick<MiddlewareState, 'x' | 'y' | 'rects' | 'viewport'>, options: { padding?: number } = {}): Overflow {
  throw new Error('Not implemented');
}

export function computePosition(reference: Rect, floating: { width: number; height: number }, options: ComputeOptions): ComputeResult {
  throw new Error('Not implemented');
}

export function offset(value: number | { mainAxis?: number; crossAxis?: number }): Middleware {
  throw new Error('Not implemented');
}

export function flip(options: { padding?: number; fallbackPlacements?: Placement[] } = {}): Middleware {
  throw new Error('Not implemented');
}

export function shift(options: { padding?: number } = {}): Middleware {
  throw new Error('Not implemented');
}

export function arrow(options: { size: number; padding?: number }): Middleware {
  throw new Error('Not implemented');
}

export function autoPlacement(options: { alignment?: Alignment; allowedSides?: Side[] } = {}): Middleware {
  throw new Error('Not implemented');
}
