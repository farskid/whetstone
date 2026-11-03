import type { Tag, TagKind } from '../problems/types';
import { href } from './router';

export const KIND_ORDER: TagKind[] = ['library', 'framework', 'company', 'pattern'];
export const KIND_LABEL: Record<TagKind, string> = { library: 'Libraries & tools', framework: 'Frameworks', company: 'Companies', pattern: 'Patterns' };

/** Tags in display order: libraries, frameworks, companies, then patterns. */
export const sortTags = (tags: Tag[]) => [...tags].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));

/** One tag chip, linking to the problem list filtered by that tag (or clearing the filter if it is the active one). */
export function TagChip({ tag: t, active, tabIndex }: { tag: Tag; active?: string | null; tabIndex?: number }) {
  return (
    <a
      className={`tchip k-${t.kind} ${active === t.name ? 'on' : ''}`}
      href={href.list(active === t.name ? null : t.name)}
      title={active === t.name ? 'Clear tag filter' : `${t.kind}: show problems tagged ${t.name}`}
      tabIndex={tabIndex}
      data-testid="tag-chip"
    >
      {t.name}
    </a>
  );
}

/** Small tag chips. Each one links to the problem list filtered by that tag (or clears the filter if it is the active one). */
export function TagChips({ tags, active }: { tags: Tag[]; active?: string | null }) {
  return (
    <span className="tag-chips">
      {sortTags(tags).map((t) => <TagChip key={`${t.kind}:${t.name}`} tag={t} active={active} />)}
    </span>
  );
}
