/** One validation problem. `path` is empty at the root. */
export interface Issue {
  path: (string | number)[];
  code: string;
  message: string;
}

/** What `safeParse` returns. `error` is a `ValidationError`. */
export type SafeParseResult = { success: true; data: any } | { success: false; error: Error & { issues: Issue[] } };
