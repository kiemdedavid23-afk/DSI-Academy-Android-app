/**
 * Erreurs réseau typées. Aucune adresse ni en-tête dans le message (R-SEC / R-NET-10).
 * Textes FR portés par shared/i18n en L0d.
 */

export type NetworkErrorCode = 'NETWORK_ERROR' | 'TIMEOUT' | 'ABORTED';

export class NetworkError extends Error {
  readonly code: NetworkErrorCode = 'NETWORK_ERROR';
  constructor(message = 'NETWORK_ERROR') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  readonly code: NetworkErrorCode = 'TIMEOUT';
  constructor(message = 'TIMEOUT') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class RequestAbortedError extends Error {
  readonly code: NetworkErrorCode = 'ABORTED';
  constructor(message = 'ABORTED') {
    super(message);
    this.name = 'RequestAbortedError';
  }
}
