import type { Task, Report } from './types';

function findCycle(order: string[], depsOf: (id: string) => string[]): string[] | null {
  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];
  const visit = (id: string): string[] | null => {
    state.set(id, 'visiting');
    stack.push(id);
    for (const d of depsOf(id)) {
      const s = state.get(d);
      if (s === 'visiting') return [...stack.slice(stack.indexOf(d)), d];
      if (s === undefined) { const c = visit(d); if (c) return c; }
    }
    stack.pop();
    state.set(id, 'done');
    return null;
  };
  for (const id of order) {
    if (!state.has(id)) { const c = visit(id); if (c) return c; }
  }
  return null;
}

export async function runTaskGraph(tasks: Task[]): Promise<Report> {
  const ids = new Set<string>();
  for (const t of tasks) {
    if (ids.has(t.id)) throw new Error(`Duplicate task id "${t.id}"`);
    ids.add(t.id);
  }
  for (const t of tasks) {
    for (const d of t.deps ?? []) if (!ids.has(d)) throw new Error(`Unknown dependency "${d}" of task "${t.id}"`);
  }
  const depsById = new Map(tasks.map((t) => [t.id, t.deps ?? []]));
  const cycle = findCycle(tasks.map((t) => t.id), (id) => depsById.get(id)!);
  if (cycle) throw new Error(`Cycle: ${cycle.join(' -> ')}`);

  const report: Report = { status: {}, results: {}, errors: {} };
  const dependents = new Map<string, string[]>(tasks.map((t) => [t.id, []]));
  const waitingOn = new Map<string, number>();
  for (const t of tasks) {
    const deps = t.deps ?? [];
    waitingOn.set(t.id, deps.length);
    deps.forEach((d) => dependents.get(d)!.push(t.id));
  }
  const byId = new Map(tasks.map((t) => [t.id, t]));
  let left = tasks.length;

  return new Promise<Report>((resolve, reject) => {
    if (left === 0) return resolve(report);
    const start = (task: Task) => {
      const results: Record<string, unknown> = {};
      for (const d of task.deps ?? []) results[d] = report.results[d];
      Promise.resolve(task.run({ results })).then((value) => {
        report.results[task.id] = value;
        report.status[task.id] = 'success';
        for (const dep of dependents.get(task.id)!) {
          const n = waitingOn.get(dep)! - 1;
          waitingOn.set(dep, n);
          if (n === 0) start(byId.get(dep)!);
        }
        if (--left === 0) resolve(report);
      }, reject);
    };
    tasks.filter((t) => waitingOn.get(t.id) === 0).forEach(start);
  });
}
