import {http} from '@core/network';
import {
  NetworkError,
  RequestAbortedError,
  TimeoutError,
} from '@core/network/errors';
import {sessionStore} from '@core/session';
import {
  mapMarkRead,
  mapNotificationsList,
  mapReleaseCheck,
} from './notifications.mapper';
import type {
  MarkReadResult,
  NotificationsListResult,
  ReleaseCheckResult,
} from './notifications.types';
import {APPLICATION_ID, APP_VERSION} from '@core/config/appInfo';

function catchNetList(err: unknown): NotificationsListResult {
  if (
    err instanceof NetworkError ||
    err instanceof TimeoutError ||
    err instanceof RequestAbortedError
  ) {
    return {kind: 'failure', errorKind: 'network'};
  }
  return {kind: 'failure', errorKind: 'server'};
}

export async function fetchNotifications(params: {
  limit?: number;
  before?: string;
  status?: 'unread' | 'read';
}): Promise<NotificationsListResult> {
  if (!sessionStore.getAccessProof()) {
    return {kind: 'failure', errorKind: 'noProof'};
  }
  try {
    const response = await http.service('notifications').get(
      '/api/notifications',
      {
        auth: 'accessProof',
        query: {
          limit: params.limit ?? 50,
          before: params.before,
          status: params.status,
        },
      },
    );
    return mapNotificationsList(
      response.status,
      response.body,
      response.bodyKind,
    );
  } catch (err) {
    return catchNetList(err);
  }
}

export async function fetchUnreadNotifications(): Promise<NotificationsListResult> {
  return fetchNotifications({status: 'unread', limit: 100});
}

export async function markNotificationRead(
  id: string,
): Promise<MarkReadResult> {
  if (!sessionStore.getAccessProof()) {
    return {kind: 'failure', errorKind: 'noProof'};
  }
  try {
    const response = await http
      .service('notifications')
      .patch(`/api/notifications/${encodeURIComponent(id)}/read`, undefined, {
        auth: 'accessProof',
      });
    return mapMarkRead(response.status, response.body, response.bodyKind);
  } catch (err) {
    if (
      err instanceof NetworkError ||
      err instanceof TimeoutError ||
      err instanceof RequestAbortedError
    ) {
      return {kind: 'failure', errorKind: 'network'};
    }
    return {kind: 'failure', errorKind: 'server'};
  }
}

export async function checkAppRelease(): Promise<ReleaseCheckResult> {
  if (!sessionStore.getAccessProof()) {
    return {kind: 'failure', errorKind: 'noProof'};
  }
  try {
    const response = await http.service('notifications').post(
      '/api/releases/check',
      {
        applicationId: APPLICATION_ID,
        currentVersion: APP_VERSION,
      },
      {auth: 'accessProof'},
    );
    return mapReleaseCheck(response.status, response.body, response.bodyKind);
  } catch (err) {
    if (
      err instanceof NetworkError ||
      err instanceof TimeoutError ||
      err instanceof RequestAbortedError
    ) {
      return {kind: 'failure', errorKind: 'network'};
    }
    return {kind: 'failure', errorKind: 'server'};
  }
}
