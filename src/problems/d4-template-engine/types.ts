/** Called with the tag's arguments; the result is rendered like a value. */
export type Helper = (...args: unknown[]) => unknown;

export interface RenderOptions {
  /** Named templates for `{{> name}}`. */
  partials?: Record<string, string>;
  /** Named functions for `{{name arg ...}}`. */
  helpers?: Record<string, Helper>;
}
