import type { Recipe } from './types';

type Kind = 'object' | 'array';
interface State {
  kind: Kind;
  base: any;
  copy: any;
  parent: State | null;
  modified: boolean;
  draft: any;
  result?: any;
}

const states = new WeakMap<object, State>();
const stateOf = (v: unknown) => (typeof v === 'object' && v !== null ? states.get(v) : undefined);
export const isDraft = (v: unknown) => stateOf(v) !== undefined;

function kindOf(v: unknown): Kind | null {
  if (typeof v !== 'object' || v === null) return null;
  if (Array.isArray(v)) return 'array';
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null ? 'object' : null;
}
export const isDraftable = (v: unknown) => kindOf(v) !== null;

function shallowCopy(st: State): any {
  switch (st.kind) {
    case 'array': return st.base.slice();
    default: {
      const out = Object.create(Object.getPrototypeOf(st.base));
      for (const k of Reflect.ownKeys(st.base)) out[k] = st.base[k];
      return out;
    }
  }
}

const prepareCopy = (st: State) => { if (!st.copy) st.copy = shallowCopy(st); };
function markChanged(st: State | null) {
  for (; st && !st.modified; st = st.parent) st.modified = true;
}
const latest = (st: State) => st.copy ?? st.base;

function childDraft(parent: State, value: any): any {
  return createDraft(value, parent).draft;
}

const objectTraps: ProxyHandler<any> = {
  get(target, prop) {
    const st: State = target.st;
    const src = latest(st);
    const value = src[prop];
    if (!Object.prototype.hasOwnProperty.call(src, prop)) return value;
    if (value === st.base[prop] && isDraftable(value) && !isDraft(value)) {
      prepareCopy(st);
      return (st.copy[prop] = childDraft(st, value));
    }
    return value;
  },
  set(target, prop, value) {
    const st: State = target.st;
    const src = latest(st);
    if (Object.prototype.hasOwnProperty.call(src, prop) && Object.is(src[prop], value)) return true;
    prepareCopy(st);
    st.copy[prop] = value;
    markChanged(st);
    return true;
  },
  deleteProperty(target, prop) {
    const st: State = target.st;
    if (!Object.prototype.hasOwnProperty.call(latest(st), prop)) return true;
    prepareCopy(st);
    delete st.copy[prop];
    markChanged(st);
    return true;
  },
  has(target, prop) { return prop in latest(target.st); },
  ownKeys(target) { return Reflect.ownKeys(latest(target.st)); },
  getOwnPropertyDescriptor(target, prop) {
    const st: State = target.st;
    const desc = Reflect.getOwnPropertyDescriptor(latest(st), prop);
    if (!desc) return undefined;
    const isLength = st.kind === 'array' && prop === 'length';
    return { value: (this as any).get(target, prop), writable: true, enumerable: desc.enumerable, configurable: !isLength };
  },
  defineProperty() { throw new TypeError('defineProperty is not supported on drafts'); },
  getPrototypeOf(target) { return Object.getPrototypeOf(target.st.base); },
  setPrototypeOf() { throw new TypeError('setPrototypeOf is not supported on drafts'); },
};

function createDraft(base: any, parent: State | null): State {
  const kind = kindOf(base)!;
  const st: State = { kind, base, copy: null, parent, modified: false, draft: null };
  const target: any = kind === 'array' ? [] : {};
  target.st = st;
  st.draft = new Proxy(target, objectTraps);
  states.set(st.draft, st);
  return st;
}

/** Replace drafts inside a value the recipe built itself. */
function finalizeValue(v: any, seen: Set<any>): any {
  const st = stateOf(v);
  if (st) return finalize(st, seen);
  const k = kindOf(v);
  if (!k || Object.isFrozen(v) || seen.has(v)) return v;
  seen.add(v);
  for (const key of Reflect.ownKeys(v)) v[key] = finalizeValue(v[key], seen);
  return v;
}

function sameShallow(st: State, out: any): boolean {
  const base = st.base;
  const a = Reflect.ownKeys(base);
  const b = Reflect.ownKeys(out);
  if (a.length !== b.length) return false;
  for (const k of b) if (!Object.prototype.hasOwnProperty.call(base, k) || !Object.is(base[k], out[k])) return false;
  return true;
}

function finalize(st: State, seen: Set<any> = new Set()): any {
  if ('result' in st) return st.result;
  if (!st.modified) return (st.result = st.base);
  st.result = st.copy; // guards against cycles while we walk
  const out = st.copy;
  for (const k of Reflect.ownKeys(out)) out[k] = finalizeValue(out[k], seen);
  st.result = sameShallow(st, out) ? st.base : out;
  return st.result;
}

export function produce<T>(base: T, recipe: Recipe<T>): T {
  const root = createDraft(base, null);
  recipe(root.draft);
  return finalize(root);
}
