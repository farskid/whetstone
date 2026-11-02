import type { Task, TaskStatus, Options, Report } from './types';

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

export async function runTaskGraph(tasks: Task[], options: Options = {}): Promise<Report> {
  const { concurrency = Infinity, failFast = false, targets, onEvent } = options;

  // ---- validation (nothing runs if this fails) ----
  const byId = new Map<string, Task>();
  const index = new Map<string, number>();
  tasks.forEach((t, i) => {
    if (byId.has(t.id)) throw new Error(`Duplicate task id "${t.id}"`);
    byId.set(t.id, t);
    index.set(t.id, i);
  });
  const depsOf = (id: string) => byId.get(id)!.deps ?? [];
  for (const t of tasks) {
    for (const d of t.deps ?? []) if (!byId.has(d)) throw new Error(`Unknown dependency "${d}" of task "${t.id}"`);
  }
  for (const id of targets ?? []) if (!byId.has(id)) throw new Error(`Unknown target "${id}"`);
  const cycle = findCycle(tasks.map((t) => t.id), depsOf);
  if (cycle) throw new Error(`Cycle: ${cycle.join(' -> ')}`);

  // ---- which tasks take part ----
  let included: Set<string>;
  if (targets) {
    included = new Set();
    const add = (id: string) => { if (included.has(id)) return; included.add(id); depsOf(id).forEach(add); };
    targets.forEach(add);
  } else {
    included = new Set(byId.keys());
  }
  const ids = [...included].sort((a, b) => index.get(a)! - index.get(b)!);

  const dependents = new Map<string, string[]>(ids.map((id) => [id, []]));
  const waitingOn = new Map<string, number>();
  for (const id of ids) {
    const deps = depsOf(id);
    waitingOn.set(id, deps.length);
    deps.forEach((d) => dependents.get(d)!.push(id));
  }

  const report: Report = { status: {}, results: {}, errors: {} };
  const controller = new AbortController();
  const ready = new Set(ids.filter((id) => waitingOn.get(id) === 0));
  let running = 0;
  let stopped = false;

  return new Promise<Report>((resolve) => {
    const settle = (id: string, status: TaskStatus) => {
      report.status[id] = status;
      onEvent?.({ type: status, id });
    };
    const skipDependents = (id: string) => {
      for (const dep of dependents.get(id)!) {
        if (report.status[dep] === undefined) { settle(dep, 'skipped'); skipDependents(dep); }
      }
    };
    const finishIfDone = () => {
      if (running > 0) return;
      if (stopped || ready.size === 0) {
        // Anything that never got a status was blocked by a failure.
        for (const id of ids) if (report.status[id] === undefined) settle(id, 'skipped');
        resolve(report);
      }
    };
    const pump = () => {
      while (!stopped && running < concurrency && ready.size > 0) {
        const id = [...ready].sort((a, b) => index.get(a)! - index.get(b)!)[0];
        ready.delete(id);
        start(id);
      }
      finishIfDone();
    };
    const start = (id: string) => {
      const task = byId.get(id)!;
      const results: Record<string, unknown> = {};
      for (const d of depsOf(id)) results[d] = report.results[d];
      running++;
      onEvent?.({ type: 'start', id });
      let p: Promise<unknown>;
      try { p = Promise.resolve(task.run({ results, signal: controller.signal })); } catch (e) { p = Promise.reject(e); }
      p.then(
        (value) => {
          running--;
          report.results[id] = value;
          settle(id, 'success');
          for (const dep of dependents.get(id)!) {
            const n = waitingOn.get(dep)! - 1;
            waitingOn.set(dep, n);
            if (n === 0 && report.status[dep] === undefined) ready.add(dep);
          }
          pump();
        },
        (err) => {
          running--;
          report.errors[id] = err;
          settle(id, 'failed');
          skipDependents(id);
          if (failFast && !stopped) {
            stopped = true;
            for (const r of ready) settle(r, 'skipped');
            ready.clear();
            controller.abort();
          }
          pump();
        },
      );
    };
    pump();
  });
}
