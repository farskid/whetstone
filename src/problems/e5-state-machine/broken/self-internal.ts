// Bug: self-transitions do not exit and re-enter
export type Ctx = Record<string, any>;
export interface EventObject { type: string; [key: string]: any }
export type Event = string | EventObject;
export type ActionFn = (context: Ctx, event: EventObject) => void;
export interface AssignAction { type: 'assign'; assignment: ((context: Ctx, event: EventObject) => Partial<Ctx>) | Record<string, ((context: Ctx, event: EventObject) => unknown) | string | number | boolean | null | undefined | object> }
export type Action = string | ActionFn | AssignAction;
export type Guard = string | ((context: Ctx, event: EventObject) => boolean);
export interface TransitionConfig { target?: string; guard?: Guard; actions?: Action | Action[] }
export type TransitionSpec = string | TransitionConfig | (string | TransitionConfig)[];

export interface StateNodeConfig {
  initial?: string;
  type?: 'final';
  states?: Record<string, StateNodeConfig>;
  on?: Record<string, TransitionSpec>;
  entry?: Action | Action[];
  exit?: Action | Action[];
  onDone?: TransitionSpec;
  after?: Record<number, TransitionSpec>;
  invoke?: { src: (context: Ctx, event: EventObject) => Promise<unknown>; onDone?: TransitionSpec; onError?: TransitionSpec };
}
export interface MachineConfig extends StateNodeConfig { id?: string; context?: Ctx }
export interface MachineOptions { guards?: Record<string, (context: Ctx, event: EventObject) => boolean>; actions?: Record<string, ActionFn> }

export interface MachineState {
  value: string;
  context: Ctx;
  actions: (string | ActionFn)[];
  event: EventObject;
  changed: boolean;
  done: boolean;
  entered: string[];
  exited: string[];
  matches(path: string): boolean;
}

export interface Machine {
  initialState: MachineState;
  transition(state: MachineState, event: Event): MachineState;
  options: MachineOptions;
  config: MachineConfig;
}

export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface Service {
  start(): Service;
  send(event: Event): void;
  readonly state: MachineState;
  subscribe(listener: (state: MachineState) => void): () => void;
  stop(): void;
}

export function assign(assignment: AssignAction['assignment']): AssignAction {
  return { type: 'assign', assignment };
}

export const afterEvent = (delay: number, path: string) => `xstate.after(${delay})#${path}`;
export const doneInvokeEvent = (path: string) => `done.invoke.${path}`;
export const errorInvokeEvent = (path: string) => `error.platform.${path}`;

interface Node {
  key: string;
  path: string[];
  id: string;
  config: StateNodeConfig;
  parent: Node | null;
  children: Map<string, Node>;
  on: Map<string, TransitionConfig[]>;
}

const toArray = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const toTransitions = (spec: TransitionSpec | undefined): TransitionConfig[] =>
  toArray(spec as any).map((t: string | TransitionConfig) => (typeof t === 'string' ? { target: t } : t));

function buildNode(key: string, config: StateNodeConfig, parent: Node | null): Node {
  const path = parent ? [...parent.path, key] : [];
  const node: Node = { key, path, id: path.join('.'), config, parent, children: new Map(), on: new Map() };
  for (const [type, spec] of Object.entries(config.on ?? {})) node.on.set(type, toTransitions(spec));
  for (const [delay, spec] of Object.entries(config.after ?? {})) node.on.set(afterEvent(Number(delay), node.id), toTransitions(spec));
  if (config.invoke) {
    node.on.set(doneInvokeEvent(node.id), toTransitions(config.invoke.onDone));
    node.on.set(errorInvokeEvent(node.id), toTransitions(config.invoke.onError));
  }
  for (const [k, c] of Object.entries(config.states ?? {})) node.children.set(k, buildNode(k, c, node));
  if (node.children.size > 0) {
    if (!config.initial || !node.children.has(config.initial)) throw new Error(`State "${node.id || '(machine)'}" needs a valid initial state`);
  }
  return node;
}

