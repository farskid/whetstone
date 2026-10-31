import { useCallback, useRef } from 'react';

/** A draggable divider. Reports the new size (px) of the panel before it. */
export function Splitter({ direction, onResize, getStart }: {
  direction: 'horizontal' | 'vertical';
  onResize: (px: number) => void;
  getStart: () => number;
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
  return <div className={`splitter ${direction}`} onPointerDown={onPointerDown} role="separator" aria-orientation={direction === 'horizontal' ? 'vertical' : 'horizontal'} />;
}
