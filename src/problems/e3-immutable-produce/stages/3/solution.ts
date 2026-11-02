import type { Recipe } from './types';

/** Return this from a recipe to produce `undefined`. */
export const nothing: unique symbol = Symbol('nothing');

type Kind = 'object' | 'array' | 'map' | 'set';
interface State {
  kind: Kind;
  base: any;
  copy: any;
  parent: State | null;
  modified: boolean;
  revoked: boolean;
  draft: any;
  result?: any;
  revoke(): void;
}

const states = new WeakMap<object, State>();
const stateOf = (v: unknown) => (typeof v === 'object' && v !== null ? states.get(v) : undefined);
export const isDraft = (v: unknown) => stateOf(v) !== undefined;

function kindOf(v: unknown): Kind | null {
  if (typeof v !== 'object' || v === null) return null;
  if (Array.isArray(v)) return 'array';
  if (v instanceof Map) return 'map';
  if (v instanceof Set) return 'set';
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null ? 'object' : null;
}
export const isDraftable = (v: unknown) => kindOf(v) !== null;

function shallowCopy(st: State): any {
  switch (st.kind) {
    case 'array': return st.base.slice();
    case 'map': return new Map(st.base);
    case 'set': return new Set(st.base);
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
function assertLive(st: State) {
  if (st.revoked) throw new TypeError('Cannot use a draft after the recipe has finished');
}

interface Scope { all: State[] }

function childDraft(scope: Scope, parent: State, value: any): any {
  return createDraft(scope, value, parent).draft;
}

const objectTraps: ProxyHandler<any> = {
  get(target, prop) {
    const st: State = target.st;
    assertLive(st);
    const src = latest(st);
    const value = src[prop];
    if (!Object.prototype.hasOwnProperty.call(src, prop)) return value;
    if (value === st.base[prop] && isDraftable(value) && !isDraft(value)) {
      prepareCopy(st);
      return (st.copy[prop] = childDraft(target.scope, st, value));
    }
    return value;
  },
  set(target, prop, value) {
    const st: State = target.st;
    assertLive(st);
    const src = latest(st);
    if (Object.prototype.hasOwnProperty.call(src, prop) && Object.is(src[prop], value)) return true;
    prepareCopy(st);
    st.copy[prop] = value;
    markChanged(st);
    return true;
  },
  deleteProperty(target, prop) {
    const st: State = target.st;
    assertLive(st);
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

class DraftMap extends Map<any, any> {
  constructor(private st: State, private scope: Scope) { super(); }
  get size() { assertLive(this.st); return latest(this.st).size; }
  has(k: any) { assertLive(this.st); return latest(this.st).has(k); }
  get(k: any) {
    const st = this.st;
    assertLive(st);
    const value = latest(st).get(k);
    if (value === st.base.get(k) && isDraftable(value) && !isDraft(value)) {
      prepareCopy(st);
      const d = childDraft(this.scope, st, value);
      st.copy.set(k, d);
      return d;
    }
    return value;
  }
  set(k: any, v: any) {
    const st = this.st;
    assertLive(st);
    const src = latest(st);
    if (src.has(k) && Object.is(src.get(k), v)) return this;
    prepareCopy(st);
    st.copy.set(k, v);
    markChanged(st);
    return this;
  }
  delete(k: any) {
    assertLive(this.st);
    if (!latest(this.st).has(k)) return false;
    prepareCopy(this.st);
    this.st.copy.delete(k);
    markChanged(this.st);
    return true;
  }
  clear() {
    assertLive(this.st);
    if (latest(this.st).size === 0) return;
    prepareCopy(this.st);
    this.st.copy.clear();
    markChanged(this.st);
  }
  *keys(): any { assertLive(this.st); yield* latest(this.st).keys(); }
  *values(): any { for (const k of this.keys()) yield this.get(k); }
  *entries(): any { for (const k of this.keys()) yield [k, this.get(k)]; }
  [Symbol.iterator]() { return this.entries(); }
  forEach(cb: (v: any, k: any, m: Map<any, any>) => void, thisArg?: any) {
    for (const [k, v] of this.entries()) cb.call(thisArg, v, k, this);
  }
}

class DraftSet extends Set<any> {
  constructor(private st: State) { super(); }
  get size() { assertLive(this.st); return latest(this.st).size; }
  has(v: any) { assertLive(this.st); return latest(this.st).has(v); }
  add(v: any) {
    assertLive(this.st);
    if (latest(this.st).has(v)) return this;
    prepareCopy(this.st);
    this.st.copy.add(v);
    markChanged(this.st);
    return this;
  }
  delete(v: any) {
    assertLive(this.st);
    if (!latest(this.st).has(v)) return false;
    prepareCopy(this.st);
    this.st.copy.delete(v);
    markChanged(this.st);
    return true;
  }
  clear() {
    assertLive(this.st);
    if (latest(this.st).size === 0) return;
    prepareCopy(this.st);
    this.st.copy.clear();
    markChanged(this.st);
  }
  *values(): any { assertLive(this.st); yield* latest(this.st).values(); }
  keys() { return this.values(); }
  *entries(): any { for (const v of this.values()) yield [v, v]; }
  [Symbol.iterator]() { return this.values(); }
  forEach(cb: (v: any, k: any, s: Set<any>) => void, thisArg?: any) {
    for (const v of this.values()) cb.call(thisArg, v, v, this);
  }
}

function createDraft(scope: Scope, base: any, parent: State | null): State {
  const kind = kindOf(base)!;
  const st: State = { kind, base, copy: null, parent, modified: false, revoked: false, draft: null, revoke: () => {} };
  if (kind === 'map') {
    st.draft = new DraftMap(st, scope);
    st.revoke = () => { st.revoked = true; };
  } else if (kind === 'set') {
    st.draft = new DraftSet(st);
    st.revoke = () => { st.revoked = true; };
  } else {
    const target: any = kind === 'array' ? [] : {};
    target.st = st;
    target.scope = scope;
    const { proxy, revoke } = Proxy.revocable(target, objectTraps);
    st.draft = proxy;
    st.revoke = () => { st.revoked = true; revoke(); };
  }
  states.set(st.draft, st);
  scope.all.push(st);
  return st;
}

function freeze(v: any): any {
  const k = kindOf(v);
  if (k === 'object' || k === 'array') Object.freeze(v);
  return v;
}

/** Replace drafts inside a value the recipe built itself. */
function finalizeValue(v: any, seen: Set<any>): any {
  const st = stateOf(v);
  if (st) return finalize(st, seen);
  const k = kindOf(v);
  if (!k || Object.isFrozen(v) || seen.has(v)) return v;
  seen.add(v);
  if (k === 'map') for (const [key, val] of v) v.set(key, finalizeValue(val, seen));
  else if (k === 'set') {
    const items = [...v];
    v.clear();
    for (const item of items) v.add(finalizeValue(item, seen));
  } else for (const key of Reflect.ownKeys(v)) v[key] = finalizeValue(v[key], seen);
  return freeze(v);
}

function sameShallow(st: State, out: any): boolean {
  const base = st.base;
  if (st.kind === 'map' || st.kind === 'set') {
    if (base.size !== out.size) return false;
    if (st.kind === 'set') { for (const v of out) if (!base.has(v)) return false; return true; }
    for (const [k, v] of out) if (!base.has(k) || !Object.is(base.get(k), v)) return false;
    return true;
  }
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
  if (st.kind === 'map') for (const [k, v] of out) out.set(k, finalizeValue(v, seen));
  else if (st.kind === 'set') {
    const items = [...out];
    out.clear();
    for (const item of items) out.add(finalizeValue(item, seen));
  } else for (const k of Reflect.ownKeys(out)) out[k] = finalizeValue(out[k], seen);
  st.result = sameShallow(st, out) ? st.base : freeze(out);
  return st.result;
}

export function produce<T>(base: T, recipe: Recipe<T>): T {
  if (!isDraftable(base)) {
    const r = recipe(base);
    return (r === nothing ? undefined : r === undefined ? base : r) as T;
  }
  const scope: Scope = { all: [] };
  const root = createDraft(scope, base, null);
  try {
    const r = recipe(root.draft);
    if (r !== undefined && r !== root.draft) {
      if (root.modified) throw new Error('A producer returned a new value *and* modified its draft. Either return a new value *or* modify the draft.');
      return r === nothing ? (undefined as T) : finalizeValue(r, new Set());
    }
    return finalize(root);
  } finally {
    for (const st of scope.all) st.revoke();
  }
}
