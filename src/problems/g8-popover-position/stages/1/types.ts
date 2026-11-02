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

export interface ComputeOptions {
  /** Default 'bottom'. */
  placement?: Placement;
  /** Not used until a later stage. */
  viewport: Rect;
  rtl?: boolean;
}

export interface ComputeResult {
  x: number;
  y: number;
  placement: Placement;
  /** Always {} in this stage. */
  middlewareData: Record<string, any>;
}
