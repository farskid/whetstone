export type Values = Record<string, any>;
export type Errors = Record<string, string>;
export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}
export interface FieldConfig {
  validate?: (value: any, values: Values) => string | undefined;
  asyncValidate?: (value: any, values: Values) => Promise<string | undefined>;
  debounceMs?: number;
}
export interface FormOptions {
  initialValues: Values;
  validate?: (values: Values) => Errors;
  fields?: Record<string, FieldConfig>;
  clock?: Clock;
}
export interface SubmitResult { ok: boolean; errors: Errors }

export interface Form {
  readonly values: Values;
  getValue(path: string): any;
  setValue(path: string, value: any): void;
  touch(path: string): void;
  isTouched(path: string): boolean;
  isDirty(path?: string): boolean;
  readonly errors: Errors;
  readonly isValid: boolean;
  readonly isValidating: boolean;
  submit(onSubmit?: (values: Values) => unknown): Promise<SubmitResult>;
  reset(values?: Values): void;
  append(path: string, item: any): void;
  remove(path: string, index: number): void;
  move(path: string, from: number, to: number): void;
  ids(path: string): string[];
}

const split = (path: string) => (path === '' ? [] : path.split('.'));
const isContainer = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null;

function getIn(obj: any, segs: string[]): any {
  let cur = obj;
  for (const s of segs) {
    if (!isContainer(cur)) return undefined;
    cur = cur[s];
  }
  return cur;
}

function setIn(obj: any, segs: string[], value: any): any {
  if (segs.length === 0) return value;
  const [head, ...rest] = segs;
  const isIndex = /^\d+$/.test(head);
  const base = isContainer(obj) ? obj : isIndex ? [] : {};
  const copy: any = Array.isArray(base) ? base.slice() : { ...base };
  copy[head] = setIn((base as any)[head], rest, value);
  return copy;
}

