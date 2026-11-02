import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react';

/**
 * The size of the read-only types.ts editor next to the solution, as a fraction of the editor area. Side by side it is a
 * width, stacked (a narrow editor area) a height; each layout keeps its own fraction. Saved in localStorage under its own
 * key, apart from progress (a layout preference, not something to export or reset with progress).
 */
const KEY = 'practical:layout';
/** The editor area stacks the two files below this width (px). */
export const STACK_BELOW = 640;
const DEFAULTS = { typesW: 0.38, typesH: 0.4 };
/** Smallest types.ts and solution sizes (px), per layout. */
const MIN = { row: { types: 160, solution: 240 }, stacked: { types: 90, solution: 120 } };

type Layout = typeof DEFAULTS;

function load(): Layout {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {};
    const frac = (v: unknown, d: number) => (typeof v === 'number' && v > 0 && v < 1 ? v : d);
    return { typesW: frac(raw.typesW, DEFAULTS.typesW), typesH: frac(raw.typesH, DEFAULTS.typesH) };
  } catch { return { ...DEFAULTS }; }
}

/** Tracks whether `wrap` is stacked and the types fraction for that layout; `resize(px)` sets the types size. */
export function useEditorSplit(wrap: RefObject<HTMLElement | null>, active: boolean) {
  const [layout, setLayout] = useState(load);
  const [stacked, setStacked] = useState(false);
  const [size, setSize] = useState(0);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el || !active) return;
    const measure = () => {
      const s = el.clientWidth <= STACK_BELOW;
      setStacked(s);
      setSize(s ? el.clientHeight : el.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [wrap, active]);

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(layout)); } catch { /* quota or private mode */ } }, [layout]);

  const min = stacked ? MIN.stacked : MIN.row;
  /** Clamp a fraction to the min sizes; when the area is too small for both, split it evenly. */
  const clamp = useCallback((f: number) => {
    if (!size) return f;
    if (size < min.types + min.solution) return 0.5;
    return Math.min(1 - min.solution / size, Math.max(min.types / size, f));
  }, [size, min]);

  const fraction = clamp(stacked ? layout.typesH : layout.typesW);
  const resize = useCallback((px: number) => {
    const el = wrap.current;
    const total = el ? (stacked ? el.clientHeight : el.clientWidth) : size;
    if (!total) return;
    const f = clamp(px / total);
    setLayout((l) => (stacked ? { ...l, typesH: f } : { ...l, typesW: f }));
  }, [wrap, stacked, size, clamp]);

  return { stacked, fraction, resize };
}
