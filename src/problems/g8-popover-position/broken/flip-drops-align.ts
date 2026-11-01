// Bug: flip drops the alignment
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

const MAX_RESETS = 50;
const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

export function getSide(p: Placement): Side {
  return p.split('-')[0] as Side;
}

export function getAlignment(p: Placement): Alignment | undefined {
  return p.split('-')[1] as Alignment | undefined;
}

const isVertical = (side: Side) => side === 'top' || side === 'bottom';

function coordsFor(reference: Rect, floating: Rect, placement: Placement, rtl: boolean): { x: number; y: number } {
  const side = getSide(placement);
  let align = getAlignment(placement);
  const centerX = reference.x + reference.width / 2 - floating.width / 2;
  const centerY = reference.y + reference.height / 2 - floating.height / 2;
  if (isVertical(side)) {
    if (rtl && align) align = align === 'start' ? 'end' : 'start';
    const y = side === 'top' ? reference.y - floating.height : reference.y + reference.height;
    const x = align === 'start' ? reference.x : align === 'end' ? reference.x + reference.width - floating.width : centerX;
    return { x, y };
  }
  const x = side === 'left' ? reference.x - floating.width : reference.x + reference.width;
  const y = align === 'start' ? reference.y : align === 'end' ? reference.y + reference.height - floating.height : centerY;
  return { x, y };
}

export function detectOverflow(state: Pick<MiddlewareState, 'x' | 'y' | 'rects' | 'viewport'>, options: { padding?: number } = {}): Overflow {
  const p = options.padding ?? 0;
  const { x, y, viewport: v } = state;
  const { width, height } = state.rects.floating;
  return {
    top: v.y + p - y,
    bottom: y + height - (v.y + v.height - p),
    left: v.x + p - x,
    right: x + width - (v.x + v.width - p),
  };
}

export function computePosition(reference: Rect, floating: { width: number; height: number }, options: ComputeOptions): ComputeResult {
  const { middleware = [], viewport, rtl = false } = options;
  const initialPlacement = options.placement ?? 'bottom';
  const rects = { reference, floating: { x: 0, y: 0, width: floating.width, height: floating.height } };
  let placement = initialPlacement;
  let { x, y } = coordsFor(reference, rects.floating, placement, rtl);
  const middlewareData: Record<string, any> = {};
  let resets = 0;

  for (let i = 0; i < middleware.length; i++) {
    const { name, fn } = middleware[i];
    const res = fn({ x, y, placement, initialPlacement, rects, viewport, rtl, middlewareData }) || {};
    x = res.x ?? x;
    y = res.y ?? y;
    middlewareData[name] = { ...middlewareData[name], ...res.data };
    if (res.reset && resets < MAX_RESETS) {
      resets++;
      if (typeof res.reset === 'object' && res.reset.placement) placement = res.reset.placement;
      ({ x, y } = coordsFor(reference, rects.floating, placement, rtl));
      i = -1;
    }
  }
  return { x, y, placement, middlewareData };
}

export function offset(value: number | { mainAxis?: number; crossAxis?: number }): Middleware {
  const { mainAxis = 0, crossAxis = 0 } = typeof value === 'number' ? { mainAxis: value } : value;
  return {
    name: 'offset',
    fn({ x, y, placement, rtl }) {
      const side = getSide(placement);
      const main = side === 'top' || side === 'left' ? -mainAxis : mainAxis;
      if (isVertical(side)) return { x: x + (rtl ? -crossAxis : crossAxis), y: y + main, data: { x: rtl ? -crossAxis : crossAxis, y: main } };
      return { x: x + main, y: y + crossAxis, data: { x: main, y: crossAxis } };
    },
  };
}

export function flip(options: { padding?: number; fallbackPlacements?: Placement[] } = {}): Middleware {
  return {
    name: 'flip',
    fn(state) {
      const data = state.middlewareData.flip ?? {};
      if (data.done) return;
      const index: number = data.index ?? 0;
      const overflows: { placement: Placement; overflow: number }[] = data.overflows ?? [];
      const first = state.initialPlacement;
      const align = getAlignment(first);
      const opposite = OPPOSITE[getSide(first)] as Placement;
      const list = [first, ...(options.fallbackPlacements ?? [opposite])];
      const over = detectOverflow(state, options)[getSide(state.placement)];
      if (over <= 0) return;
      const all = [...overflows, { placement: state.placement, overflow: over }];
      const next = index + 1;
      if (next < list.length) return { data: { index: next, overflows: all }, reset: { placement: list[next] } };
      const best = all.reduce((a, b) => (b.overflow < a.overflow ? b : a));
      const done = { index: next, overflows: all, done: true };
      return best.placement === state.placement ? { data: done } : { data: done, reset: { placement: best.placement } };
    },
  };
}

export function shift(options: { padding?: number } = {}): Middleware {
  const padding = options.padding ?? 0;
  return {
    name: 'shift',
    fn({ x, y, placement, rects, viewport: v }) {
      const vertical = isVertical(getSide(placement));
      const pos = vertical ? x : y;
      const lo = (vertical ? v.x : v.y) + padding;
      const hi = (vertical ? v.x + v.width : v.y + v.height) - padding - (vertical ? rects.floating.width : rects.floating.height);
      const next = hi < lo ? lo : Math.min(Math.max(pos, lo), hi);
      return vertical ? { x: next, data: { x: next - pos, y: 0 } } : { y: next, data: { x: 0, y: next - pos } };
    },
  };
}

export function arrow(options: { size: number; padding?: number }): Middleware {
  const { size, padding = 0 } = options;
  return {
    name: 'arrow',
    fn({ x, y, placement, rects }) {
      const vertical = isVertical(getSide(placement));
      const ref = rects.reference;
      const length = vertical ? rects.floating.width : rects.floating.height;
      const center = vertical ? ref.x + ref.width / 2 - x - size / 2 : ref.y + ref.height / 2 - y - size / 2;
      const max = Math.max(padding, length - size - padding);
      const at = Math.min(Math.max(center, padding), max);
      return { data: { [vertical ? 'x' : 'y']: at, centerOffset: center - at } };
    },
  };
}

export function autoPlacement(options: { alignment?: Alignment; allowedSides?: Side[] } = {}): Middleware {
  const sides = options.allowedSides ?? ['top', 'right', 'bottom', 'left'];
  return {
    name: 'autoPlacement',
    fn({ placement, rects: { reference: r }, viewport: v }) {
      const space: Record<Side, number> = {
        top: r.y - v.y,
        bottom: v.y + v.height - (r.y + r.height),
        left: r.x - v.x,
        right: v.x + v.width - (r.x + r.width),
      };
      const side = sides.reduce((a, b) => (space[b] > space[a] ? b : a));
      const chosen = (options.alignment ? `${side}-${options.alignment}` : side) as Placement;
      if (chosen !== placement) return { reset: { placement: chosen } };
    },
  };
}
