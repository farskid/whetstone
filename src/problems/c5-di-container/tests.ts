import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Values and factories';
const G2 = 'Classes and lifetimes';
const G3 = 'Child containers';
const G4 = 'Safety, async, dispose';

const DISPOSE: symbol = (Symbol as any).asyncDispose ?? Symbol.for('Symbol.asyncDispose');

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'useValue and useFactory; factories are transient by default and get a resolver',
    run({ Container }, { expect }) {
      const c = new Container();
      const URL = Symbol('url');
      let made = 0;
      c.register(URL, { useValue: 'pg://db' });
      c.register('client', { useFactory: (r) => ({ n: ++made, url: r.resolve<string>(URL) }) });
      const a = c.resolve<{ n: number; url: string }>('client');
      const b = c.resolve<{ n: number; url: string }>('client');
      expect([a.n, b.n, a.url]).toEqual([1, 2, 'pg://db']);
      expect(c.resolve(URL)).toBe('pg://db');
    },
  },
  {
    group: G1,
    title: 'a provider needs exactly one kind; missing tokens throw; re-register replaces',
    run({ Container }, { expect }) {
      const c = new Container();
      expect(() => c.register('x', {} as any)).toThrow();
      expect(() => c.register('x', { useValue: 1, useFactory: () => 2 } as any)).toThrow();
      expect(() => c.resolve('nothing')).toThrow('No provider for nothing');
      c.register('x', { useValue: 1 });
      c.register('x', { useValue: 2 });
      expect(c.resolve('x')).toBe(2);
      c.register('u', { useValue: undefined });
      expect(c.resolve('u'), 'undefined is a valid value').toBeUndefined();
    },
  },
  {
    group: G2,
    title: 'useClass resolves static inject deps recursively',
    run({ Container }, { expect }) {
      class Config { url = 'pg://'; }
      class Db { static inject = [Config, 'pool']; constructor(public cfg: Config, public pool: number) {} }
      class Repo { static inject = [Db]; constructor(public db: Db) {} }
      class Leaf { args: unknown[]; constructor(...args: unknown[]) { this.args = args; } }
      const c = new Container()
        .register(Config, { useClass: Config })
        .register('pool', { useValue: 4 })
        .register(Db, { useClass: Db })
        .register(Repo, { useClass: Repo })
        .register(Leaf, { useClass: Leaf });
      const repo = c.resolve(Repo);
      expect(repo).toBeInstanceOf(Repo);
      expect([repo.db.cfg.url, repo.db.pool]).toEqual(['pg://', 4]);
      expect(c.resolve(Leaf).args, 'no inject: no args').toEqual([]);
    },
  },
  {
    group: G2,
    title: 'singleton vs transient lifetimes',
    run({ Container }, { expect }) {
      class Svc { static count = 0; id = ++Svc.count; }
      class Uses { static inject = [Svc]; constructor(public svc: Svc) {} }
      const c = new Container().register(Svc, { useClass: Svc, lifetime: 'singleton' }).register(Uses, { useClass: Uses });
      const u1 = c.resolve(Uses), u2 = c.resolve(Uses);
      expect(u1 === u2, 'Uses is transient').toBe(false);
      expect(u1.svc === u2.svc && u1.svc === c.resolve(Svc), 'Svc is shared').toBe(true);
      let n = 0;
      c.register('f', { useFactory: () => ({ n: ++n }), lifetime: 'singleton' });
      expect(c.resolve('f')).toBe(c.resolve('f'));
      expect(n).toBe(1);
    },
  },
  {
    group: G3,
    title: 'a child overrides or falls back to its parent',
    run({ Container }, { expect }) {
      const root = new Container().register('a', { useValue: 'root a' }).register('b', { useValue: 'root b' });
      const child = root.createChild().register('a', { useValue: 'child a' });
      const grand = child.createChild();
      expect([child.resolve('a'), child.resolve('b'), grand.resolve('a'), root.resolve('a')]).toEqual(['child a', 'root b', 'child a', 'root a']);
      expect(() => root.resolve('only-in-child')).toThrow();
    },
  },
  {
    group: G3,
    title: 'scoped instances are one per resolving container',
    run({ Container }, { expect }) {
      class Req { static n = 0; id = ++Req.n; }
      const root = new Container().register(Req, { useClass: Req, lifetime: 'scoped' });
      const c1 = root.createChild(), c2 = root.createChild();
      expect(c1.resolve(Req)).toBe(c1.resolve(Req));
      expect(c1.resolve(Req) === c2.resolve(Req)).toBe(false);
      expect(root.resolve(Req) === c1.resolve(Req), 'root is its own scope').toBe(false);
      expect(root.resolve(Req)).toBe(root.resolve(Req));
    },
  },
  {
    group: G3,
    title: 'a singleton resolved from a child lives in, and is wired from, the registering container',
    run({ Container }, { expect }) {
      class Cache { static inject = ['region']; constructor(public region: string) {} }
      const root = new Container().register('region', { useValue: 'eu' }).register(Cache, { useClass: Cache, lifetime: 'singleton' });
      const child = root.createChild().register('region', { useValue: 'us' });
      const fromChild = child.resolve(Cache);
      expect(fromChild.region, 'deps come from the root').toBe('eu');
      expect(root.resolve(Cache)).toBe(fromChild);
      const other = root.createChild();
      expect(other.resolve(Cache)).toBe(fromChild);
      child.register(Cache, { useClass: Cache, lifetime: 'singleton' });
      expect(child.resolve(Cache).region, 'own registration: own singleton').toBe('us');
      expect(child.resolve(Cache) === fromChild).toBe(false);
    },
  },
  {
    group: G4,
    title: 'captive dependency: scoped inside a singleton throws, even through a transient',
    run({ Container }, { expect }) {
      class Scoped {}
      class Mid { static inject = [Scoped]; constructor(public s: Scoped) {} }
      class Single { static inject = [Mid]; constructor(public m: Mid) {} }
      const root = new Container()
        .register(Scoped, { useClass: Scoped, lifetime: 'scoped' })
        .register(Mid, { useClass: Mid })
        .register(Single, { useClass: Single, lifetime: 'singleton' });
      const child = root.createChild();
      expect(() => child.resolve(Single)).toThrow('Captive dependency');
      expect(child.resolve(Mid).s, 'fine outside a singleton').toBe(child.resolve(Scoped));
      root.register('s2', { useFactory: (r) => r.resolve(Scoped), lifetime: 'singleton' });
      expect(() => root.resolve('s2')).toThrow('Captive dependency');
    },
  },
  {
    group: G4,
    title: 'circular dependencies and missing deps name the chain',
    run({ Container }, { expect }) {
      class A { static inject: unknown[] = []; }
      class B { static inject = [A]; }
      A.inject = [B];
      class App { static inject = ['service']; }
      const c = new Container()
        .register(A, { useClass: A })
        .register(B, { useClass: B })
        .register(App, { useClass: App })
        .register('service', { useFactory: (r) => r.resolve('Missing') });
      expect(() => c.resolve(A)).toThrow('Circular dependency: A -> B -> A');
      expect(() => c.resolve(App)).toThrow('No provider for Missing (App -> service -> Missing)');
    },
  },
  {
    group: G4,
    title: 'resolveAsync awaits async factories; resolve refuses them',
    async run({ Container }, { expect, deferred }) {
      const d = deferred<string>();
      let calls = 0;
      class Uses { static inject = ['conn']; constructor(public conn: string) {} }
      const c = new Container()
        .register('conn', { useFactory: () => { calls++; return d.promise; }, lifetime: 'singleton' })
        .register(Uses, { useClass: Uses });
      expect(() => c.resolve(Uses)).toThrow('resolveAsync');
      calls = 0;
      const p1 = c.resolveAsync(Uses);
      const p2 = c.resolveAsync<string>('conn');
      d.resolve('connected');
      const [u, conn] = await Promise.all([p1, p2]);
      expect([u.conn, conn, calls]).toEqual(['connected', 'connected', 1]);
      expect(c.resolve<string>('conn'), 'sync resolve after it exists').toBe('connected');
    },
  },
  {
    group: G4,
    title: 'a failed async creation is not cached',
    async run({ Container }, { expect }) {
      let attempt = 0;
      const c = new Container().register('flaky', {
        useFactory: async () => { if (++attempt === 1) throw new Error('first try fails'); return 'ok'; },
        lifetime: 'singleton',
      });
      await expect(c.resolveAsync('flaky')).toReject('first try fails');
      expect(await c.resolveAsync('flaky')).toBe('ok');
      await expect(c.resolveAsync('nope')).toReject('No provider for nope');
    },
  },
  {
    group: G4,
    title: 'dispose: reverse creation order, only cached instances, child leaves parent alone',
    async run({ Container }, { expect }) {
      const log: string[] = [];
      const disposable = (name: string) => class { async [DISPOSE]() { await Promise.resolve(); log.push(name); } };
      const Db = disposable('db');
      const Repo = class extends disposable('repo') { static inject = [Db]; };
      const Temp = disposable('temp');
      const Req = disposable('req');
      const root = new Container()
        .register(Db, { useClass: Db, lifetime: 'singleton' })
        .register(Repo, { useClass: Repo, lifetime: 'singleton' })
        .register(Temp, { useClass: Temp })
        .register(Req, { useClass: Req, lifetime: 'scoped' })
        .register('value', { useValue: new (disposable('value'))() });
      root.resolve(Repo);
      root.resolve(Temp);
      root.resolve('value');
      const child = root.createChild();
      child.resolve(Req);
      child.resolve(Db);
      await child.dispose();
      expect(log, 'child disposes only its scoped instance').toEqual(['req']);
      root.resolve(Req);
      await root.dispose();
      expect(log).toEqual(['req', 'req', 'repo', 'db']);
      await root.dispose();
      expect(log.length).toBe(4);
      expect(() => root.resolve(Db)).toThrow();
    },
  },
];
