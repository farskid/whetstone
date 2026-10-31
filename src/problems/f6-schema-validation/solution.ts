export interface Issue {
  path: (string | number)[];
  code: string;
  message: string;
}

export class ValidationError extends Error {
  constructor(public issues: Issue[]) {
    super(issues.map((i) => `${i.path.length ? i.path.join('.') : '(root)'}: ${i.message}`).join('\n'));
    this.name = 'ValidationError';
  }
}

export type SafeParseResult = { success: true; data: any } | { success: false; error: ValidationError };

type Path = (string | number)[];
interface Ctx { issues: Issue[] }
const INVALID = Symbol('invalid');
type Out = unknown | typeof INVALID;
type ParseFn = (input: unknown, path: Path, ctx: Ctx) => Out;

const typeName = (v: unknown): string => {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number' && Number.isNaN(v)) return 'nan';
  return typeof v;
};

const addIssue = (ctx: Ctx, path: Path, code: string, message: string) => {
  ctx.issues.push({ path: [...path], code, message });
};

const expectType = (expected: string, check: (v: unknown) => boolean): ParseFn => (input, path, ctx) => {
  if (check(input)) return input;
  addIssue(ctx, path, 'invalid_type', `Expected ${expected}, received ${typeName(input)}`);
  return INVALID;
};

/** A check runs only on a value of the right type; it returns an issue or null. */
type Check = (value: any) => { code: string; message: string } | null;

export class Schema {
  constructor(protected readonly _parse: ParseFn) {}

  /** @internal */
  run(input: unknown, path: Path, ctx: Ctx): Out {
    return this._parse(input, path, ctx);
  }

  safeParse(input: unknown): SafeParseResult {
    const ctx: Ctx = { issues: [] };
    const out = this.run(input, [], ctx);
    if (ctx.issues.length || out === INVALID) return { success: false, error: new ValidationError(ctx.issues) };
    return { success: true, data: out };
  }

  parse(input: unknown): any {
    const r = this.safeParse(input);
    if (!r.success) throw r.error;
    return r.data;
  }

  optional(): Schema {
    return new Schema((input, path, ctx) => (input === undefined ? undefined : this.run(input, path, ctx)));
  }

  nullable(): Schema {
    return new Schema((input, path, ctx) => (input === null ? null : this.run(input, path, ctx)));
  }

  default(value: unknown): Schema {
    return new Schema((input, path, ctx) =>
      this.run(input === undefined ? (typeof value === 'function' ? (value as () => unknown)() : value) : input, path, ctx));
  }

  refine(pred: (value: any) => boolean, message = 'Invalid input'): Schema {
    return new Schema((input, path, ctx) => {
      const before = ctx.issues.length;
      const out = this.run(input, path, ctx);
      if (out === INVALID || ctx.issues.length > before) return INVALID;
      if (!pred(out)) { addIssue(ctx, path, 'custom', message); return INVALID; }
      return out;
    });
  }

  transform(fn: (value: any) => unknown): Schema {
    return new Schema((input, path, ctx) => {
      const before = ctx.issues.length;
      const out = this.run(input, path, ctx);
      if (out === INVALID || ctx.issues.length > before) return INVALID;
      return fn(out);
    });
  }
}

class CheckedSchema<Self> extends Schema {
  constructor(
    private readonly base: ParseFn,
    private readonly checks: Check[],
    private readonly make: (checks: Check[]) => Self,
  ) {
    super((input, path, ctx) => {
      const before = ctx.issues.length;
      const out = base(input, path, ctx); // INVALID only for a wrong type
      if (out === INVALID) return INVALID;
      for (const check of checks) {
        const issue = check(out);
        if (issue) addIssue(ctx, path, issue.code, issue.message);
      }
      return ctx.issues.length > before ? INVALID : out;
    });
  }
  protected with(check: Check): Self {
    return this.make([...this.checks, check]);
  }
}

export class StringSchema extends CheckedSchema<StringSchema> {
  constructor(checks: Check[] = []) {
    super(expectType('string', (v) => typeof v === 'string'), checks, (c) => new StringSchema(c));
  }
  min(n: number) {
    return this.with((v: string) => (v.length < n ? { code: 'too_small', message: `String must contain at least ${n} character(s)` } : null));
  }
  max(n: number) {
    return this.with((v: string) => (v.length > n ? { code: 'too_big', message: `String must contain at most ${n} character(s)` } : null));
  }
  regex(re: RegExp) {
    return this.with((v: string) => {
      re.lastIndex = 0;
      return re.test(v) ? null : { code: 'invalid_string', message: 'Invalid' };
    });
  }
}

