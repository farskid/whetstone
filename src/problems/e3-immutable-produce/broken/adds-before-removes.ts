// Bug: object adds come before the base-key pass
export type PatchPath = (string | number)[];
export interface Patch { op: 'add' | 'remove' | 'replace'; path: PatchPath; value?: unknown }
export type Recipe<T> = (draft: T) => T | void | typeof nothing;

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
  children: Map<unknown, State>;
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

function childDraft(scope: Scope, parent: State, key: unknown, value: any): any {
  const child = createDraft(scope, value, parent);
  parent.children.set(key, child);
  return child.draft;
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
      return (st.copy[prop] = childDraft(target.scope, st, st.kind === 'array' ? Number(prop) : prop, value));
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
      const d = childDraft(this.scope, st, k, value);
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
  const st: State = { kind, base, copy: null, parent, modified: false, revoked: false, children: new Map(), draft: null, revoke: () => {} };
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

function generatePatches(st: State, path: PatchPath, patches: Patch[], inverse: Patch[]) {
  const base = st.base;
  const out = st.result;
  if (out === base) return;
  const recurse = (key: unknown, before: unknown, after: unknown): boolean => {
    const child = st.children.get(key);
    if (child && child.base === before && child.result === after && after !== before) {
      generatePatches(child, [...path, key as string | number], patches, inverse);
      return true;
    }
    return false;
  };
  if (st.kind === 'set') {
    patches.push({ op: 'replace', path, value: out });
    inverse.push({ op: 'replace', path, value: base });
    return;
  }
  if (st.kind === 'map') {
    for (const [k, v] of base) {
      if (!out.has(k)) {
        patches.push({ op: 'remove', path: [...path, k] });
        inverse.push({ op: 'add', path: [...path, k], value: v });
      } else if (out.get(k) !== v && !recurse(k, v, out.get(k))) {
        patches.push({ op: 'replace', path: [...path, k], value: out.get(k) });
        inverse.push({ op: 'replace', path: [...path, k], value: v });
      }
    }
    for (const [k, v] of out) if (!base.has(k)) {
      patches.push({ op: 'add', path: [...path, k], value: v });
      inverse.push({ op: 'remove', path: [...path, k] });
    }
    return;
  }
  if (st.kind === 'array') {
    const common = Math.min(base.length, out.length);
    for (let i = 0; i < common; i++) {
      if (base[i] !== out[i] && !recurse(i, base[i], out[i])) {
        patches.push({ op: 'replace', path: [...path, i], value: out[i] });
        inverse.push({ op: 'replace', path: [...path, i], value: base[i] });
      }
    }
    for (let i = common; i < out.length; i++) patches.push({ op: 'add', path: [...path, i], value: out[i] });
    for (let i = out.length - 1; i >= common; i--) inverse.push({ op: 'remove', path: [...path, i] });
    for (let i = base.length - 1; i >= common; i--) patches.push({ op: 'remove', path: [...path, i] });
    for (let i = common; i < base.length; i++) inverse.push({ op: 'add', path: [...path, i], value: base[i] });
    return;
  }
  for (const k of Object.keys(out)) if (!Object.prototype.hasOwnProperty.call(base, k)) patches.push({ op: 'add', path: [...path, k], value: out[k] });
  for (const k of Object.keys(base)) {
    if (!Object.prototype.hasOwnProperty.call(out, k)) {
      patches.push({ op: 'remove', path: [...path, k] });
      inverse.push({ op: 'add', path: [...path, k], value: base[k] });
    } else if (base[k] !== out[k] && !recurse(k, base[k], out[k])) {
      patches.push({ op: 'replace', path: [...path, k], value: out[k] });
      inverse.push({ op: 'replace', path: [...path, k], value: base[k] });
    }
  }
  for (const k of Object.keys(out)) if (!Object.prototype.hasOwnProperty.call(base, k)) {
    patches.push({ op: 'add', path: [...path, k], value: out[k] });
    inverse.push({ op: 'remove', path: [...path, k] });
  }
}

function run<T>(base: T, recipe: Recipe<T>, withPatches: boolean): [T, Patch[], Patch[]] {
  const patches: Patch[] = [];
  const inverse: Patch[] = [];
  if (!isDraftable(base)) {
    const r = recipe(base);
    const out = (r === nothing ? undefined : r === undefined ? base : r) as T;
    if (!Object.is(out, base)) {
      patches.push({ op: 'replace', path: [], value: out });
      inverse.push({ op: 'replace', path: [], value: base });
    }
    return [out, patches, inverse];
  }
  const scope: Scope = { all: [] };
  const root = createDraft(scope, base, null);
  let out: any;
  try {
    const r = recipe(root.draft);
    if (r !== undefined && r !== root.draft) {
      if (root.modified) throw new Error('A producer returned a new value *and* modified its draft. Either return a new value *or* modify the draft.');
      out = r === nothing ? undefined : finalizeValue(r, new Set());
      if (withPatches && out !== base) {
        patches.push({ op: 'replace', path: [], value: out });
        inverse.push({ op: 'replace', path: [], value: base });
      }
    } else {
      out = finalize(root);
      if (withPatches) generatePatches(root, [], patches, inverse);
    }
  } finally {
    for (const st of scope.all) st.revoke();
  }
  return [out, patches, inverse];
}

export function produce<T>(base: T, recipe: Recipe<T>): T {
  return run(base, recipe, false)[0];
}

export function produceWithPatches<T>(base: T, recipe: Recipe<T>): [T, Patch[], Patch[]] {
  return run(base, recipe, true);
}

export function applyPatches<T>(base: T, patches: Patch[]): T {
  let root: any = base;
  const rootReplaced = { done: false };
  const result = produce(base, (draft: any) => {
    root = draft;
    for (const p of patches) {
      if (p.path.length === 0) {
        if (p.op === 'remove') throw new Error('Cannot remove the root');
        root = p.value;
        rootReplaced.done = true;
        continue;
      }
      let parent = root;
      for (const key of p.path.slice(0, -1)) {
        parent = parent instanceof Map ? parent.get(key) : parent[key as any];
        if (typeof parent !== 'object' || parent === null) throw new Error(`Cannot apply patch, path doesn't resolve: ${p.path.join('/')}`);
      }
      const key = p.path[p.path.length - 1];
      if (parent instanceof Map) {
        if (p.op === 'remove') parent.delete(key);
        else parent.set(key, p.value);
      } else if (Array.isArray(parent)) {
        const i = Number(key);
        if (p.op === 'add') parent.splice(i, 0, p.value);
        else if (p.op === 'remove') parent.splice(i, 1);
        else parent[i] = p.value;
      } else if (p.op === 'remove') delete parent[key as any];
      else parent[key as any] = p.value;
    }
    return rootReplaced.done ? (root === undefined ? nothing : root) : undefined;
  });
  return result as T;
}
