import type {} from './types';

export function clone<T>(value: T): T {
  const memo = new Map<object, unknown>();

  function cloneBuffer(buf: ArrayBuffer): ArrayBuffer {
    if (memo.has(buf)) return memo.get(buf) as ArrayBuffer;
    const c = buf.slice(0);
    memo.set(buf, c);
    return c;
  }

  function copy(v: unknown): unknown {
    if (typeof v === 'function') throw new TypeError('Cannot clone a function');
    if (typeof v === 'symbol') throw new TypeError('Cannot clone a symbol value');
    if (typeof v !== 'object' || v === null) return v;
    if (memo.has(v)) return memo.get(v);
    if (v instanceof Date) return remember(v, new Date(v.getTime()));
    if (v instanceof RegExp) {
      const re = new RegExp(v.source, v.flags);
      re.lastIndex = v.lastIndex;
      return remember(v, re);
    }
    if (v instanceof ArrayBuffer) return cloneBuffer(v);
    if (ArrayBuffer.isView(v)) {
      const buffer = cloneBuffer(v.buffer as ArrayBuffer);
      if (v instanceof DataView) return remember(v, new DataView(buffer, v.byteOffset, v.byteLength));
      const Ctor = (v as any).constructor;
      return remember(v, new Ctor(buffer, v.byteOffset, (v as any).length));
    }
    if (v instanceof Map) {
      const out = remember(v, new Map());
      for (const [k, x] of v) out.set(copy(k), copy(x));
      return out;
    }
    if (v instanceof Set) {
      const out = remember(v, new Set());
      for (const x of v) out.add(copy(x));
      return out;
    }
    if (Array.isArray(v)) {
      const out = remember(v, [] as unknown[]);
      for (const x of v) out.push(copy(x));
      return out;
    }
    const out = remember(v, {} as Record<string, unknown>);
    for (const k of Object.keys(v)) out[k] = copy((v as Record<string, unknown>)[k]);
    return out;
  }

  function remember<C>(src: object, c: C): C {
    memo.set(src, c);
    return c;
  }

  return copy(value) as T;
}
