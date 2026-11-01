import type { Tag, TagKind } from '../problems/types';
import { href } from './router';

export const KIND_ORDER: TagKind[] = ['library', 'framework', 'company', 'pattern'];
export const KIND_LABEL: Record<TagKind, string> = { library: 'Libraries & tools', framework: 'Frameworks', company: 'Companies', pattern: 'Patterns' };

/** Small tag chips. Each one links to the problem list filtered by that tag (or clears the filter if it is the active one). */
export function TagChips({ tags, active }: { tags: Tag[]; active?: string | null }) {
  const sorted = [...tags].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  return (
    <span className="tag-chips">
      {sorted.map((t) => (
        <a
          key={`${t.kind}:${t.name}`}
          className={`tchip k-${t.kind} ${active === t.name ? 'on' : ''}`}
          href={href.list(active === t.name ? null : t.name)}
          title={active === t.name ? 'Clear tag filter' : `${t.kind}: show problems tagged ${t.name}`}
          data-testid="tag-chip"
        >
          {t.name}
        </a>
      ))}
    </span>
  );
}
