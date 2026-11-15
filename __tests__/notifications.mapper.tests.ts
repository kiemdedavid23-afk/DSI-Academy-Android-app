import {
  mapMarkRead,
  mapNotificationsList,
  mapReleaseCheck,
} from '../src/core/api/endpoints/notifications/notifications.mapper';
import admin from '../contracts/notifications/list.admin.json';
import event from '../contracts/notifications/list.event.json';
import empty from '../contracts/notifications/list.empty.json';
import e401 from '../contracts/notifications/error.401.json';
import e404 from '../contracts/notifications/error.404.json';
import up from '../contracts/notifications/releases.upToDate.json';
import upd from '../contracts/notifications/releases.update.json';

describe('mapNotificationsList', () => {
  it('admin announcement', () => {
    const r = mapNotificationsList(200, admin);
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.items[0].type).toBe('maintenance');
      expect(r.items[0].title).toBe('Maintenance ce soir');
    }
  });
  it('event body null', () => {
    const r = mapNotificationsList(200, event);
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.items[0].body).toBeNull();
    }
  });
  it('empty', () => {
    const r = mapNotificationsList(200, empty);
    expect(r.kind).toBe('success');
    if (r.kind === 'success') expect(r.items).toEqual([]);
  });
  it('401', () => {
    const r = mapNotificationsList(401, e401);
    expect(r.kind).toBe('failure');
    if (r.kind === 'failure') expect(r.errorKind).toBe('unauthorized');
  });
});

describe('mapMarkRead', () => {
  it('404', () => {
    const r = mapMarkRead(404, e404);
    expect(r.kind).toBe('failure');
    if (r.kind === 'failure') expect(r.errorKind).toBe('notFound');
  });
});

describe('mapReleaseCheck', () => {
  it('up to date', () => {
    const r = mapReleaseCheck(200, up);
    expect(r.kind).toBe('success');
    if (r.kind === 'success') expect(r.updateAvailable).toBe(false);
  });
  it('update available', () => {
    const r = mapReleaseCheck(200, upd);
    expect(r.kind).toBe('success');
    if (r.kind === 'success' && r.updateAvailable) {
      expect(r.version).toBe('1.4.0');
    }
  });
});
