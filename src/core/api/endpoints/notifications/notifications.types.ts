export type NotificationOrigin = 'admin' | 'event' | string;
export type NotificationStatus = 'unread' | 'read' | string;

export type AppNotification = {
  id: string;
  origin: NotificationOrigin;
  eventId: string | null;
  source: string | null;
  type: string;
  title: string;
  body: string | null;
  data: unknown | null;
  status: NotificationStatus;
  createdAt: string;
  readAt: string | null;
};

export type NotificationsListResult =
  | {kind: 'success'; items: AppNotification[]}
  | {
      kind: 'failure';
      errorKind: 'network' | 'server' | 'business' | 'unavailable' | 'unauthorized' | 'noProof';
      code?: string | null;
      message?: string;
    };

export type MarkReadResult =
  | {
      kind: 'success';
      id: string;
      status: 'read';
      readAt: string | null;
      origin?: string | null;
    }
  | {
      kind: 'failure';
      errorKind: 'network' | 'server' | 'business' | 'unavailable' | 'notFound' | 'unauthorized' | 'noProof';
      code?: string | null;
      message?: string;
    };

export type ReleaseCheckResult =
  | {
      kind: 'success';
      updateAvailable: false;
      currentVersion: string;
    }
  | {
      kind: 'success';
      updateAvailable: true;
      currentVersion: string;
      version: string | null;
      latestVersion: string | null;
      url: string | null;
      sha256: string | null;
    }
  | {
      kind: 'failure';
      errorKind: 'network' | 'server' | 'business' | 'unavailable' | 'unauthorized' | 'noProof';
      message?: string;
    };
