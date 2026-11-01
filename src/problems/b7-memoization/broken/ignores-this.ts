// Bug: memoizeOne ignores this, so two objects share one cached result.
type AnyFn = (...args: any[]) => any;

const shallowEqual = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((x, i) => Object.is(x, b[i]));

export function memoizeOne<F extends AnyFn>(fn: F, isEqual: (newArgs: unknown[], lastArgs: unknown[]) => boolean = shallowEqual): F {
  let last: { self: unknown; args: unknown[]; result: unknown } | null = null;
  return function (this: unknown, ...args: unknown[]) {
    if (last && isEqual(args, last.args)) return last.result;
    const result = fn.apply(this, args); // a throw leaves `last` untouched
    last = { self: this, args, result };
    return result;
  } as F;
}

type CacheNode = {
  strong: Map<unknown, CacheNode>;
  weak: WeakMap<object, CacheNode>;
  children: number;
  has: boolean;
  value: unknown;
};

const newNode = (): CacheNode => ({ strong: new Map(), weak: new WeakMap(), children: 0, has: false, value: undefined });
const isObj = (x: unknown): x is object => (typeof x === 'object' && x !== null) || typeof x === 'function';

function child(node: CacheNode, key: unknown, create: boolean): CacheNode | undefined {
  let next = isObj(key) ? node.weak.get(key) : node.strong.get(key);
  if (!next && create) {
    next = newNode();
    if (isObj(key)) node.weak.set(key, next); else node.strong.set(key, next);
    node.children++;
  }
  return next;
}

export function memoize<F extends AnyFn>(fn: F, options: { max?: number } = {}): F & { clear(): void } {
  const max = options.max;
  let root = newNode();
  // Recency list (only with max): path keys of each stored result, least recent first.
  const recent = new Map<CacheNode, unknown[]>();

  const evict = (path: unknown[]) => {
    const nodes = [root];
    for (const k of path) nodes.push(child(nodes[nodes.length - 1], k, false)!);
    const leaf = nodes[nodes.length - 1];
    leaf.has = false;
    leaf.value = undefined;
    // Prune empty branches bottom-up.
    for (let i = nodes.length - 1; i > 0; i--) {
      const n = nodes[i];
      if (n.has || n.children > 0) break;
      const parent = nodes[i - 1], k = path[i - 1];
      if (isObj(k)) parent.weak.delete(k); else parent.strong.delete(k);
      parent.children--;
    }
  };

  const memoized = function (this: unknown, ...args: unknown[]) {
    const path = [args.length, ...args];
    let node = root;
    for (const k of path) {
      const next = child(node, k, false);
      if (!next) { node = undefined as unknown as CacheNode; break; }
      node = next;
    }
    if (node && node.has) {
      if (max !== undefined) { recent.delete(node); recent.set(node, path); }
      return node.value;
    }
    const value = fn.apply(this, args);
    let leaf = root;
    for (const k of path) leaf = child(leaf, k, true)!;
    leaf.has = true;
    leaf.value = value;
    if (max !== undefined) {
      recent.set(leaf, path);
      while (recent.size > max) {
        const [oldest, oldPath] = recent.entries().next().value as [CacheNode, unknown[]];
        recent.delete(oldest);
        evict(oldPath);
      }
    }
    return value;
  } as F & { clear(): void };
  memoized.clear = () => { root = newNode(); recent.clear(); };
  return memoized;
}

export function createSelector<S, R>(
  inputs: ((state: S, ...args: any[]) => unknown)[],
  combiner: (...values: any[]) => R,
): ((state: S, ...args: any[]) => R) & { recomputations(): number; resetRecomputations(): void } {
  let count = 0;
  const combine = memoizeOne((...values: unknown[]) => { count++; return combiner(...values); });
  const selector = ((state: S, ...rest: unknown[]) => combine(...inputs.map((f) => f(state, ...rest)))) as
    ((state: S, ...args: any[]) => R) & { recomputations(): number; resetRecomputations(): void };
  selector.recomputations = () => count;
  selector.resetRecomputations = () => { count = 0; };
  return selector;
}
