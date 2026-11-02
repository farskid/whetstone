import type { CloneOptions } from './types';

type Task = () => void;

export function clone<T>(value: T, options: CloneOptions = {}): T {
  const memo = new Map<unknown, unknown>();
  const queue: Task[] = [];
  let result: unknown;

  const copyProps = (src: any, dst: any, skipIndices: boolean) => {
    const keys: (string | symbol)[] = Object.keys(src);
    for (const s of Object.getOwnPropertySymbols(src)) if (Object.prototype.propertyIsEnumerable.call(src, s)) keys.push(s);
    for (const k of keys) {
      if (skipIndices && typeof k === 'string' && /^(0|[1-9]\d*)$/.test(k)) continue;
      const v = src[k]; // invokes getters
      if (typeof v === 'object' && v !== null) {
        visit(v, (c) => Object.defineProperty(dst, k, { value: c, writable: true, enumerable: true, configurable: true }));
      } else {
        Object.defineProperty(dst, k, { value: checkPrimitive(v), writable: true, enumerable: true, configurable: true });
      }
    }
  };

  function checkPrimitive(v: unknown): unknown {
    if (typeof v === 'function') throw new TypeError('Cannot clone a function');
    if (typeof v === 'symbol') throw new TypeError('Cannot clone a symbol value');
    return v;
  }

  function cloneBuffer(buf: ArrayBuffer): ArrayBuffer {
    if (memo.has(buf)) return memo.get(buf) as ArrayBuffer;
    const c = buf.slice(0);
    memo.set(buf, c);
    return c;
  }

  /** Clone `src` (an object) and hand the clone to `assign` immediately; children are filled in later. */
  function visit(src: any, assign: (c: unknown) => void) {
    if (memo.has(src)) return assign(memo.get(src));
    if (options.customizer) {
      const r = options.customizer(src);
      if (r !== undefined) {
        memo.set(src, r);
        return assign(r);
      }
    }
    let out: any;
    if (src instanceof Date) out = new Date(src.getTime());
    else if (src instanceof RegExp) {
      out = new RegExp(src.source, src.flags);
      out.lastIndex = src.lastIndex;
    } else if (src instanceof ArrayBuffer) out = cloneBuffer(src);
    else if (ArrayBuffer.isView(src)) {
      const buffer = cloneBuffer(src.buffer as ArrayBuffer);
      if (src instanceof DataView) out = new DataView(buffer, src.byteOffset, src.byteLength);
      else {
        const Ctor = (src as any).constructor;
        out = new Ctor(buffer, src.byteOffset, (src as any).length);
      }
    } else if (src instanceof Map) {
      out = new Map();
      memo.set(src, out);
      const pairs: [unknown, unknown][] = [];
      for (const [k, v] of src) {
        const pair: [unknown, unknown] = [undefined, undefined];
        pairs.push(pair);
        if (typeof k === 'object' && k !== null) queue.push(() => visit(k, (c) => { pair[0] = c; }));
        else pair[0] = checkPrimitive(k);
        if (typeof v === 'object' && v !== null) queue.push(() => visit(v, (c) => { pair[1] = c; }));
        else pair[1] = checkPrimitive(v);
      }
      queue.push(() => { for (const [k, v] of pairs) out.set(k, v); });
      return assign(out);
    } else if (src instanceof Set) {
      out = new Set();
      memo.set(src, out);
      const items: unknown[] = [];
      let i = 0;
      for (const v of src) {
        const at = i++;
        if (typeof v === 'object' && v !== null) queue.push(() => visit(v, (c) => { items[at] = c; }));
        else items[at] = checkPrimitive(v);
      }
      queue.push(() => { for (let j = 0; j < i; j++) out.add(items[j]); });
      return assign(out);
    } else if (Array.isArray(src)) {
      out = new Array(src.length);
      memo.set(src, out);
      for (const k of Object.keys(src)) {
        if (!/^(0|[1-9]\d*)$/.test(k)) continue;
        const v = src[k as any];
        const idx = Number(k);
        if (typeof v === 'object' && v !== null) queue.push(() => visit(v, (c) => { out[idx] = c; }));
        else out[idx] = checkPrimitive(v);
      }
      queue.push(() => copyProps(src, out, true));
      return assign(out);
    } else {
      const proto = Object.getPrototypeOf(src);
      out = Object.create(options.keepPrototype || proto === null ? proto : Object.prototype);
      memo.set(src, out);
      queue.push(() => copyProps(src, out, false));
      return assign(out);
    }
    memo.set(src, out);
    // Extra own props on Date/RegExp/typed arrays are copied too.
    queue.push(() => copyProps(src, out, ArrayBuffer.isView(src)));
    assign(out);
  }

  if (typeof value !== 'object' || value === null) return checkPrimitive(value) as T;
  visit(value, (c) => { result = c; });
  for (let i = 0; i < queue.length; i++) {
    queue[i]();
    if (i > 4096) { queue.splice(0, i + 1); i = -1; }
  }
  return result as T;
}
