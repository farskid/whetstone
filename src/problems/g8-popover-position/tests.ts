import type { TestCase } from '../../runner/types';
import type { Middleware, Placement, Rect } from './types';
type M = typeof import('./solution');

const V: Rect = { x: 0, y: 0, width: 400, height: 300 };
const R: Rect = { x: 100, y: 100, width: 40, height: 20 };
const F = { width: 80, height: 30 };
const at = (r: { x: number; y: number; placement?: string }) => [r.x, r.y];

function rng(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

export const tests: TestCase<M>[] = [
  {
    group: 'Placements',
    title: 'four sides, centred',
    input: 'reference 40×20 at (100, 100); floating 80×30',
    run({ computePosition }, { expect }) {
      const pos = (placement: Placement) => at(computePosition(R, F, { placement, viewport: V }));
      expect(at(computePosition(R, F, { viewport: V })), 'bottom by default').toEqual([80, 120]);
      expect(pos('top')).toEqual([80, 70]);
      expect(pos('right')).toEqual([140, 95]);
      expect(pos('left')).toEqual([20, 95]);
      const r = computePosition(R, F, { placement: 'left', viewport: V });
      expect([r.placement, r.middlewareData]).toEqual(['left', {}]);
    },
  },
  {
    group: 'Placements',
    title: 'start and end alignments, and RTL',
    run({ computePosition }, { expect }) {
      const pos = (placement: Placement, rtl = false) => at(computePosition(R, F, { placement, viewport: V, rtl }));
      expect(pos('bottom-start')).toEqual([100, 120]);
      expect(pos('top-end')).toEqual([60, 70]);
      expect(pos('right-start')).toEqual([140, 100]);
      expect(pos('left-end')).toEqual([20, 90]);
      expect(pos('bottom-start', true), 'RTL swaps start and end').toEqual([60, 120]);
      expect(pos('top-end', true)).toEqual([100, 70]);
      expect(pos('bottom', true)).toEqual([80, 120]);
      expect(pos('right-start', true), 'but not on the left and right sides').toEqual([140, 100]);
    },
  },
  {
    group: 'Pipeline and offset',
    title: 'offset along the main and cross axes',
    run({ computePosition, offset }, { expect }) {
      const pos = (placement: Placement, m: Middleware, rtl = false) => at(computePosition(R, F, { placement, viewport: V, middleware: [m], rtl }));
      expect(pos('bottom', offset(8))).toEqual([80, 128]);
      expect(pos('top', offset(8))).toEqual([80, 62]);
      expect(pos('left', offset(8))).toEqual([12, 95]);
      expect(pos('right', offset(8))).toEqual([148, 95]);
      expect(pos('bottom', offset({ mainAxis: 4, crossAxis: 10 }))).toEqual([90, 124]);
      expect(pos('bottom', offset({ mainAxis: 4, crossAxis: 10 }), true)).toEqual([70, 124]);
      expect(pos('right', offset({ crossAxis: 10 }))).toEqual([140, 105]);
      const r = computePosition(R, F, { placement: 'top', viewport: V, middleware: [offset({ mainAxis: 8, crossAxis: 2 })] });
      expect(r.middlewareData.offset).toEqual({ x: 2, y: -8 });
    },
  },
  {
    group: 'Pipeline and offset',
    title: 'detectOverflow measures every edge',
    run({ detectOverflow }, { expect }) {
      const state = { x: -10, y: 280, rects: { reference: R, floating: { x: 0, y: 0, ...F } }, viewport: { x: 0, y: 0, width: 400, height: 300 } };
      expect(detectOverflow(state)).toEqual({ top: -280, right: -330, bottom: 10, left: 10 });
      expect(detectOverflow(state, { padding: 5 })).toEqual({ top: -275, right: -325, bottom: 15, left: 15 });
      const shifted = { ...state, x: 50, y: 50, viewport: { x: 100, y: 20, width: 100, height: 100 } };
      expect(detectOverflow(shifted), 'a viewport that is not at the origin').toEqual({ top: -30, right: -70, bottom: -40, left: 50 });
    },
  },
  {
    group: 'Pipeline and offset',
    title: 'middleware run in order, merge data, and resets restart the pipeline',
    run({ computePosition }, { expect }) {
      const seen: string[] = [];
      const a: Middleware = { name: 'a', fn: ({ x, placement }) => { seen.push(`a ${placement} ${x}`); return { x: x + 1, data: { calls: seen.length } }; } };
      const b: Middleware = {
        name: 'b',
        fn: ({ x, placement, middlewareData }) => {
          seen.push(`b ${placement} ${x}`);
          if (placement === 'bottom') return { data: { first: true }, reset: { placement: 'top' } };
          return { data: { saw: middlewareData.b.first } };
        },
      };
      const quiet: Middleware = { name: 'quiet', fn: () => {} };
      const r = computePosition(R, F, { viewport: V, middleware: [a, b, quiet] });
      expect(seen, 'b sees a\'s x; the reset recomputes from the placement').toEqual(['a bottom 80', 'b bottom 81', 'a top 80', 'b top 81']);
      expect(at(r)).toEqual([81, 70]);
      expect(r.placement).toBe('top');
      expect(r.middlewareData).toEqual({ a: { calls: 3 }, b: { first: true, saw: true }, quiet: {} });
      let calls = 0;
      const loop: Middleware = { name: 'loop', fn: () => { calls++; return { reset: true }; } };
      const done = computePosition(R, F, { viewport: V, middleware: [loop] });
      expect(calls, '50 resets, then the 51st reset is ignored').toBe(51);
      expect(at(done)).toEqual([80, 120]);
    },
  },
  {
    group: 'Flip and shift',
    title: 'flip moves to the opposite side when it overflows',
    run({ computePosition, flip, offset }, { expect }) {
      const low: Rect = { x: 100, y: 270, width: 40, height: 20 };
      const r = computePosition(low, F, { viewport: V, middleware: [offset(8), flip()] });
      expect([r.placement, ...at(r)]).toEqual(['top', 80, 232]);
      expect(r.middlewareData.flip.overflows).toEqual([{ placement: 'bottom', overflow: 28 }]);
      const s = computePosition(low, F, { placement: 'bottom-start', viewport: V, middleware: [flip()] });
      expect(s.placement, 'alignment is kept').toBe('top-start');
      const fits = computePosition(R, F, { viewport: V, middleware: [flip({ padding: 5 })] });
      expect([fits.placement, fits.middlewareData.flip]).toEqual(['bottom', {}]);
      const corner = computePosition({ x: 0, y: 100, width: 40, height: 20 }, F, { viewport: V, middleware: [flip()] });
      expect([corner.placement, corner.middlewareData.flip], 'overflowing the left edge is not a reason to flip').toEqual(['bottom', {}]);
      const tight = computePosition({ x: 100, y: 195, width: 40, height: 20 }, F, { viewport: V, middleware: [flip({ padding: 10 })] });
      expect(tight.placement, 'bottom edge at 245 fits inside 300 − 10').toBe('bottom');
      const tighter = computePosition({ x: 100, y: 245, width: 40, height: 20 }, F, { viewport: V, middleware: [flip({ padding: 10 })] });
      expect(tighter.placement, 'bottom edge at 295 does not fit inside 290').toBe('top');
    },
  },
  {
    group: 'Flip and shift',
    title: 'when nothing fits, flip settles on the least overflow',
    input: 'viewport 400×100, floating 80×50',
    run({ computePosition, flip }, { expect }) {
      const vp: Rect = { x: 0, y: 0, width: 400, height: 100 };
      const tall = { width: 80, height: 50 };
      const a = computePosition({ x: 100, y: 45, width: 40, height: 20 }, tall, { viewport: vp, middleware: [flip()] });
      expect([a.placement, a.y]).toEqual(['top', -5]);
      const b = computePosition({ x: 100, y: 35, width: 40, height: 20 }, tall, { viewport: vp, middleware: [flip()] });
      expect([b.placement, b.y], 'back to bottom, which overflows less').toEqual(['bottom', 55]);
      expect(b.middlewareData.flip.overflows).toEqual([{ placement: 'bottom', overflow: 5 }, { placement: 'top', overflow: 15 }]);
      const c = computePosition({ x: 100, y: 40, width: 40, height: 20 }, tall, { viewport: vp, middleware: [flip()] });
      expect(c.placement, 'a tie keeps the earliest').toBe('bottom');
    },
  },
  {
    group: 'Flip and shift',
    title: 'fallbackPlacements replace the opposite side',
    run({ computePosition, flip }, { expect }) {
      const ref: Rect = { x: 330, y: 10, width: 40, height: 20 };
      const r = computePosition(ref, F, { placement: 'top', viewport: V, middleware: [flip({ fallbackPlacements: ['right', 'left'] })] });
      expect(r.placement, 'top and right overflow; bottom is never tried').toBe('left');
      expect(at(r)).toEqual([250, 5]);
      expect(r.middlewareData.flip.overflows.map((o: { placement: string }) => o.placement)).toEqual(['top', 'right']);
    },
  },
  {
    group: 'Flip and shift',
    title: 'shift slides along the cross axis',
    run({ computePosition, shift }, { expect }) {
      const pos = (ref: Rect, placement: Placement, floating = F, padding?: number) => {
        const r = computePosition(ref, floating, { placement, viewport: V, middleware: [shift(padding === undefined ? {} : { padding })] });
        return [r.x, r.y, r.middlewareData.shift.x, r.middlewareData.shift.y];
      };
      expect(pos({ x: 0, y: 100, width: 40, height: 20 }, 'bottom')).toEqual([0, 120, 20, 0]);
      expect(pos({ x: 0, y: 100, width: 40, height: 20 }, 'bottom', F, 5)).toEqual([5, 120, 25, 0]);
      expect(pos({ x: 380, y: 100, width: 40, height: 20 }, 'top')).toEqual([320, 70, -40, 0]);
      expect(pos(R, 'bottom'), 'nothing to do').toEqual([80, 120, 0, 0]);
      expect(pos({ x: 100, y: 0, width: 40, height: 20 }, 'right')).toEqual([140, 0, 0, 5]);
      expect(pos({ x: 100, y: 290, width: 40, height: 20 }, 'left-start', F, 4)).toEqual([20, 266, 0, -24]);
      expect(pos(R, 'bottom', { width: 500, height: 30 }, 10), 'too wide: pinned to the start').toEqual([10, 120, 140, 0]);
    },
  },
  {
    group: 'Arrow and autoPlacement',
    title: 'the arrow points at the reference, clamped',
    run({ computePosition, shift, arrow }, { expect }) {
      const plain = computePosition(R, F, { viewport: V, middleware: [arrow({ size: 10 })] });
      expect(plain.middlewareData.arrow).toEqual({ x: 35, centerOffset: 0 });
      const edge = computePosition({ x: 0, y: 100, width: 40, height: 20 }, F, { viewport: V, middleware: [shift(), arrow({ size: 10 })] });
      expect(edge.middlewareData.arrow, 'measured after the shift').toEqual({ x: 15, centerOffset: 0 });
      const tiny = computePosition({ x: 0, y: 100, width: 10, height: 20 }, F, { viewport: V, middleware: [shift(), arrow({ size: 10, padding: 8 })] });
      expect(tiny.middlewareData.arrow).toEqual({ x: 8, centerOffset: -8 });
      const side = computePosition(R, F, { placement: 'right-start', viewport: V, middleware: [arrow({ size: 10, padding: 2 })] });
      expect(side.middlewareData.arrow).toEqual({ y: 5, centerOffset: 0 });
      const far = computePosition({ x: 100, y: 100, width: 300, height: 20 }, F, { placement: 'bottom-start', viewport: { x: 0, y: 0, width: 1000, height: 300 }, middleware: [arrow({ size: 10, padding: 4 })] });
      expect(far.middlewareData.arrow).toEqual({ x: 66, centerOffset: 79 });
    },
  },
  {
    group: 'Arrow and autoPlacement',
    title: 'autoPlacement picks the side with the most room',
    run({ computePosition, autoPlacement }, { expect }) {
      const ref: Rect = { x: 300, y: 20, width: 40, height: 20 };
      const a = computePosition(ref, F, { viewport: V, middleware: [autoPlacement()] });
      expect(a.placement).toBe('left');
      const b = computePosition(ref, F, { viewport: V, middleware: [autoPlacement({ alignment: 'start' })] });
      expect([b.placement, ...at(b)]).toEqual(['left-start', 220, 20]);
      const c = computePosition(ref, F, { placement: 'top', viewport: V, middleware: [autoPlacement({ allowedSides: ['top', 'bottom'] })] });
      expect(c.placement).toBe('bottom');
      const centre = computePosition({ x: 180, y: 140, width: 40, height: 20 }, F, { viewport: V, middleware: [autoPlacement({ allowedSides: ['bottom', 'top'] })] });
      expect(centre.placement, 'a tie takes the earliest allowed side').toBe('bottom');
    },
  },
  {
    group: 'Arrow and autoPlacement',
    title: 'random anchors: offset + flip + shift keep the popover in view',
    input: '200 seeded random references',
    run({ computePosition, offset, flip, shift, getSide }, { expect }) {
      const rand = rng(11);
      const sides: Placement[] = ['top', 'bottom', 'left-start', 'right-end'];
      for (let t = 0; t < 200; t++) {
        const ref: Rect = { x: Math.floor(rand() * 380), y: Math.floor(rand() * 280), width: 20, height: 20 };
        const placement = sides[t % 4];
        const r = computePosition(ref, F, { placement, viewport: V, middleware: [offset(4), flip({ padding: 4 }), shift({ padding: 4 })] });
        const vertical = getSide(r.placement) === 'top' || getSide(r.placement) === 'bottom';
        const lo = 4;
        const hi = (vertical ? V.width - F.width : V.height - F.height) - 4;
        const cross = vertical ? r.x : r.y;
        expect(cross >= lo && cross <= hi, `case ${t}: cross axis inside the padded viewport`).toBe(true);
        expect([getSide(placement), { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[getSide(placement)]], `case ${t}`).toContain(getSide(r.placement));
        const gap = { top: ref.y - (r.y + F.height), bottom: r.y - (ref.y + ref.height), left: ref.x - (r.x + F.width), right: r.x - (ref.x + ref.width) }[getSide(r.placement)];
        expect(gap, `case ${t}: still 4px from the anchor`).toBe(4);
      }
    },
  },
];
