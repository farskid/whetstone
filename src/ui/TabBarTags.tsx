import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Tag } from '../problems/types';
import { sortTags, TagChip } from './TagChips';

const GAP = 4; // keep in step with .tab-tags-row { gap }

/**
 * The problem's tags, docked in the tab bar once the ones in the description have scrolled away (and on the Solution tab,
 * which has none of its own). Takes whatever width the tabs leave, stays on one line, and ends with a "+N" chip for the
 * tags that don't fit; with no room even for one tag it shows only "+N", and with no room for that, nothing.
 * `duplicate`: the description's own row is still on the page, so this copy is hidden from screen readers and Tab.
 */
export function TabBarTags({ tags, show, duplicate, onMore }: { tags: Tag[]; show: boolean; duplicate: boolean; onMore: () => void }) {
  const sorted = useMemo(() => sortTags(tags), [tags]);
  const boxRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(sorted.length);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const measure = measureRef.current;
    if (!box || !measure) return;
    const compute = () => {
      const avail = box.clientWidth;
      const els = [...measure.children] as HTMLElement[];
      const widths = els.slice(0, sorted.length).map((e) => e.getBoundingClientRect().width);
      const plusW = els[sorted.length]?.getBoundingClientRect().width ?? 0;
      const total = widths.reduce((s, w) => s + w, 0) + GAP * Math.max(0, widths.length - 1);
      if (total <= avail) return setFit(sorted.length);
      let used = plusW;
      let k = 0;
      while (k < widths.length && used + widths[k] + GAP <= avail) used += widths[k++] + GAP;
      // k === 0: only "+N" if it fits, otherwise nothing (-1).
      setFit(k === 0 && plusW > avail ? -1 : k);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(box);
    ro.observe(measure); // chip widths change when the web font arrives
    return () => ro.disconnect();
  }, [sorted]);

  const shown = fit < 0 ? [] : sorted.slice(0, fit);
  const hidden = fit < 0 ? [] : sorted.slice(fit);
  const tab = duplicate || !show ? -1 : undefined;

  return (
    <div
      className={`tab-tags ${show ? 'on' : ''}`}
      ref={boxRef}
      aria-hidden={duplicate || !show ? true : undefined}
      aria-label={duplicate || !show ? undefined : 'Tags'}
      role={duplicate || !show ? undefined : 'group'}
      data-testid="tab-tags"
      data-fit={fit}
    >
      <div className="tab-tags-row">
        {shown.map((t) => <TagChip key={`${t.kind}:${t.name}`} tag={t} tabIndex={tab} />)}
        {hidden.length > 0 && (
          <button
            type="button"
            className="tchip tchip-more"
            title={`${fit === 0 ? 'Tags' : 'Also'}: ${hidden.map((t) => t.name).join(', ')}`}
            aria-label={`${hidden.length} more ${hidden.length === 1 ? 'tag' : 'tags'}: ${hidden.map((t) => t.name).join(', ')}. Show all tags`}
            tabIndex={tab}
            onClick={onMore}
            data-testid="tab-tags-more"
          >
            +{hidden.length}
          </button>
        )}
      </div>
      {/* Off-screen copy of every chip plus a "+N" chip, measured to decide how many fit. */}
      <div className="tab-tags-row tab-tags-measure" ref={measureRef} aria-hidden="true">
        {sorted.map((t) => <span key={`${t.kind}:${t.name}`} className={`tchip k-${t.kind}`}>{t.name}</span>)}
        <span className="tchip tchip-more">+{sorted.length}</span>
      </div>
    </div>
  );
}
