export type Side = 'top' | 'right' | 'bottom' | 'left';
export type Alignment = 'start' | 'end';
export type Placement = Side | `${Side}-${Alignment}`;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MiddlewareState {
  x: number;
  y: number;
  placement: Placement;
  initialPlacement: Placement;
  rects: { reference: Rect; floating: Rect };
  viewport: Rect;
  rtl: boolean;
  middlewareData: Record<string, any>;
}

export interface MiddlewareReturn {
  x?: number;
  y?: number;
  data?: Record<string, unknown>;
  reset?: true | { placement?: Placement };
}

export interface Middleware {
  name: string;
  fn(state: MiddlewareState): MiddlewareReturn | void;
}

export interface ComputeOptions {
  placement?: Placement;
  middleware?: Middleware[];
  viewport: Rect;
  rtl?: boolean;
}

export interface ComputeResult {
  x: number;
  y: number;
  placement: Placement;
  middlewareData: Record<string, any>;
}

export type Overflow = Record<Side, number>;

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
