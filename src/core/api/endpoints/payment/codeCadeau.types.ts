export type RedeemCodeResult =
  | {
      kind: 'success';
      status: 'succes';
      montantDsi: number;
      message: string | null;
    }
  | {
      kind: 'success';
      status: 'refuse';
      message: string | null;
    }
  | {
      kind: 'failure';
      errorKind: 'network' | 'server' | 'business' | 'unavailable' | 'tooMany';
      reason?: 'empty';
      message?: string;
    };
