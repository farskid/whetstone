// Broken: Kahn's algorithm without failure propagation. Dependents of a failed task
// still run, cycle message is generic, and failFast is ignored.
import type { Options, Report, Task } from '../types';
export type { Options, Report, Task } from '../types';

export async function runTaskGraph(tasks: Task[], options: Options = {}): Promise<Report> {
  const report: Report = { status: {}, results: {}, errors: {} };
  const done = new Set<string>();
  const ac = new AbortController();
  let remaining = [...tasks];
  while (remaining.length) {
    const ready = remaining.filter((t) => (t.deps ?? []).every((d) => done.has(d)));
    if (!ready.length) throw new Error('Cycle detected');
    remaining = remaining.filter((t) => !ready.includes(t));
    await Promise.all(ready.map(async (t) => {
      options.onEvent?.({ type: 'start', id: t.id });
      const results: Record<string, unknown> = {};
      for (const d of t.deps ?? []) results[d] = report.results[d];
      try {
        report.results[t.id] = await t.run({ results, signal: ac.signal });
        report.status[t.id] = 'success';
      } catch (e) {
        report.errors[t.id] = e;
        report.status[t.id] = 'failed';
      }
      options.onEvent?.({ type: report.status[t.id], id: t.id });
      done.add(t.id);
    }));
  }
  return report;
}
