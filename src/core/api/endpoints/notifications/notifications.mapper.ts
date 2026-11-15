import type {
  AppNotification,
  MarkReadResult,
  NotificationsListResult,
  ReleaseCheckResult,
} from './notifications.types';

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}
function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function mapItem(raw: unknown): AppNotification | null {
  const r = asRecord(raw);
  if (!r) return null;
  const id = asString(r.id);
  const createdAt = asString(r.createdAt);
  if (!id || !createdAt) return null;
  return {
    id,
    origin: asString(r.origin) ?? 'event',
    eventId: asString(r.eventId),
    source: asString(r.source),
    type: asString(r.type) ?? 'unknown',
    title: asString(r.title) ?? asString(r.type) ?? '',
    body: asString(r.body),
    data: r.data === undefined ? null : r.data,
    status: asString(r.status) ?? 'unread',
    createdAt,
    readAt: asString(r.readAt),
  };
}

/**
 * Enveloppe {success, error, code, data}.
 * data peut être un tableau (liste) ou un objet (mark read / releases).
 */
export function mapNotificationsList(
  status: number,
  body: unknown,
  bodyKind?: string,
): NotificationsListResult {
  if (bodyKind === 'invalid') {
    return {kind: 'failure', errorKind: 'server'};
  }
  if (status === 401) {
    const code = asString(asRecord(body)?.code);
    return {kind: 'failure', errorKind: 'unauthorized', code};
  }
  if (status === 429 || status === 503) {
    return {kind: 'failure', errorKind: 'unavailable'};
  }
  if (status >= 500) {
    return {kind: 'failure', errorKind: 'server'};
  }
  const env = asRecord(body);
  if (!env) {
    // liste vide possible body null?
    if (status === 200) return {kind: 'success', items: []};
    return {kind: 'failure', errorKind: 'server'};
  }
  if (env.success === false) {
    const code = asString(env.code);
    if (status === 401 || (code && code.startsWith('ACCESS_PROOF'))) {
      return {kind: 'failure', errorKind: 'unauthorized', code};
    }
    return {
      kind: 'failure',
      errorKind: 'business',
      code,
      message: asString(env.error) ?? undefined,
    };
  }
  const data = env.data;
  const arr = Array.isArray(data)
    ? data
    : Array.isArray(asRecord(data)?.items)
      ? (asRecord(data)!.items as unknown[])
      : [];
  return {
    kind: 'success',
    items: arr.map(mapItem).filter((x): x is AppNotification => x != null),
  };
}

export function mapMarkRead(
  status: number,
  body: unknown,
  bodyKind?: string,
): MarkReadResult {
  if (status === 404) {
    return {kind: 'failure', errorKind: 'notFound'};
  }
  if (status === 401) {
    return {
      kind: 'failure',
      errorKind: 'unauthorized',
      code: asString(asRecord(body)?.code),
    };
  }
  if (status === 429 || status === 503) {
    return {kind: 'failure', errorKind: 'unavailable'};
  }
  if (status >= 500 || bodyKind === 'invalid') {
    return {kind: 'failure', errorKind: 'server'};
  }
  const env = asRecord(body);
  if (!env || env.success === false) {
    return {
      kind: 'failure',
      errorKind: 'business',
      code: asString(env?.code),
      message: asString(env?.error) ?? undefined,
    };
  }
  const data = asRecord(env.data) ?? env;
  const id = asString(data.id);
  if (!id) {
    return {kind: 'failure', errorKind: 'server'};
  }
  return {
    kind: 'success',
    id,
    status: 'read',
    readAt: asString(data.readAt),
    origin: asString(data.origin),
  };
}

export function mapReleaseCheck(
  status: number,
  body: unknown,
  bodyKind?: string,
): ReleaseCheckResult {
  if (status === 401) {
    return {kind: 'failure', errorKind: 'unauthorized'};
  }
  if (status === 429 || status === 503) {
    return {kind: 'failure', errorKind: 'unavailable'};
  }
  if (status >= 500 || bodyKind === 'invalid') {
    return {kind: 'failure', errorKind: 'server'};
  }
  const env = asRecord(body);
  if (!env || env.success === false) {
    return {
      kind: 'failure',
      errorKind: 'business',
      message: asString(env?.error) ?? undefined,
    };
  }
  const data = asRecord(env.data) ?? {};
  const currentVersion = asString(data.currentVersion) ?? '';
  if (data.updateAvailable === true) {
    return {
      kind: 'success',
      updateAvailable: true,
      currentVersion,
      version: asString(data.version),
      latestVersion: asString(data.latestVersion),
      url: asString(data.url),
      sha256: asString(data.sha256),
    };
  }
  return {
    kind: 'success',
    updateAvailable: false,
    currentVersion,
  };
}