export class NumberSchema extends CheckedSchema<NumberSchema> {
  constructor(checks: Check[] = []) {
    super(expectType('number', (v) => typeof v === 'number' && !Number.isNaN(v)), checks, (c) => new NumberSchema(c));
  }
  min(n: number) {
    return this.with((v: number) => (v < n ? { code: 'too_small', message: `Number must be greater than or equal to ${n}` } : null));
  }
  max(n: number) {
    return this.with((v: number) => (v > n ? { code: 'too_big', message: `Number must be less than or equal to ${n}` } : null));
  }
  int() {
    return this.with((v: number) => (Number.isInteger(v) ? null : { code: 'invalid_type', message: 'Expected integer, received float' }));
  }
}

export class ArraySchema extends CheckedSchema<ArraySchema> {
  constructor(item: Schema, checks: Check[] = []) {
    super(
      (input, path, ctx) => {
        if (!Array.isArray(input)) return expectType('array', () => false)(input, path, ctx);
        // Item issues are recorded here; the length checks then run on the new array.
        return input.map((el, i) => item.run(el, [...path, i], ctx));
      },
      checks,
      (c) => new ArraySchema(item, c),
    );
  }
  min(n: number) {
    return this.with((v: unknown[]) => (v.length < n ? { code: 'too_small', message: `Array must contain at least ${n} element(s)` } : null));
  }
  max(n: number) {
    return this.with((v: unknown[]) => (v.length > n ? { code: 'too_big', message: `Array must contain at most ${n} element(s)` } : null));
  }
}

type UnknownKeys = 'strip' | 'strict' | 'passthrough';

export class ObjectSchema extends Schema {
  constructor(private readonly shape: Record<string, Schema>, private readonly mode: UnknownKeys = 'strip') {
    super((input, path, ctx) => {
      if (typeName(input) !== 'object') return expectType('object', () => false)(input, path, ctx);
      const obj = input as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      let ok = true;
      for (const [key, schema] of Object.entries(shape)) {
        const present = Object.prototype.hasOwnProperty.call(obj, key);
        const r = schema.run(obj[key], [...path, key], ctx);
        if (r === INVALID) { ok = false; continue; }
        if (!present && r === undefined) continue; // absent optional key stays absent
        out[key] = r;
      }
      const extra = Object.keys(obj).filter((k) => !Object.prototype.hasOwnProperty.call(shape, k));
      if (extra.length && mode === 'strict') {
        addIssue(ctx, path, 'unrecognized_keys', `Unrecognized key(s): ${extra.map((k) => JSON.stringify(k)).join(', ')}`);
        ok = false;
      }
      if (mode === 'passthrough') for (const k of extra) out[k] = obj[k];
      return ok ? out : INVALID;
    });
  }
  strict() { return new ObjectSchema(this.shape, 'strict'); }
  passthrough() { return new ObjectSchema(this.shape, 'passthrough'); }
  extend(shape: Record<string, Schema>) { return new ObjectSchema({ ...this.shape, ...shape }, this.mode); }
}

export const s = {
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  boolean: () => new Schema(expectType('boolean', (v) => typeof v === 'boolean')),
  literal: (value: string | number | boolean | null) =>
    new Schema((input, path, ctx) => {
      if (input === value) return input;
      addIssue(ctx, path, 'invalid_literal', `Expected ${JSON.stringify(value)}`);
      return INVALID;
    }),
  enum: (values: readonly (string | number)[]) =>
    new Schema((input, path, ctx) => {
      if (values.includes(input as string | number)) return input;
      addIssue(ctx, path, 'invalid_enum', `Expected ${values.map((v) => JSON.stringify(v)).join(' | ')}, received ${JSON.stringify(input) ?? typeName(input)}`);
      return INVALID;
    }),
  array: (item: Schema) => new ArraySchema(item),
  object: (shape: Record<string, Schema>) => new ObjectSchema(shape),
  union: (options: Schema[]) =>
    new Schema((input, path, ctx) => {
      for (const option of options) {
        const trial: Ctx = { issues: [] };
        const out = option.run(input, path, trial);
        if (out !== INVALID && trial.issues.length === 0) return out;
      }
      addIssue(ctx, path, 'invalid_union', 'Invalid input');
      return INVALID;
    }),
  lazy: (get: () => Schema) => {
    let cached: Schema | undefined;
    return new Schema((input, path, ctx) => (cached ??= get()).run(input, path, ctx));
  },
};
