import type { Match, Router } from './types';

type Seg =
  | { kind: 'static'; text: string }
  | { kind: 'param'; name: string; re?: RegExp; source?: string; optional: boolean }
  | { kind: 'wild' };

const PARAM = /^:([A-Za-z_$][\w$]*)(?:\((.+)\))?(\?)?$/;

function parsePattern(pattern: string): Seg[] {
  const parts = pattern.split('/').filter(Boolean);
  const names = new Set<string>();
  return parts.map((p, i): Seg => {
    if (p === '*') {
      if (i !== parts.length - 1) throw new Error(`"*" must be the last segment in ${pattern}`);
      return { kind: 'wild' };
    }
    if (p.startsWith(':')) {
      const m = PARAM.exec(p);
      if (!m) throw new Error(`Bad param segment "${p}" in ${pattern}`);
      const [, name, source, q] = m;
      if (names.has(name)) throw new Error(`Duplicate param "${name}" in ${pattern}`);
      names.add(name);
      let re: RegExp | undefined;
      if (source !== undefined) {
        try { re = new RegExp(`^(?:${source})$`); } catch (e) { throw new Error(`Bad regex for :${name} in ${pattern}: ${(e as Error).message}`); }
      }
      return { kind: 'param', name, re, source, optional: !!q };
    }
    return { kind: 'static', text: p };
  });
}

function splitPath(path: string): string[] {
  const clean = path.split(/[?#]/)[0];
  return clean.split('/').filter(Boolean);
}

function decode(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

interface ParamEdge<H> { re?: RegExp; source?: string; name: string; node: Node<H> }
interface Leaf<H> { handler: H; pattern: string; names: string[] }
interface Node<H> {
  statics: Map<string, Node<H>>;
  params: ParamEdge<H>[];
  wild?: Map<string, Leaf<H>>; // method -> leaf, for a trailing *
  leaves: Map<string, Leaf<H>>; // method -> leaf, when the path ends here
}
const newNode = <H>(): Node<H> => ({ statics: new Map(), params: [], leaves: new Map() });

/** Every concrete variant of a pattern: each optional param is present or absent. */
function expand(segs: Seg[]): Seg[][] {
  let out: Seg[][] = [[]];
  for (const s of segs) {
    if (s.kind === 'param' && s.optional) out = out.flatMap((v) => [[...v, s], v]);
    else out = out.map((v) => [...v, s]);
  }
  return out;
}

export function createRouter<H>(): Router<H> {
  const root = newNode<H>();

  const insert = (variant: Seg[], method: string, leaf: Leaf<H>) => {
    let node = root;
    for (const s of variant) {
      if (s.kind === 'static') {
        let next = node.statics.get(s.text);
        if (!next) node.statics.set(s.text, (next = newNode()));
        node = next;
      } else if (s.kind === 'param') {
        // Params with the same constraint share an edge (names may differ per route).
        let edge = node.params.find((e) => e.source === s.source);
        if (!edge) node.params.push((edge = { re: s.re, source: s.source, name: s.name, node: newNode() }));
        node = edge.node;
      } else {
        node.wild ??= new Map();
        if (node.wild.has(method)) throw new Error(`Duplicate route ${method} ${leaf.pattern}`);
        node.wild.set(method, leaf);
        return;
      }
    }
    if (node.leaves.has(method)) throw new Error(`Duplicate route ${method} ${leaf.pattern}`);
    node.leaves.set(method, leaf);
  };

  const pick = (m: Map<string, Leaf<H>> | undefined, method: string | null) => {
    if (!m || m.size === 0) return undefined;
    if (method === null) return m.values().next().value; // any method
    return m.get(method) ?? m.get('ALL');
  };

  type Found = { leaf: Leaf<H>; values: string[] };
  const walk = (node: Node<H>, segs: string[], i: number, values: string[], method: string | null): Found | undefined => {
    if (i === segs.length) {
      const leaf = pick(node.leaves, method);
      if (leaf) return { leaf, values };
      const w = pick(node.wild, method);
      return w ? { leaf: w, values: [...values, ''] } : undefined;
    }
    const seg = segs[i];
    const st = node.statics.get(seg);
    if (st) { const f = walk(st, segs, i + 1, values, method); if (f) return f; }
    const decoded = decode(seg);
    for (const edge of node.params) {
      if (edge.re && !edge.re.test(decoded)) continue;
      const f = walk(edge.node, segs, i + 1, [...values, decoded], method);
      if (f) return f;
    }
    const w = pick(node.wild, method);
    if (w) return { leaf: w, values: [...values, segs.slice(i).map(decode).join('/')] };
    return undefined;
  };

  const toMatch = (f: Found): Match<H> => {
    const params: Record<string, string> = {};
    f.leaf.names.forEach((n, i) => { params[n] = f.values[i]; });
    return { handler: f.leaf.handler, params, pattern: f.leaf.pattern };
  };

  const methodsAt = (node: Node<H>, segs: string[], i: number, acc: Set<string>) => {
    // Collect every method reachable for this path (any branch, not just the best one).
    if (i === segs.length) {
      node.leaves.forEach((_, m) => acc.add(m));
      node.wild?.forEach((_, m) => acc.add(m));
      return;
    }
    const st = node.statics.get(segs[i]);
    if (st) methodsAt(st, segs, i + 1, acc);
    const decoded = decode(segs[i]);
    for (const e of node.params) if (!e.re || e.re.test(decoded)) methodsAt(e.node, segs, i + 1, acc);
    node.wild?.forEach((_, m) => acc.add(m));
  };

  return {
    add(method, pattern, handler) {
      const segs = parsePattern(pattern);
      const m = method.toUpperCase();
      for (const variant of expand(segs)) {
        const names = variant.flatMap((s) => (s.kind === 'param' ? [s.name] : s.kind === 'wild' ? ['*'] : []));
        insert(variant, m, { handler, pattern, names });
      }
    },
    match(method, path) {
      const f = walk(root, splitPath(path), 0, [], method.toUpperCase());
      return f ? toMatch(f) : null;
    },
    allowedMethods(path) {
      const acc = new Set<string>();
      methodsAt(root, splitPath(path), 0, acc);
      return [...acc].sort();
    },
  };
}

export function buildPath(pattern: string, params: Record<string, string | number>): string {
  const out: string[] = [];
  for (const s of parsePattern(pattern)) {
    if (s.kind === 'static') { out.push(s.text); continue; }
    if (s.kind === 'wild') {
      const v = params['*'];
      if (v !== undefined && v !== '') out.push(String(v).split('/').map(encodeURIComponent).join('/'));
      continue;
    }
    const v = params[s.name];
    if (v === undefined || v === null || v === '') {
      if (s.optional) continue;
      throw new Error(`Missing param "${s.name}" for ${pattern}`);
    }
    const str = String(v);
    if (s.re && !s.re.test(str)) throw new Error(`Param "${s.name}"=${str} does not match (${s.source}) in ${pattern}`);
    out.push(encodeURIComponent(str));
  }
  return '/' + out.join('/');
}