export function createMachine(config: MachineConfig, options: MachineOptions = {}): Machine {
  const root = buildNode('', config, null);

  const nodeAt = (path: string[]): Node => {
    let n = root;
    for (const k of path) {
      const c = n.children.get(k);
      if (!c) throw new Error(`Unknown state "${path.join('.')}"`);
      n = c;
    }
    return n;
  };

  const resolveTarget = (source: Node, target: string): Node => {
    if (target.startsWith('#')) return nodeAt(target.slice(1).split('.').filter(Boolean));
    const scope = source.parent ?? root;
    const parts = target.split('.');
    let n = scope.children.get(parts[0]);
    if (!n) throw new Error(`Unknown target "${target}" from "${source.id}"`);
    for (const k of parts.slice(1)) n = nodeAt([...n.path, k]);
    return n;
  };

  const guardPasses = (guard: Guard | undefined, ctx: Ctx, ev: EventObject) => {
    if (guard === undefined) return true;
    const fn = typeof guard === 'string' ? options.guards?.[guard] : guard;
    if (!fn) throw new Error(`Unknown guard "${guard}"`);
    return fn(ctx, ev);
  };

  function makeState(leaf: Node, context: Ctx, actions: (string | ActionFn)[], event: EventObject, changed: boolean, done: boolean, entered: string[], exited: string[]): MachineState {
    const value = leaf.id;
    return {
      value, context, actions, event, changed, done, entered, exited,
      matches: (p: string) => value === p || value.startsWith(p + '.'),
    };
  }

  class Run {
    actions: (string | ActionFn)[] = [];
    entered: string[] = [];
    exited: string[] = [];
    constructor(public context: Ctx, public event: EventObject) {}
    exec(list: Action | Action[] | undefined) {
      for (const a of toArray(list)) {
        if (typeof a === 'object' && a.type === 'assign') {
          const upd = typeof a.assignment === 'function'
            ? a.assignment(this.context, this.event)
            : Object.fromEntries(Object.entries(a.assignment).map(([k, v]) => [k, typeof v === 'function' ? v(this.context, this.event) : v]));
          this.context = { ...this.context, ...upd };
        } else this.actions.push(a as string | ActionFn);
      }
    }
    enterFrom(domain: Node, target: Node): Node {
      const chain: Node[] = [];
      for (let n: Node | null = target; n && n !== domain; n = n.parent) chain.unshift(n);
      let leaf = target;
      while (leaf.children.size > 0) {
        leaf = leaf.children.get(leaf.config.initial!)!;
        chain.push(leaf);
      }
      for (const n of chain) {
        this.entered.push(n.id);
        this.exec(n.config.entry);
      }
      return leaf;
    }
  }

  /** After entering `leaf`, follow final-state completion. Returns [leaf, done]. */
  function settle(run: Run, leaf: Node): [Node, boolean] {
    for (let guard = 0; guard < 1000; guard++) {
      if (leaf.config.type !== 'final') return [leaf, false];
      const parent = leaf.parent!;
      if (parent === root) return [leaf, true];
      const doneEvent: EventObject = { type: `done.state.${parent.id}` };
      const t = toTransitions(parent.config.onDone).find((c) => guardPasses(c.guard, run.context, doneEvent));
      if (!t) return [leaf, false];
      run.event = doneEvent;
      leaf = take(run, leaf, parent, t);
    }
    throw new Error('Too many done transitions');
  }

  function take(run: Run, leaf: Node, source: Node, t: TransitionConfig): Node {
    if (t.target === undefined) {
      run.exec(t.actions);
      return leaf;
    }
    const target = resolveTarget(source, t.target);
    if (target === source) { run.exec(t.actions); return leaf; }
    let domain: Node = source.parent ?? root;
    while (!(target.path.length > domain.path.length && domain.path.every((k, i) => target.path[i] === k))) domain = domain.parent!;
    for (let n: Node | null = leaf; n && n !== domain; n = n.parent) {
      run.exited.push(n.id);
      run.exec(n.config.exit);
    }
    run.exec(t.actions);
    return run.enterFrom(domain, target);
  }

  const initRun = new Run({ ...(config.context ?? {}) }, { type: 'xstate.init' });
  const [initLeaf, initDone] = settle(initRun, initRun.enterFrom(root, nodeAt([config.initial!])));
  const initialState = makeState(initLeaf, initRun.context, initRun.actions, initRun.event, true, initDone, initRun.entered, initRun.exited);

  function transition(state: MachineState, event: Event): MachineState {
    const ev: EventObject = typeof event === 'string' ? { type: event } : event;
    const unchanged = () => makeState(nodeAt(state.value.split('.')), state.context, [], ev, false, state.done, [], []);
    if (state.done) return unchanged();
    const leaf = nodeAt(state.value.split('.'));
    for (let source: Node | null = leaf; source; source = source.parent) {
      const candidates = source.on.get(ev.type);
      if (!candidates) continue;
      const t = candidates.find((c) => guardPasses(c.guard, state.context, ev));
      if (!t) continue;
      const run = new Run(state.context, ev);
      const [next, done] = settle(run, take(run, leaf, source, t));
      return makeState(next, run.context, run.actions, ev, true, done, run.entered, run.exited);
    }
    return unchanged();
  }

  return { initialState, transition, options, config };
}

