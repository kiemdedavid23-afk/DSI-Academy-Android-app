import {resolveServiceUrl} from '../src/core/config/serviceRegistry';

describe('serviceRegistry notifications', () => {
  it('resolves notifications path in fixture mode', () => {
    const url = resolveServiceUrl('notifications', '/api/notifications');
    expect(url).toContain('notifications');
    expect(url.endsWith('/api/notifications')).toBe(true);
    expect(url.startsWith('https://')).toBe(true);
  });
});
