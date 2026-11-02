import type { Side, Alignment, Placement, Rect, ComputeOptions, ComputeResult } from './types';

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

export function computePosition(reference: Rect, floating: { width: number; height: number }, options: ComputeOptions): ComputeResult {
  const placement = options.placement ?? 'bottom';
  const { x, y } = coordsFor(reference, { x: 0, y: 0, width: floating.width, height: floating.height }, placement, options.rtl ?? false);
  return { x, y, placement, middlewareData: {} };
}
