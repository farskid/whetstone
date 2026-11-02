import type { Side, Alignment, Placement, Rect, MiddlewareState, Middleware, ComputeOptions, ComputeResult, Overflow } from './types';

const MAX_RESETS = 50;

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