export function interpret(machine: Machine, opts: { clock?: Clock } = {}): Service {
  const clock: Clock = opts.clock ?? { now: () => Date.now(), setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: (h) => clearTimeout(h as any) };
  let state = machine.initialState;
  let running = false;
  const listeners = new Set<(s: MachineState) => void>();
  const tokens = new Map<string, number>();
  const timers = new Map<string, unknown[]>();
  const nodeConfigs = new Map<string, StateNodeConfig>();

  const configFor = (path: string) => {
    if (!nodeConfigs.has(path)) {
      let c: StateNodeConfig = machine.config;
      for (const k of path.split('.')) c = c.states![k];
      nodeConfigs.set(path, c);
    }
    return nodeConfigs.get(path)!;
  };

  const runActions = (s: MachineState) => {
    for (const a of s.actions) {
      const fn = typeof a === 'string' ? machine.options.actions?.[a] : a;
      if (fn) fn(s.context, s.event);
    }
  };

  const deactivate = (path: string) => {
    tokens.set(path, (tokens.get(path) ?? 0) + 1);
    for (const h of timers.get(path) ?? []) clock.clearTimeout(h);
    timers.delete(path);
  };

  const activate = (path: string, s: MachineState) => {
    const token = (tokens.get(path) ?? 0) + 1;
    tokens.set(path, token);
    const cfg = configFor(path);
    const live = () => running && tokens.get(path) === token;
    for (const delay of Object.keys(cfg.after ?? {})) {
      const h = clock.setTimeout(() => { if (live()) send({ type: afterEvent(Number(delay), path) }); }, Number(delay));
      timers.set(path, [...(timers.get(path) ?? []), h]);
    }
    if (cfg.invoke) {
      let p: Promise<unknown>;
      try {
        p = Promise.resolve(cfg.invoke.src(s.context, s.event));
      } catch (e) {
        p = Promise.reject(e);
      }
      p.then(
        (data) => { if (live()) send({ type: doneInvokeEvent(path), data }); },
        (data) => { if (live()) send({ type: errorInvokeEvent(path), data }); },
      );
    }
  };

  const apply = (s: MachineState) => {
    state = s;
    for (const p of s.exited) deactivate(p);
    runActions(s);
    for (const p of s.entered) activate(p, s);
    for (const l of [...listeners]) l(s);
  };

  function send(event: Event) {
    if (!running) return;
    const next = machine.transition(state, event);
    if (!next.changed) return;
    apply(next);
  }

  const service: Service = {
    start() {
      if (running) return service;
      running = true;
      apply(machine.initialState);
      return service;
    },
    send,
    get state() { return state; },
    subscribe(l) {
      listeners.add(l);
      return () => { listeners.delete(l); };
    },
    stop() {
      running = false;
      for (const p of [...tokens.keys()]) deactivate(p);
    },
  };
  return service;
}
