/**
 * Types du client HTTP unique (L0b).
 */

export type AuthMode = 'none' | 'bearer' | 'accessProof';

export type BodyKind = 'json' | 'empty' | 'invalid';

/**
 * Corps de requête : JSON (objet ou tableau) ou FormData (fichiers RN { uri, name, type }).
 * Pas de Content-Type ni JSON.stringify quand c'est un FormData.
 */
export type RequestBody = Record<string, unknown> | unknown[] | FormData;

export type RequestOptions = {
  auth?: AuthMode;
  headers?: Record<string, string>;
  /** Paramètres de query ; les valeurs `undefined` sont ignorées. */
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: RequestBody;
  /** Délai max en ms (défaut technique 20_000). */
  timeoutMs?: number;
  signal?: AbortSignal;
};

export type HttpResponse = {
  status: number;
  ok: boolean;
  body: unknown | null;
  bodyKind: BodyKind;
};

export type EnvelopeResult = {
  success: boolean;
  error: string | null;
  code: string | null;
  field?: string | null;
  retryAfterSeconds?: number | null;
  data: unknown | null;
  status: number;
};

export type UnauthorizedContext = {
  service: string;
  status: number;
  code: string | null;
  auth: AuthMode;
};

export type HttpAuthConfig = {
  getBearerToken: () => string | null;
  getAccessProof: () => string | null;
  onUnauthorized: (ctx: UnauthorizedContext) => void;
};

export type PreparedRequest = {
  url: string;
  headers: Record<string, string>;
};

export type ServiceId =
  | 'payment'
  | 'content'
  | 'shop'
  | 'marketplace'
  | 'community'
  | 'admin';
