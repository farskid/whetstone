import type { Match, Router } from './types';

type Seg =
  | { kind: 'static'; text: string }
  | { kind: 'param'; name: string }
  | { kind: 'wild' };

function parsePattern(pattern: string): Seg[] {
  const parts = pattern.split('/').filter(Boolean);
  return parts.map((p): Seg => {
    if (p === '*') return { kind: 'wild' };
    if (p.startsWith(':')) {
      return { kind: 'param', name: p.slice(1) };
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

interface Leaf<H> { handler: H; pattern: string; names: string[] }
interface Node<H> {
  statics: Map<string, Node<H>>;
  param?: Node<H>; // shared by every param at this position, whatever its name
  wild?: Map<string, Leaf<H>>; // method -> leaf, for a trailing *
  leaves: Map<string, Leaf<H>>; // method -> leaf, when the path ends here
}
const newNode = <H>(): Node<H> => ({ statics: new Map(), leaves: new Map() });

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
        node = node.param ??= newNode();
      } else {
        node.wild ??= new Map();
        node.wild.set(method, leaf);
        return;
      }
    }
    node.leaves.set(method, leaf);
  };

  const pick = (m: Map<string, Leaf<H>> | undefined, method: string) => m?.get(method);

  type Found = { leaf: Leaf<H>; values: string[] };
  const walk = (node: Node<H>, segs: string[], i: number, values: string[], method: string): Found | undefined => {
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
    if (node.param) {
      const f = walk(node.param, segs, i + 1, [...values, decoded], method);
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

  return {
    add(method, pattern, handler) {
      const segs = parsePattern(pattern);
      const names = segs.flatMap((s) => (s.kind === 'param' ? [s.name] : s.kind === 'wild' ? ['*'] : []));
      insert(segs, method, { handler, pattern, names });
    },
    match(method, path) {
      const f = walk(root, splitPath(path), 0, [], method);
      return f ? toMatch(f) : null;
    },
  };
}
