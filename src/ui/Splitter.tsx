import { useCallback, useRef } from 'react';

/** Arrow-key step (px); Shift moves further. */
const STEP = 16;

/**
 * A draggable divider. Reports the new size (px) of the panel before it. Focusable: the arrow keys along its axis move
 * it too (Shift for bigger steps).
 */
export function Splitter({ direction, onResize, getStart, label, testId }: {
  direction: 'horizontal' | 'vertical';
  onResize: (px: number) => void;
  getStart: () => number;
  label?: string;
  testId?: string;
}) {
  const dragging = useRef(false);
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    const startPos = direction === 'horizontal' ? e.clientX : e.clientY;
    const startSize = getStart();
    const move = (ev: PointerEvent) => {
      if (!dragging.current) return;
      const pos = direction === 'horizontal' ? ev.clientX : ev.clientY;
      onResize(startSize + pos - startPos);
    };
    const up = () => {
      dragging.current = false;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.classList.remove('resizing');
    };
    document.body.classList.add('resizing');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, [direction, onResize, getStart]);
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const [less, more] = direction === 'horizontal' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown'];
    if (e.key !== less && e.key !== more) return;
    e.preventDefault();
    const step = e.shiftKey ? STEP * 4 : STEP;
    onResize(getStart() + (e.key === more ? step : -step));
  }, [direction, onResize, getStart]);
  return (
    <div
      className={`splitter ${direction}`}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="separator"
      aria-label={label}
      aria-orientation={direction === 'horizontal' ? 'vertical' : 'horizontal'}
      data-testid={testId}
    />
  );
}
