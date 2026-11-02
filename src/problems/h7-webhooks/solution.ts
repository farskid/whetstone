import type { WebhookErrorCode, ParsedSignature, VerifyOptions, ProcessResult, HandlerOptions } from './types';

export class WebhookError extends Error {
  readonly code: WebhookErrorCode;
  constructor(code: WebhookErrorCode, message: string) {
    super(message);
    this.name = 'WebhookError';
    this.code = code;
  }
}

export function parseSignatureHeader(header: string): ParsedSignature {
  let timestamp: number | undefined;
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const eq = part.indexOf('=');
    if (eq <= 0) throw new WebhookError('malformed', `Bad header item: ${part}`);
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === 't') {
      if (timestamp !== undefined || !/^\d+$/.test(value)) throw new WebhookError('malformed', 'Bad timestamp');
      timestamp = Number(value);
    } else if (key === 'v1') {
      signatures.push(value);
    }
  }
  if (timestamp === undefined) throw new WebhookError('malformed', 'No timestamp');
  if (!signatures.length) throw new WebhookError('malformed', 'No v1 signature');
  return { timestamp, signatures };
}

/** Compares in time that depends only on the length, not on where the strings differ. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifySignature(options: VerifyOptions): Promise<{ timestamp: number }> {
  const { timestamp, signatures } = parseSignatureHeader(options.header);
  const secrets = typeof options.secrets === 'string' ? [options.secrets] : options.secrets;
  let matched = false;
  for (const secret of secrets) {
    const expected = await hmacHex(secret, `${timestamp}.${options.payload}`);
    for (const sig of signatures) if (timingSafeEqual(expected, sig)) matched = true;
  }
  if (!matched) throw new WebhookError('no_match', 'No signature matches');
  const nowSec = Math.floor((options.clock ?? Date).now() / 1000);
  if (nowSec - timestamp > (options.toleranceSec ?? 300)) throw new WebhookError('too_old', 'Timestamp outside the tolerance');
  return { timestamp };
}

type Outcome<R> = { status: 'applied'; result: R } | { status: 'stale' };

export function createWebhookHandler<E extends { id: string }, R>(options: HandlerOptions<E, R>): { process(event: E): Promise<ProcessResult<R>> } {
  const byId = new Map<string, Promise<Outcome<R>>>();
  const tails = new Map<string, Promise<unknown>>();
  const versions = new Map<string, number>();

  const run = async (event: E): Promise<Outcome<R>> => {
    const key = options.getKey?.(event);
    if (key === undefined) return { status: 'applied', result: await options.handle(event) };
    const prev = tails.get(key) ?? Promise.resolve();
    const mine = prev.then(async (): Promise<Outcome<R>> => {
      const version = options.getVersion?.(event);
      const last = versions.get(key);
      if (version !== undefined && last !== undefined && version <= last) return { status: 'stale' };
      const result = await options.handle(event);
      if (version !== undefined) versions.set(key, version);
      return { status: 'applied', result };
    });
    const tail = mine.catch(() => {});
    tails.set(key, tail);
    void tail.then(() => { if (tails.get(key) === tail) tails.delete(key); });
    return mine;
  };

  return {
    process(event: E): Promise<ProcessResult<R>> {
      const existing = byId.get(event.id);
      const duplicate = existing !== undefined;
      let p = existing;
      if (!p) {
        p = run(event);
        byId.set(event.id, p);
        p.catch(() => { if (byId.get(event.id) === p) byId.delete(event.id); });
      }
      return p.then((o) => ({ ...o, duplicate }));
    },
  };
}
