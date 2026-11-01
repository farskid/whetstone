import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Matching';
const G2 = 'Scoring';
const G3 = 'Highlights';
const G4 = 'Ranking';

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'subsequences match; out-of-order or missing characters do not',
    run({ fuzzyMatch }, { expect }) {
      expect(fuzzyMatch('gst', 'git status')?.positions).toEqual([0, 4, 5]);
      expect([fuzzyMatch('tsg', 'git status'), fuzzyMatch('gitx', 'git'), fuzzyMatch('abc', '')]).toEqual([null, null, null]);
      expect(fuzzyMatch('', 'anything')).toEqual({ score: 0, positions: [], ranges: [] });
    },
  },
  {
    group: G1,
    title: 'case- and accent-insensitive, positions in the original text',
    run({ fuzzyMatch }, { expect }) {
      expect(fuzzyMatch('CAFE', 'Café Royale')).toEqual({ score: 98, positions: [0, 1, 2, 3], ranges: [[0, 4]] });
      expect(fuzzyMatch('creme', 'Cre\u0300me brûlée')?.positions, 'decomposed input keeps original indices').toEqual([0, 1, 2, 4, 5]);
      expect(fuzzyMatch('ü', 'Zurich ÜBER')?.positions, 'the separator bonus beats the earlier u').toEqual([7]);
    },
  },
  {
    group: G2,
    title: 'start, separator, camelCase and digit bonuses',
    run({ fuzzyMatch }, { expect }) {
      expect(fuzzyMatch('a', 'abc')?.score, 'start').toBe(26);
      expect(fuzzyMatch('b', 'a-b')?.score, 'separator').toBe(25);
      expect(fuzzyMatch('b', 'aB')?.score, 'camelCase').toBe(24);
      expect(fuzzyMatch('2', 'v2')?.score, 'digit after letter').toBe(24);
      expect(fuzzyMatch('x', 'v2x')?.score, 'letter after digit').toBe(24);
      expect(fuzzyMatch('b', 'ab')?.score, 'no bonus').toBe(16);
      expect(fuzzyMatch('b', 'AB')?.score, 'upper after upper is not camelCase').toBe(16);
    },
  },
  {
    group: G2,
    title: 'consecutive bonus and gap penalties',
    run({ fuzzyMatch }, { expect }) {
      expect(fuzzyMatch('xy', 'qxy')?.score, 'consecutive').toBe(40);
      expect(fuzzyMatch('xy', 'qx-y')?.score, 'gap of 1 then separator').toBe(16 + 16 + 9 - 3);
      expect(fuzzyMatch('xy', 'qxzzzy')?.score, 'gap of 3').toBe(16 + 16 - 5);
      expect(fuzzyMatch('fb', 'fooBar')?.score).toBe(46);
    },
  },
  {
    group: G2,
    title: 'the best alignment wins over the first one',
    run({ fuzzyMatch }, { expect }) {
      expect(fuzzyMatch('ab', 'a_b_ab')).toEqual({ score: 49, positions: [4, 5], ranges: [[4, 6]] });
      expect(fuzzyMatch('fb', 'foo bar fooBar')?.positions, 'start + separator beats a later camel pair').toEqual([0, 4]);
      expect(fuzzyMatch('usr', 'unused/src/router')?.positions).toEqual([0, 7, 8]);
    },
  },
  {
    group: G2,
    title: 'ties go to the earliest positions',
    run({ fuzzyMatch }, { expect }) {
      expect(fuzzyMatch('aa', 'aaa')?.positions).toEqual([0, 1]);
      expect(fuzzyMatch('x', 'qxqx')?.positions).toEqual([1]);
      expect(fuzzyMatch('ab', 'xaxbxab')?.positions, '[5,6] scores 40; [1,3] scores 29').toEqual([5, 6]);
      expect(fuzzyMatch('ac', 'abcac')?.positions, '[0,2] 39 vs [3,4] 40').toEqual([3, 4]);
      expect(fuzzyMatch('ab', 'qabqab')?.positions, 'tie at 40: earlier first position wins').toEqual([1, 2]);
      expect(fuzzyMatch('ab', 'a-b-ab-')?.positions, '[4,5] 49 beats [0,2] 48').toEqual([4, 5]);
    },
  },
  {
    group: G3,
    title: 'ranges merge adjacent positions',
    run({ fuzzyMatch }, { expect }) {
      expect(fuzzyMatch('getus', 'getUserStatus')?.ranges).toEqual([[0, 5]]);
      expect(fuzzyMatch('gus', 'get_user_status')?.ranges).toEqual([[0, 1], [4, 6]]);
    },
  },
  {
    group: G3,
    title: 'long texts are matched quickly',
    run({ fuzzyMatch }, { expect }) {
      const text = 'ab'.repeat(300) + 'x_needle';
      const t0 = Date.now();
      let m = null;
      for (let i = 0; i < 50; i++) m = fuzzyMatch('abababneedle', text);
      expect(m?.positions.slice(-6)).toEqual([602, 603, 604, 605, 606, 607]);
      expect(Date.now() - t0 < 1000, `${Date.now() - t0}ms`).toBe(true);
    },
  },
  {
    group: G4,
    title: 'results are sorted by score, ties keep input order, limit applies',
    run({ search }, { expect }) {
      const items = ['pineapple', 'grape', 'apple', 'banana', 'grapefruit'];
      expect(search(items, 'ape').map((r) => [r.item, r.score, r.refIndex])).toEqual([
        ['grape', 64, 1], ['grapefruit', 64, 4], ['apple', 62, 2], ['pineapple', 52, 0],
      ]);
      expect(search(items, 'ape', { limit: 2 }).map((r) => r.item)).toEqual(['grape', 'grapefruit']);
      expect(search(items, '').map((r) => r.item)).toEqual(items);
    },
  },
  {
    group: G4,
    title: 'weighted keys: best weighted key wins and is reported',
    run({ search }, { expect }) {
      const docs = [
        { title: 'Hello world', body: 'nothing here' },
        { title: 'Zzz', body: 'help wanted' },
        { title: 'help desk', body: 'help' },
        { title: 42, body: undefined },
      ];
      const out = search(docs as any[], 'hel', { keys: ['title', { name: 'body', weight: 2 }] });
      expect(out.map((r) => [r.refIndex, r.key, r.score])).toEqual([[1, 'body', 148], [2, 'body', 148], [0, 'title', 74]]);
      expect(search(docs as any[], 'hel', { keys: ['title', 'body'] }).map((r) => [r.refIndex, r.key])).toEqual([[0, 'title'], [1, 'body'], [2, 'title']]);
    },
  },
  {
    group: G4,
    title: 'typo mode tolerates one extra query character at −10',
    run({ search }, { expect }) {
      const items = ['javascript', 'java', 'kotlin'];
      expect(search(items, 'jvxa')).toEqual([]);
      expect(search(items, 'jvxa', { typo: true }).map((r) => [r.item, r.score, r.positions])).toEqual([
        ['javascript', 53, [0, 2, 3]],
        ['java', 53, [0, 2, 3]],
      ]);
      expect(search(items, 'jv', { typo: true }).map((r) => r.item), 'exact matches still work').toEqual(['javascript', 'java']);
      expect(search(['java'], 'jx', { typo: true }), 'short queries never use typo mode').toEqual([]);
      expect(search(['kotlin'], 'kotlinx', { typo: true })[0].score, 'only one deletion').toBe(26 + 24 * 5 - 10);
      expect(search(['kotlin'], 'kxotlinx', { typo: true })).toEqual([]);
      expect(search(['java'], 'java', { typo: true })[0].score, 'exact matches are not penalised').toBe(26 + 24 * 3);
    },
  },
];
