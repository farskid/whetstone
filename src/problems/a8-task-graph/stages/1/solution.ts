import type { Task, Report } from './types';

export function runTaskGraph(tasks: Task[]): Promise<Report> {
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
