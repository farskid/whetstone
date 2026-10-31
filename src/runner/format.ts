/** Pretty-print any value for test output. Handles cycles, Maps, Sets, functions, errors. */
export function format(value: unknown, depth = 0, seen = new WeakSet<object>()): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'string') return depth === 0 ? JSON.stringify(value) : JSON.stringify(value);
  if (t === 'number') return Object.is(value, -0) ? '-0' : String(value);
  if (t === 'bigint') return `${value}n`;
  if (t === 'boolean' || t === 'symbol') return String(value);
  if (t === 'function') return `[Function ${(value as Function).name || 'anonymous'}]`;
  const obj = value as object;
  if (seen.has(obj)) return '[Circular]';
  if (depth > 6) return Array.isArray(obj) ? '[Array]' : '[Object]';
  seen.add(obj);
  try {
    if (obj instanceof Error) return `${obj.name}: ${obj.message}`;
    if (obj instanceof Date) return `Date(${isNaN(obj.getTime()) ? 'Invalid' : obj.toISOString()})`;
    if (obj instanceof RegExp) return String(obj);
    if (typeof Promise !== 'undefined' && obj instanceof Promise) return 'Promise {…}';
    if (obj instanceof Map) {
      const items = [...obj.entries()].map(([k, v]) => `${format(k, depth + 1, seen)} => ${format(v, depth + 1, seen)}`);
      return `Map(${obj.size}) {${items.length ? ' ' + items.join(', ') + ' ' : ''}}`;
    }
    if (obj instanceof Set) {
      const items = [...obj].map((v) => format(v, depth + 1, seen));
      return `Set(${obj.size}) {${items.length ? ' ' + items.join(', ') + ' ' : ''}}`;
    }
    if (Array.isArray(obj)) {
      if (obj.length > 50) return `[${obj.slice(0, 50).map((v) => format(v, depth + 1, seen)).join(', ')}, … ${obj.length - 50} more]`;
      return `[${obj.map((v) => format(v, depth + 1, seen)).join(', ')}]`;
    }
    const keys = Object.keys(obj);
    if (!keys.length) return '{}';
    const body = keys.map((k) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${format((obj as any)[k], depth + 1, seen)}`);
    return `{ ${body.join(', ')} }`;
  } catch {
    return '[Unprintable]';
  } finally {
    seen.delete(obj);
  }
}
