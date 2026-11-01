import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Parse and compare';
const G2 = 'Caret, tilde, comparators';
const G3 = 'X-ranges, hyphens, unions';
const G4 = 'maxSatisfying and prereleases';

function check(mod: M, expect: Parameters<TestCase<M>['run']>[1]['expect'], range: string, yes: string[], no: string[]) {
  for (const v of yes) expect(mod.satisfies(v, range), `${v} satisfies ${range}`).toBe(true);
  for (const v of no) expect(mod.satisfies(v, range), `${v} does not satisfy ${range}`).toBe(false);
}

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'parse splits prerelease and build; invalid input is null',
    run({ parse }, { expect }) {
      expect(parse('1.2.3-alpha.1+build.05')).toEqual({ major: 1, minor: 2, patch: 3, prerelease: ['alpha', 1], build: ['build', '05'] });
      expect(parse(' v2.0.10 ')).toEqual({ major: 2, minor: 0, patch: 10, prerelease: [], build: [] });
      expect(parse('1.0.0-x-y.0a')!.prerelease).toEqual(['x-y', '0a']);
      for (const bad of ['1.2', '01.2.3', '1.2.3-01', '1.2.3-', '1.2.3+', 'a.b.c', '1.2.3.4', '']) expect(parse(bad), bad).toBeNull();
    },
  },
  {
    group: G1,
    title: 'prerelease precedence (the semver.org example chain)',
    run({ compare }, { expect }) {
      const chain = ['1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-alpha.beta', '1.0.0-beta', '1.0.0-beta.2', '1.0.0-beta.11', '1.0.0-rc.1', '1.0.0', '1.0.1', '1.1.0', '1.10.0', '2.0.0'];
      for (let i = 0; i + 1 < chain.length; i++) {
        expect(compare(chain[i], chain[i + 1]), `${chain[i]} < ${chain[i + 1]}`).toBe(-1);
        expect(compare(chain[i + 1], chain[i])).toBe(1);
      }
    },
  },
  {
    group: G1,
    title: 'build metadata is ignored; invalid versions throw',
    run({ compare }, { expect }) {
      expect(compare('1.0.0+a', '1.0.0+b')).toBe(0);
      expect(compare('v1.0.0-rc.1+x', '1.0.0-rc.1')).toBe(0);
      expect(() => compare('1.0', '1.0.0')).toThrow('Invalid version');
    },
  },
  {
    group: G2,
    title: 'caret keeps the left-most non-zero part',
    run(mod, { expect }) {
      check(mod, expect, '^1.2.3', ['1.2.3', '1.9.9', '1.10.0'], ['1.2.2', '2.0.0']);
      check(mod, expect, '^0.2.3', ['0.2.3', '0.2.99'], ['0.3.0', '0.2.2']);
      check(mod, expect, '^0.0.3', ['0.0.3'], ['0.0.4', '0.0.2', '0.1.0']);
      check(mod, expect, '^1.2', ['1.2.0', '1.99.0'], ['1.1.9', '2.0.0']);
      check(mod, expect, '^0.0', ['0.0.0', '0.0.9'], ['0.1.0']);
      check(mod, expect, '^0.x', ['0.0.1', '0.9.0'], ['1.0.0']);
    },
  },
  {
    group: G2,
    title: 'tilde and plain comparators, ANDed by spaces',
    run(mod, { expect }) {
      check(mod, expect, '~1.2.3', ['1.2.3', '1.2.9'], ['1.3.0', '1.2.2']);
      check(mod, expect, '~1.2', ['1.2.0', '1.2.9'], ['1.3.0']);
      check(mod, expect, '~1', ['1.0.0', '1.9.0'], ['2.0.0', '0.9.9']);
      check(mod, expect, '>=1.2.0 <2', ['1.2.0', '1.99.9'], ['2.0.0', '1.1.9']);
      check(mod, expect, '>= 1.2.0  < 2', ['1.5.0'], ['2.0.0']);
      check(mod, expect, '>1.2', ['1.3.0'], ['1.2.9', '1.2.0']);
      check(mod, expect, '<=1.2', ['1.2.9', '0.1.0'], ['1.3.0']);
      check(mod, expect, '>1.2.3 <=1.2.5', ['1.2.4', '1.2.5'], ['1.2.3', '1.2.6']);
      check(mod, expect, '=1.2.3', ['1.2.3', '1.2.3+build'], ['1.2.4']);
    },
  },
  {
    group: G3,
    title: 'x-ranges and *',
    run(mod, { expect }) {
      check(mod, expect, '1.x', ['1.0.0', '1.99.0'], ['2.0.0', '0.9.0']);
      check(mod, expect, '1.2.*', ['1.2.0', '1.2.7'], ['1.3.0']);
      check(mod, expect, '1', ['1.4.0'], ['2.0.0']);
      check(mod, expect, '*', ['0.0.0', '99.1.2'], []);
      check(mod, expect, '', ['3.2.1'], []);
    },
  },
  {
    group: G3,
    title: 'hyphen ranges and || unions',
    run(mod, { expect }) {
      check(mod, expect, '1.2 - 2.3.4', ['1.2.0', '2.3.4'], ['1.1.9', '2.3.5']);
      check(mod, expect, '1.2.3 - 2.3', ['1.2.3', '2.3.9'], ['2.4.0', '1.2.2']);
      check(mod, expect, '1.2.3 - 2', ['2.9.9'], ['3.0.0']);
      check(mod, expect, '1.x || >=3.1 <4 || 0.0.1', ['1.5.0', '3.1.0', '0.0.1'], ['2.0.0', '3.0.9', '4.0.0', '0.0.2']);
    },
  },
  {
    group: G3,
    title: 'invalid inputs return false instead of throwing',
    run({ satisfies }, { expect }) {
      expect(satisfies('1.2', '*')).toBe(false);
      expect(satisfies('1.2.3', 'not a range')).toBe(false);
      expect(satisfies('1.2.3', '^1.2.3.4')).toBe(false);
      expect(satisfies('1.2.3', '>=1.0.0 - 2')).toBe(false);
    },
  },
  {
    group: G4,
    title: 'prereleases match only when a comparator opts in on the same tuple',
    run(mod, { expect }) {
      check(mod, expect, '>=1.2.4-alpha', ['1.2.4-beta', '1.2.4', '1.3.0'], ['1.2.5-beta', '1.2.4-0']);
      check(mod, expect, '^1.2.3', [], ['1.5.0-rc.1', '2.0.0-beta', '1.2.3-beta']);
      check(mod, expect, '^1.2.3-rc.1', ['1.2.3-rc.2', '1.2.3', '1.9.0'], ['1.2.3-rc.0', '1.2.4-rc.1']);
      check(mod, expect, '1.2.3-beta.2 - 1.2.3', ['1.2.3-beta.10'], ['1.2.3-alpha']);
      check(mod, expect, '>=1.0.0 <1.2.3-rc.0 || 1.2.4-pre', ['1.2.4-pre', '1.2.3-beta'], ['1.2.2-beta', '1.2.4-pre.1']);
    },
  },
  {
    group: G4,
    title: 'maxSatisfying picks the highest match and skips invalid versions',
    run({ maxSatisfying }, { expect }) {
      const vs = ['1.2.3', '1.4.0', '1.10.1', 'banana', '2.0.0', '1.11.0-beta', 'v1.10.0'];
      expect(maxSatisfying(vs, '^1.2')).toBe('1.10.1');
      expect(maxSatisfying(vs, '~1.2 || 2.x')).toBe('2.0.0');
      expect(maxSatisfying(vs, '>=1.11.0-alpha <1.12')).toBe('1.11.0-beta');
      expect(maxSatisfying(vs, '^3')).toBeNull();
      expect(maxSatisfying(vs, 'nope')).toBeNull();
      expect(maxSatisfying(['1.0.0', '1.0.0+b'], '1')).toBe('1.0.0');
    },
  },
];
