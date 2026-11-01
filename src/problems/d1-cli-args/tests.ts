import type { TestCase } from '../../runner/types';
import type { CliSpec } from './solution';
type M = typeof import('./solution');

const G1 = 'Schema-less parsing';
const G2 = 'Schema';
const G3 = 'Subcommands and errors';
const G4 = 'Help and suggestions';

const git = (): CliSpec => ({
  name: 'git',
  options: { verbose: { type: 'boolean', alias: 'v', description: 'Verbose output' } },
  commands: {
    remote: {
      description: 'Manage remotes',
      commands: {
        add: {
          description: 'Add a remote',
          options: {
            name: { type: 'string', required: true, description: 'Remote name' },
            depth: { type: 'number', default: 1, description: 'Fetch depth' },
            tag: { type: 'array', alias: ['t', 'label'] },
            fetch: { type: 'boolean', alias: 'f' },
          },
        },
      },
    },
    commit: { options: { message: { type: 'string', alias: 'm' }, verbose: { type: 'number' } } },
  },
});

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'long, short, grouped flags and positionals',
    run({ parseArgs }, { expect }) {
      expect(parseArgs(['--a=1', '--b', '2', '-xyz', 'pos1', '-n', 'x', '--name=a=b', '--c', '--d', 'last'])).toEqual({
        _: ['pos1'], a: 1, b: 2, x: true, y: true, z: true, n: 'x', name: 'a=b', c: true, d: 'last',
      });
      expect(parseArgs(['-abc=1'])).toEqual({ _: [], a: true, b: true, c: 1 });
      expect(parseArgs(['--no-color', 'file'])).toEqual({ _: ['file'], color: false });
      expect(parseArgs(['3', '--v', '1.50'])).toEqual({ _: ['3'], v: 1.5 });
    },
  },
  {
    group: G1,
    title: 'negative numbers are values, -- stops parsing, repeats become arrays',
    run({ parseArgs }, { expect }) {
      expect(parseArgs(['--n', '-5', '-7', '-'])).toEqual({ _: ['-7', '-'], n: -5 });
      expect(parseArgs(['--x', '--', '--y', '-z', 'w'])).toEqual({ _: ['--y', '-z', 'w'], x: true });
      expect(parseArgs(['--t', 'a', '--t', 'b', '-t', '--t=3'])).toEqual({ _: [], t: ['a', 'b', true, 3] });
    },
  },
  {
    group: G2,
    title: 'types, aliases and defaults; boolean followed by a positional',
    run({ createCli }, { expect }) {
      const cli = createCli({
        name: 'tool',
        options: {
          verbose: { type: 'boolean', alias: 'v' },
          count: { type: 'number', alias: ['c', 'num'], default: 3 },
          out: { type: 'string', alias: 'o' },
          inc: { type: 'array', alias: 'I' },
        },
      });
      expect(cli.parse(['--verbose', 'file.txt', '-o', '123', '-I', 'a', '--inc=b', '--num', '-2'])).toEqual({
        command: [], options: { verbose: true, out: '123', inc: ['a', 'b'], count: -2 }, _: ['file.txt'], errors: [],
      });
      expect(cli.parse([]).options).toEqual({ count: 3 });
      expect(cli.parse(['-o', 'a', '--out', 'b']).options.out, 'last wins').toBe('b');
      const lv = createCli({ name: 'x', options: { level: { type: 'string', required: true, default: 'info' } } }).parse([]);
      expect(lv.errors, 'a default satisfies required').toEqual([]);
      expect(lv.options).toEqual({ level: 'info' });
    },
  },
  {
    group: G2,
    title: '--no-flag, boolean =values and short groups',
    run({ createCli }, { expect }) {
      const cli = createCli({
        name: 'tool',
        options: { all: { type: 'boolean', alias: 'a' }, force: { type: 'boolean', alias: 'f' }, n: { type: 'number' } },
      });
      expect(cli.parse(['--no-all', '--force=false']).options).toEqual({ all: false, force: false });
      expect(cli.parse(['-afn=4']).options).toEqual({ all: true, force: true, n: 4 });
      expect(cli.parse(['-fn', '7']).options).toEqual({ force: true, n: 7 });
      const bad = cli.parse(['-nf', '--all=yes', '--no-n']);
      expect(bad.errors).toEqual(['Missing value for --n', 'Invalid boolean for --all: yes', 'Unknown option: --no-n']);
    },
  },
  {
    group: G3,
    title: 'nested subcommands with inherited options',
    run({ createCli }, { expect }) {
      const cli = createCli(git());
      expect(cli.parse(['-v', 'remote', 'add', '-ft', 'x', '--label', 'y', '--name', 'origin', 'url', 'add'])).toEqual({
        command: ['remote', 'add'], options: { verbose: true, fetch: true, tag: ['x', 'y'], name: 'origin', depth: 1 }, _: ['url', 'add'], errors: [],
      });
      const c = cli.parse(['commit', '--verbose', '2', '-m', 'msg']);
      expect(c.options, "a child's option overrides its parent's").toEqual({ verbose: 2, message: 'msg' });
      expect(cli.parse(['remote']).command).toEqual(['remote']);
      expect(cli.parse(['--', 'remote'])).toEqual({ command: [], options: {}, _: ['remote'], errors: [] });
    },
  },
  {
    group: G3,
    title: 'unknown, missing and invalid values are all collected, never thrown',
    run({ createCli }, { expect }) {
      const cli = createCli(git());
      const r = cli.parse(['remote', 'add', '--depth', 'deep', '-q', '--name', '--x=1', 'url']);
      expect(r.errors).toEqual([
        'Invalid number for --depth: deep',
        'Unknown option: -q',
        'Missing value for --name',
        'Unknown option: --x',
        'Missing required option: --name',
      ]);
      expect(r.options).toEqual({ depth: 1 });
      expect(cli.parse(['commit', '--name', 'x']).errors, 'options of other branches are unknown').toEqual(['Unknown option: --name']);
    },
  },
  {
    group: G4,
    title: '"did you mean" for options and commands',
    run({ createCli }, { expect }) {
      const cli = createCli(git());
      expect(cli.parse(['remote', 'add', '--nmae', 'o', '--verbos', '--lable', 'x', '--zzzzzz']).errors).toEqual([
        'Unknown option: --nmae. Did you mean --name?',
        'Unknown option: --verbos. Did you mean --verbose?',
        'Unknown option: --lable. Did you mean --label?',
        'Unknown option: --zzzzzz',
        'Missing required option: --name',
      ]);
      const r = cli.parse(['remot', 'add']);
      expect(r.errors).toEqual(['Unknown command: remot. Did you mean remote?']);
      expect(r._).toEqual(['remot', 'add']);
      expect(cli.parse(['push']).errors).toEqual(['Unknown command: push']);
      const tie = createCli({ name: 't', options: { abd: { type: 'boolean' }, abc: { type: 'boolean' } } });
      expect(tie.parse(['--abx']).errors, 'ties go to the earlier option').toEqual(['Unknown option: --abx. Did you mean --abd?']);
    },
  },
  {
    group: G4,
    title: 'help text for a leaf command',
    run({ createCli }, { expect }) {
      expect(createCli(git()).help(['remote', 'add'])).toBe(
        [
          'Usage: git remote add [options]',
          '',
          'Add a remote',
          '',
          'Options:',
          '  -v, --verbose  Verbose output',
          '  --name <string>  Remote name (required)',
          '  --depth <number>  Fetch depth (default: 1)',
          '  -t, --label, --tag <string...>',
          '  -f, --fetch',
        ].join('\n'),
      );
    },
  },
  {
    group: G4,
    title: 'help text for the root and bad paths',
    run({ createCli }, { expect }) {
      const cli = createCli(git());
      expect(cli.help()).toBe(
        ['Usage: git <command> [options]', '', 'Commands:', '  remote  Manage remotes', '  commit', '', 'Options:', '  -v, --verbose  Verbose output'].join('\n'),
      );
      expect(createCli({ name: 'bare' }).help()).toBe('Usage: bare [options]');
      expect(() => cli.help(['remote', 'rm'])).toThrow('Unknown command: rm');
    },
  },
];
