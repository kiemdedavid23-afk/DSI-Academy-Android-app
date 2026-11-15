export type MoyensRetraitResult =
  | {kind: 'success'; pays: string; moyens: string[]}
  | {
      kind: 'failure';
      errorKind: 'network' | 'server' | 'business' | 'unavailable';
      message?: string;
    };
