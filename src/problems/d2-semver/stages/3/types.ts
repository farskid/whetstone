/** A parsed version. Numeric prerelease identifiers are numbers. */
export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  /** e.g. ['alpha', 1] for -alpha.1; [] if none. */
  prerelease: Array<string | number>;
  /** e.g. ['build', '05']; ignored when comparing. */
  build: string[];
}
