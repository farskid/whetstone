import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'b4-rolling-metrics',
  catalogId: 'B4',
  title: 'Rolling metrics window',
  theme: 'Data/Caches',
  difficulty: 'Medium',
  inspiredBy: 'Prometheus summaries',
  tags: [
    { kind: 'library', name: 'Prometheus' },
    { kind: 'pattern', name: 'Sliding window' },
    { kind: 'pattern', name: 'Ring buffer' },
    { kind: 'pattern', name: 'Percentiles' },
    { kind: 'pattern', name: 'Histogram' },
  ],
  summary: 'Count- and time-based sliding windows with avg, O(1) min/max, percentiles, and a bounded-memory histogram window.',
  stages: [
    { title: 'Ring buffer', summary: 'Last N numbers with push, toArray (oldest first), count and avg.' },
    { title: 'Percentiles and min/max', summary: 'percentile(p) over the window; min/max in amortized O(1) with a monotonic deque.' },
    { title: 'Time window', summary: 'The same API over the last windowMs on an injected clock.' },
    { title: 'Histogram window', summary: 'Fixed buckets per time slice for bounded memory and approximate percentiles.' },
  ],
};
