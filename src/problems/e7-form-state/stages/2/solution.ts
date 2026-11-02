import type { Errors, FieldConfig, FormOptions, Form } from './types';

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
  const fields = options.fields ?? {};
  let initial = options.initialValues;
  let values = initial;
  let touched = new Set<string>();
  let asyncErrors = new Map<string, string>();
  let pending = new Map<string, number>(); // path -> token of its latest check
  let tokenSeq = 0;

  const fieldFor = (path: string): FieldConfig | undefined => {
    for (const [pattern, cfg] of Object.entries(fields)) if (matches(pattern, path)) return cfg;
    return undefined;
  };

  const isUnder = (p: string, prefix: string) => p === prefix || p.startsWith(prefix + '.');

  function cancelUnder(prefix: string) {
    for (const key of [...pending.keys()]) if (isUnder(key, prefix)) pending.delete(key);
    for (const key of [...asyncErrors.keys()]) if (isUnder(key, prefix)) asyncErrors.delete(key);
  }

  function startAsync(path: string) {
    const cfg = fieldFor(path);
    if (!cfg?.asyncValidate) return;
    const token = ++tokenSeq;
    pending.set(path, token);
    asyncErrors.delete(path);
    const value = getIn(values, split(path));
    new Promise<string | undefined>((resolve) => resolve(cfg.asyncValidate!(value, values)))
      .then((err) => err, (e) => (e instanceof Error ? e.message : String(e)))
      .then((err) => {
        if (pending.get(path) !== token) return;
        pending.delete(path);
        if (err) asyncErrors.set(path, err);
        else asyncErrors.delete(path);
      });
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
      const asyncErr = asyncErrors.get(path);
      if (asyncErr) out[path] = asyncErr;
    }
    const formErrors = options.validate?.(values) ?? {};
    for (const [path, msg] of Object.entries(formErrors)) if (msg && !(path in out)) out[path] = msg;
    return out;
  }

  const form: Form = {
    get values() { return values; },
    getValue: (path) => getIn(values, split(path)),
    setValue(path, value) {
      const segs = split(path);
      const before = getIn(values, segs);
      values = setIn(values, segs, value);
      if (before !== value && isContainer(value)) cancelUnder(path + '.');
      startAsync(path);
    },
    touch(path) { touched.add(path); },
    isTouched: (path) => touched.has(path),
    isDirty: (path) => (path === undefined ? !deepEqual(values, initial) : !deepEqual(getIn(values, split(path)), getIn(initial, split(path)))),
    get errors() { return computeErrors(); },
    get isValid() { return Object.keys(computeErrors()).length === 0; },
    reset(next) {
      initial = next ?? initial;
      values = initial;
      touched = new Set();
      asyncErrors = new Map();
      pending = new Map();
    },
  };
  return form;
}