function deepEqual(a: any, b: any): boolean {
  if (Object.is(a, b)) return true;
  if (!isContainer(a) || !isContainer(b) || Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
}

function matches(pattern: string, path: string): boolean {
  const p = split(pattern);
  const s = split(path);
  return p.length === s.length && p.every((seg, i) => seg === '*' || seg === s[i]);
}

function allPaths(v: any, prefix: string, out: string[]) {
  if (!isContainer(v)) return;
  for (const k of Object.keys(v)) {
    const p = prefix ? `${prefix}.${k}` : k;
    out.push(p);
    allPaths(v[k], p, out);
  }
}

export function createForm(options: FormOptions): Form {
  const clock: Clock = options.clock ?? { now: () => Date.now(), setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: (h) => clearTimeout(h as any) };
  const fields = options.fields ?? {};
  let initial = options.initialValues;
  let values = initial;
  let nextId = 0;
  let arrayIds = new Map<string, string[]>(); // stable array path -> ids
  let touched = new Set<string>();
  let asyncErrors = new Map<string, string>();
  interface Pending { token: number; timer?: unknown; promise?: Promise<void>; run(): void }
  let pending = new Map<string, Pending>();
  let tokenSeq = 0;

  const fieldFor = (path: string): FieldConfig | undefined => {
    for (const [pattern, cfg] of Object.entries(fields)) if (matches(pattern, path)) return cfg;
    return undefined;
  };

  function idsFor(stableArrayPath: string, arr: unknown[]): string[] {
    let ids = arrayIds.get(stableArrayPath);
    if (!ids || ids.length !== arr.length) {
      ids = arr.map(() => `id${nextId++}`);
      arrayIds.set(stableArrayPath, ids);
    }
    return ids;
  }

  /** Index path -> stable path (array indices replaced by item ids). */
  function stable(path: string): string {
    const out: string[] = [];
    let cur: any = values;
    for (const seg of split(path)) {
      if (Array.isArray(cur)) {
        const ids = idsFor(out.join('.'), cur);
        out.push(ids[Number(seg)] ?? `missing${seg}`);
      } else out.push(seg);
      cur = isContainer(cur) ? cur[seg] : undefined;
    }
    return out.join('.');
  }

  const isUnder = (p: string, prefix: string) => p === prefix || p.startsWith(prefix + '.');

  function cancelUnder(stablePrefix: string) {
    for (const [key, p] of pending) {
      if (isUnder(key, stablePrefix)) {
        clock.clearTimeout(p.timer);
        pending.delete(key);
      }
    }
    for (const key of [...asyncErrors.keys()]) if (isUnder(key, stablePrefix)) asyncErrors.delete(key);
  }

  function scheduleAsync(path: string, immediate: boolean) {
    const cfg = fieldFor(path);
    if (!cfg?.asyncValidate) return;
    const key = stable(path);
    const old = pending.get(key);
    if (old) clock.clearTimeout(old.timer);
    const token = ++tokenSeq;
    const entry: Pending = {
      token,
      run() {
        entry.timer = undefined;
        const value = getIn(values, split(path));
        entry.promise = new Promise<string | undefined>((resolve) => resolve(cfg.asyncValidate!(value, values)))
          .then((err) => err, (e) => (e instanceof Error ? e.message : String(e)))
          .then((err) => {
            if (pending.get(key)?.token !== token) return;
            pending.delete(key);
            if (err) asyncErrors.set(key, err);
            else asyncErrors.delete(key);
          });
      },
    };
    pending.set(key, entry);
    asyncErrors.delete(key);
    const delay = cfg.debounceMs ?? 0;
    if (immediate || delay <= 0) entry.run();
    else entry.timer = clock.setTimeout(() => entry.run(), delay);
  }

  function computeErrors(): Errors {
    const out: Errors = {};
    const paths: string[] = [];
    allPaths(values, '', paths);
    for (const path of paths) {
      const cfg = fieldFor(path);
      if (!cfg) continue;
      const sync = cfg.validate?.(getIn(values, split(path)), values);
      if (sync) { out[path] = sync; continue; }
      const asyncErr = asyncErrors.get(stable(path));
      if (asyncErr) out[path] = asyncErr;
    }
    const formErrors = options.validate?.(values) ?? {};
    for (const [path, msg] of Object.entries(formErrors)) if (msg && !(path in out)) out[path] = msg;
    return out;
  }

  function updateArray(path: string, fn: (arr: any[], ids: string[]) => void) {
    const segs = split(path);
    const current = getIn(values, segs);
    const arr: any[] = Array.isArray(current) ? current.slice() : [];
    const key = stable(path);
    const ids = idsFor(key, Array.isArray(current) ? current : []).slice();
    fn(arr, ids);
    values = setIn(values, segs, arr);
    arrayIds.set(key, ids);
  }

  const form: Form = {
    get values() { return values; },
    getValue: (path) => getIn(values, split(path)),
    setValue(path, value) {
      const segs = split(path);
      const key = stable(path);
      const before = getIn(values, segs);
      values = setIn(values, segs, value);
      if (before !== value) {
        for (const k of [...arrayIds.keys()]) if (isUnder(k, key) && k !== key) arrayIds.delete(k);
        if (isContainer(value)) cancelUnder(key + '.');
        if (Array.isArray(value) && (!Array.isArray(before) || before.length !== value.length)) arrayIds.delete(key);
      }
      scheduleAsync(path, false);
    },
    touch(path) { touched.add(stable(path)); },
    isTouched: (path) => touched.has(stable(path)),
    isDirty: (path) => (path === undefined ? !deepEqual(values, initial) : !deepEqual(getIn(values, split(path)), getIn(initial, split(path)))),
    get errors() { return computeErrors(); },
    get isValid() { return Object.keys(computeErrors()).length === 0; },
    get isValidating() { return pending.size > 0; },
    async submit(onSubmit) {
      const paths: string[] = [];
      allPaths(values, '', paths);
      for (const p of paths) if (fieldFor(p)) touched.add(stable(p));
      for (const p of paths) {
        const cfg = fieldFor(p);
        if (!cfg?.asyncValidate) continue;
        const entry = pending.get(stable(p));
        if (entry) { if (entry.timer !== undefined) { clock.clearTimeout(entry.timer); entry.run(); } }
        else if (!asyncErrors.has(stable(p))) scheduleAsync(p, true);
      }
      while (pending.size > 0) await Promise.all([...pending.values()].map((e) => e.promise));
      const errors = computeErrors();
      const ok = Object.keys(errors).length === 0;
      if (ok && onSubmit) await onSubmit(values);
      return { ok, errors };
    },
    reset(next) {
      for (const p of pending.values()) clock.clearTimeout(p.timer);
      initial = next ?? initial;
      values = initial;
      arrayIds = new Map();
      touched = new Set();
      asyncErrors = new Map();
      pending = new Map();
    },
    append(path, item) { updateArray(path, (arr, ids) => { arr.push(item); ids.push(`id${nextId++}`); }); },
    remove(path, index) {
      let removedKey = '';
      const key = stable(path);
      updateArray(path, (arr, ids) => {
        if (index < 0 || index >= arr.length) throw new RangeError(`No item at ${path}.${index}`);
        arr.splice(index, 1);
        removedKey = `${key}.${ids.splice(index, 1)[0]}`;
      });
      cancelUnder(removedKey);
    },
    move(path, from, to) {
      updateArray(path, (arr, ids) => {
        if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) throw new RangeError('Index out of range');
        arr.splice(to, 0, arr.splice(from, 1)[0]);
        ids.splice(to, 0, ids.splice(from, 1)[0]);
      });
    },
    ids(path) {
      const arr = getIn(values, split(path));
      return Array.isArray(arr) ? idsFor(stable(path), arr).slice() : [];
    },
  };
  return form;
}
