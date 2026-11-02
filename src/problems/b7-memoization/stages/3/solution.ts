import type {} from './types';

type AnyFn = (...args: any[]) => any;

const shallowEqual = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((x, i) => Object.is(x, b[i]));

export function memoizeOne<F extends AnyFn>(fn: F, isEqual: (newArgs: unknown[], lastArgs: unknown[]) => boolean = shallowEqual): F {
  let last: { self: unknown; args: unknown[]; result: unknown } | null = null;
  return function (this: unknown, ...args: unknown[]) {
    if (last && last.self === this && isEqual(args, last.args)) return last.result;
    const result = fn.apply(this, args); // a throw leaves `last` untouched
    last = { self: this, args, result };
    return result;
  } as F;
}

type CacheNode = {
  strong: Map<unknown, CacheNode>;
  children: number;
  has: boolean;
  value: unknown;
};

const newNode = (): CacheNode => ({ strong: new Map(), children: 0, has: false, value: undefined });

function child(node: CacheNode, key: unknown, create: boolean): CacheNode | undefined {
  let next = node.strong.get(key);
  if (!next && create) {
    next = newNode();
    node.strong.set(key, next);
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
      parent.strong.delete(k);
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

