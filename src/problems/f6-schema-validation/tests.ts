import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

/** Issues as compact strings: "path code message" (root path → "(root)"). */
const issuesOf = (schema: any, input: unknown): string[] | 'ok' => {
  const r = schema.safeParse(input);
  if (r.success) return 'ok';
  return r.error.issues.map((i: any) => `${i.path.length ? i.path.join('.') : '(root)'} ${i.code}: ${i.message}`);
};

const G1 = 'Primitives';
const G2 = 'Objects and arrays';
const G3 = 'Modifiers';
const G4 = 'Refine, transform, lazy';

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'primitives: parse returns the value, wrong type → invalid_type',
    async run({ s }, { expect }) {
      expect(s.string().parse('hi')).toBe('hi');
      expect(s.number().parse(0)).toBe(0);
      expect(s.boolean().parse(false)).toBe(false);
      expect(issuesOf(s.string(), 1)).toEqual(['(root) invalid_type: Expected string, received number']);
      expect(issuesOf(s.number(), '1')).toEqual(['(root) invalid_type: Expected number, received string']);
      expect(issuesOf(s.boolean(), null)).toEqual(['(root) invalid_type: Expected boolean, received null']);
      expect(issuesOf(s.string(), undefined)).toEqual(['(root) invalid_type: Expected string, received undefined']);
      expect(issuesOf(s.string(), [])).toEqual(['(root) invalid_type: Expected string, received array']);
    },
  },
  {
    group: G1,
    title: 'NaN is not a number',
    async run({ s }, { expect }) {
      expect(issuesOf(s.number(), NaN)).toEqual(['(root) invalid_type: Expected number, received nan']);
    },
  },
  {
    group: G1,
    title: 'parse throws ValidationError with issues and a readable message; safeParse never throws',
    async run({ s, ValidationError }, { expect }) {
      let err: any;
      try { s.string().min(3).regex(/^a/).parse('xy'); } catch (e) { err = e; }
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.name).toBe('ValidationError');
      expect(err.message).toBe('(root): String must contain at least 3 character(s)\n(root): Invalid');
      expect(err.issues).toEqual([
        { path: [], code: 'too_small', message: 'String must contain at least 3 character(s)' },
        { path: [], code: 'invalid_string', message: 'Invalid' },
      ]);
      expect(s.string().safeParse(1).success).toBe(false);
      expect(s.string().safeParse('x')).toEqual({ success: true, data: 'x' });
      expect(() => s.number().parse('1')).toThrow('(root): Expected number, received string');
    },
  },
  {
    group: G1,
    title: 'string checks: all failing checks reported in chain order; wrong type skips checks',
    async run({ s }, { expect }) {
      const schema = s.string().min(3).regex(/^[a-z]+$/).max(5);
      expect(issuesOf(schema, 'abc')).toBe('ok');
      expect(issuesOf(schema, 'A')).toEqual([
        '(root) too_small: String must contain at least 3 character(s)',
        '(root) invalid_string: Invalid',
      ]);
      expect(issuesOf(schema, 'abcdef')).toEqual(['(root) too_big: String must contain at most 5 character(s)']);
      expect(issuesOf(schema, 5)).toEqual(['(root) invalid_type: Expected string, received number']);
      const g = s.string().regex(/a/g);
      expect([g.safeParse('a').success, g.safeParse('a').success], 'global regex must not be stateful').toEqual([true, true]);
    },
  },
  {
    group: G1,
    title: 'number checks: min, max, int',
    async run({ s }, { expect }) {
      const n = s.number().int().min(1).max(10);
      expect(n.parse(10)).toBe(10);
      expect(issuesOf(n, 0.5)).toEqual([
        '(root) invalid_type: Expected integer, received float',
        '(root) too_small: Number must be greater than or equal to 1',
      ]);
      expect(issuesOf(n, 11)).toEqual(['(root) too_big: Number must be less than or equal to 10']);
    },
  },
  {
    group: G1,
    title: 'schemas are immutable',
    async run({ s }, { expect }) {
      const base = s.string();
      const min3 = base.min(3);
      min3.max(4);
      expect(base.parse('a')).toBe('a');
      expect(min3.parse('abcdef')).toBe('abcdef');
    },
  },
  {
    group: G1,
    title: 'literal and enum',
    async run({ s }, { expect }) {
      expect(s.literal('on').parse('on')).toBe('on');
      expect(issuesOf(s.literal('on'), 'off')).toEqual(['(root) invalid_literal: Expected "on"']);
      expect(issuesOf(s.literal(null), undefined)).toEqual(['(root) invalid_literal: Expected null']);
      const e = s.enum(['a', 'b', 3]);
      expect(e.parse(3)).toBe(3);
      expect(issuesOf(e, 'c')).toEqual(['(root) invalid_enum: Expected "a" | "b" | 3, received "c"']);
    },
  },
  {
    group: G2,
    title: 'objects: every issue collected with its path, in shape order',
    async run({ s }, { expect }) {
      const User = s.object({
        name: s.string().min(1),
        address: s.object({ city: s.string(), zip: s.string().regex(/^\d{5}$/) }),
        age: s.number(),
      });
      expect(issuesOf(User, { name: '', address: { zip: 'abc' }, age: '3' })).toEqual([
        'name too_small: String must contain at least 1 character(s)',
        'address.city invalid_type: Expected string, received undefined',
        'address.zip invalid_string: Invalid',
        'age invalid_type: Expected number, received string',
      ]);
      expect(issuesOf(User, [])).toEqual(['(root) invalid_type: Expected object, received array']);
      expect(issuesOf(User, null)).toEqual(['(root) invalid_type: Expected object, received null']);
      expect(() => s.object({ a: s.string(), b: s.object({ c: s.number() }) }).parse({ a: 1, b: { c: 'x' } }), 'message joins paths with dots')
        .toThrow('a: Expected string, received number\nb.c: Expected number, received string');
      const input = { a: 1, x: 2, y: 3 };
      const out = s.object({ a: s.number() }).parse(input);
      expect(out, 'unknown keys are stripped').toEqual({ a: 1 });
      expect(out === input, 'new object').toBe(false);
    },
  },
  {
    group: G3,
    title: 'objects: unknown keys stripped by default; strict reports; passthrough keeps; output is a new object',
    async run({ s }, { expect }) {
      const shape = { a: s.number() };
      const input = { a: 1, x: 2, y: 3 };
      const obj = s.object(shape);
      obj.strict();
      expect(obj.parse(input), 'strict() returns a new schema').toEqual({ a: 1 });
      expect(issuesOf(s.object({ o: s.object(shape).strict() }), { o: input })).toEqual(['o unrecognized_keys: Unrecognized key(s): "x", "y"']);
      expect(Object.keys(s.object({ b: s.number(), a: s.number() }).passthrough().parse({ z: 0, a: 1, b: 2 }))).toEqual(['b', 'a', 'z']);
    },
  },
  {
    group: G3,
    title: 'extend adds/overrides keys and keeps the unknown-key mode',
    async run({ s }, { expect }) {
      const Base = s.object({ id: s.number(), name: s.string() }).strict();
      const Ext = Base.extend({ name: s.string().optional(), tag: s.string() });
      expect(Ext.parse({ id: 1, tag: 't' })).toEqual({ id: 1, tag: 't' });
      expect(issuesOf(Ext, { id: 1, tag: 't', zz: 1 })).toEqual(['(root) unrecognized_keys: Unrecognized key(s): "zz"']);
      expect(issuesOf(Base, { id: 1 }), 'Base unchanged').toEqual(['name invalid_type: Expected string, received undefined']);
    },
  },
  {
    group: G2,
    title: 'arrays: item issues with index paths, then length checks; output is a new array',
    async run({ s }, { expect }) {
      const tags = s.array(s.string()).min(3);
      expect(issuesOf(tags, ['a', 1])).toEqual([
        '1 invalid_type: Expected string, received number',
        '(root) too_small: Array must contain at least 3 element(s)',
      ]);
      expect(issuesOf(s.array(s.number()).max(1), [1, 2])).toEqual(['(root) too_big: Array must contain at most 1 element(s)']);
      const input = [1, 2];
      const out = s.array(s.number()).parse(input);
      expect(out).toEqual([1, 2]);
      expect(out === input, 'new array').toBe(false);
      expect(issuesOf(s.object({ list: s.array(s.object({ v: s.number() })) }), { list: [{ v: 1 }, {}] })).toEqual([
        'list.1.v invalid_type: Expected number, received undefined',
      ]);
    },
  },
  {
    group: G3,
    title: 'optional, nullable, and absent optional keys stay absent',
    async run({ s }, { expect }) {
      expect(s.string().optional().parse(undefined)).toBeUndefined();
      expect(issuesOf(s.string().optional(), null)).toEqual(['(root) invalid_type: Expected string, received null']);
      expect(s.string().nullable().parse(null)).toBeNull();
      const out = s.object({ a: s.string().optional(), b: s.number().nullable() }).parse({ b: null });
      expect(out).toEqual({ b: null });
      expect('a' in out, 'absent key stays absent').toBe(false);
      expect('a' in s.object({ a: s.string().optional() }).parse({ a: undefined }), 'present-but-undefined key is kept').toBe(true);
    },
  },
  {
    group: G3,
    title: 'default: replaces undefined (value or factory) and is parsed by the inner schema',
    async run({ s }, { expect }) {
      const Settings = s.object({
        role: s.enum(['admin', 'user']).default('user'),
        tags: s.array(s.string()).default(() => []),
        n: s.number().min(5).default(1),
      });
      const r = Settings.safeParse({});
      expect(r.success).toBe(false);
      expect(issuesOf(Settings, {})).toEqual(['n too_small: Number must be greater than or equal to 5']);
      const a = Settings.parse({ n: 5 });
      const b = Settings.parse({ n: 5 });
      expect(a).toEqual({ role: 'user', tags: [], n: 5 });
      expect(a.tags === b.tags, 'factory called per parse').toBe(false);
      expect(() => s.string().default('x').parse(null), 'null is not undefined').toThrow('Expected string, received null');
    },
  },
  {
    group: G3,
    title: 'union: first succeeding option wins; all fail → one invalid_union issue',
    async run({ s }, { expect }) {
      const u = s.union([s.number(), s.string(), s.object({ k: s.literal('x') })]);
      expect(u.parse(4)).toBe(4);
      const ab = s.union([s.object({ a: s.number() }), s.object({ a: s.number() }).passthrough()]);
      expect(ab.parse({ a: 1, b: 2 }), 'the first option that succeeds wins').toEqual({ a: 1 });
      expect(u.parse('4')).toBe('4');
      expect(issuesOf(s.object({ v: u }), { v: { k: 'y' } })).toEqual(['v invalid_union: Invalid input']);
    },
  },
  {
    group: G4,
    title: 'refine and transform only run on valid input, in chain order',
    async run({ s }, { expect }) {
      const calls: string[] = [];
      const Pw = s.object({ pw: s.string().min(8), confirm: s.string() })
        .refine((v: any) => { calls.push('refine'); return v.pw === v.confirm; }, 'Passwords do not match')
        .transform((v: any) => { calls.push('transform'); return v.pw; });
      expect(issuesOf(Pw, { pw: 'short', confirm: 'short' })).toEqual(['pw too_small: String must contain at least 8 character(s)']);
      expect(calls).toEqual([]);
      expect(issuesOf(Pw, { pw: 'longenough', confirm: 'nope' })).toEqual(['(root) custom: Passwords do not match']);
      expect(calls).toEqual(['refine']);
      expect(Pw.parse({ pw: 'longenough', confirm: 'longenough' })).toBe('longenough');
      const n = s.string().transform((v: string) => v.length).refine((len: number) => len > 1);
      expect(n.parse('ab')).toBe(2);
      expect(issuesOf(s.array(n), ['a'])).toEqual(['0 custom: Invalid input']);
      const u = s.union([s.number().transform((v: number) => `num ${v}`), s.string()]);
      expect(u.parse(4), 'a union uses the winning option\'s transformed output').toBe('num 4');
    },
  },
  {
    group: G4,
    title: 'lazy: recursive schemas',
    async run({ s }, { expect }) {
      const Node: any = s.object({ name: s.string(), children: s.array(s.lazy(() => Node)).default(() => []) });
      expect(Node.parse({ name: 'root', children: [{ name: 'a' }, { name: 'b', children: [{ name: 'c' }] }] })).toEqual({
        name: 'root',
        children: [{ name: 'a', children: [] }, { name: 'b', children: [{ name: 'c', children: [] }] }],
      });
      expect(issuesOf(Node, { name: 'r', children: [{ name: 'a', children: [{ name: 7 }] }] })).toEqual([
        'children.0.children.0.name invalid_type: Expected string, received number',
      ]);
    },
  },
];
