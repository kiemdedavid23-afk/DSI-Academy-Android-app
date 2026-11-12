/**
 * API publique de @core/network (L0b).
 */

export type {
  AuthMode,
  BodyKind,
  EnvelopeResult,
  HttpAuthConfig,
  HttpResponse,
  PreparedRequest,
  RequestBody,
  RequestOptions,
  ServiceId,
  UnauthorizedContext,
} from './types';

export {
  NetworkError,
  TimeoutError,
  RequestAbortedError,
} from './errors';

export {configureHttpAuth} from './authProviders';
export {http, prepareRequest, DEFAULT_TIMEOUT_MS} from './httpClient';
export {parseEnvelope, safeEnvelope} from './envelope';
export {
  notifyRateLimited,
  isRateLimited,
  msUntilAvailable,
  resetRateLimits,
} from './rateLimitGate';
