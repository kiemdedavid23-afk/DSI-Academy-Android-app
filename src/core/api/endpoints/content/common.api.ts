import {
  NetworkError,
  RequestAbortedError,
  TimeoutError,
} from '@core/network/errors';
import {failure} from './common.mapper';
import type {ContentFailure} from './common.types';

/** Exception réseau → échec typé (réseau) ; toute autre exception → serveur. */
export function catchNet(err: unknown): ContentFailure {
  if (
    err instanceof NetworkError ||
    err instanceof TimeoutError ||
    err instanceof RequestAbortedError
  ) {
    return failure('network', null, null);
  }
  return failure('server', null, null);
}
