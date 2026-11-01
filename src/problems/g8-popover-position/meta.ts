import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'g8-popover-position',
  catalogId: 'G8',
  title: 'Popover positioning',
  theme: 'Browser/UI',
  difficulty: 'Hard',
  inspiredBy: 'Floating UI (computePosition and middleware)',
  summary: 'Place a tooltip or popover next to its anchor: 12 placements with RTL, overflow detection, and a middleware pipeline with offset, flip (with a best-fit fallback), shift, arrow and autoPlacement, plus capped resets.',
  stages: [
    { title: 'Placements', summary: 'Coordinates for the four sides and their start/end alignments, RTL-aware.' },
    { title: 'Pipeline and offset', summary: 'Run middleware in order, merge their data, offset along both axes, detect overflow.' },
    { title: 'Flip and shift', summary: 'Try the opposite side or fallbacks, fall back to the least overflow, then slide into view.' },
    { title: 'Arrow and autoPlacement', summary: 'Point the arrow at the anchor and pick the side with the most room.' },
  ],
};
