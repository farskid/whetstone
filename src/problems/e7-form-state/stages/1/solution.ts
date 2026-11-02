import type { FormOptions, Form } from './types';

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

export function createForm(options: FormOptions): Form {
  let initial = options.initialValues;
  let values = initial;
  let touched = new Set<string>();

  return {
    get values() { return values; },
    getValue: (path) => getIn(values, split(path)),
    setValue(path, value) { values = setIn(values, split(path), value); },
    touch(path) { touched.add(path); },
    isTouched: (path) => touched.has(path),
    isDirty: (path) => (path === undefined ? !deepEqual(values, initial) : !deepEqual(getIn(values, split(path)), getIn(initial, split(path)))),
    reset(next) {
      initial = next ?? initial;
      values = initial;
      touched = new Set();
    },
  };
}
