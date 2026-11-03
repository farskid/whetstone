export type Side = 'top' | 'right' | 'bottom' | 'left';

export type Alignment = 'start' | 'end';

/** A side, optionally aligned: 12 placements in all. */
export type Placement = Side | `${Side}-${Alignment}`;

/** A rectangle in page coordinates; `y` grows downward. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** What each middleware sees. `rects.floating` is at (0, 0). */
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

/** New coordinates, data merged into `middlewareData[name]`, or a reset. */
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

/** How far each edge sticks out past the viewport; negative means room to spare. */
export type Overflow = Record<Side, number>;

/** The floating element's size. */
export interface FloatingSize {
  width: number;
  height: number;
}

export interface DetectOverflowOptions {
  /** Default 0. */
  padding?: number;
}

/** A plain number means `mainAxis`. */
export type OffsetValue = number | { mainAxis?: number; crossAxis?: number };

export interface FlipOptions {
  /** Default 0. */
  padding?: number;
  fallbackPlacements?: Placement[];
}

export interface ShiftOptions {
  /** Default 0. */
  padding?: number;
}

export interface ArrowOptions {
  size: number;
  /** Default 0. */
  padding?: number;
}

export interface AutoPlacementOptions {
  alignment?: Alignment;
  /** Default all four sides. */
  allowedSides?: Side[];
}
