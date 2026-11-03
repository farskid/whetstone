// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
// @contract-skip ProcessResult: adds the output result `{ status: 'stale' }`; nothing you pass in changes.
import { verifySignature } from './solution';

/**
 * @contract verifySignature, VerifyOptions.secrets
 * @change `secrets` can be one string or an array of them.
 * Your `verifySignature` doesn't accept an array of `secrets` yet. Type its argument as `VerifyOptions` (from `./types`).
 */
export function rotated(payload: string, header: string) {
  return verifySignature({ payload, header, secrets: ['whsec_old', 'whsec_new'] });
}
