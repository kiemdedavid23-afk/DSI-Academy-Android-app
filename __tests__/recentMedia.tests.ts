import {rememberMedia, takeRecentMedia} from '@core/media/recentMedia';
import type {MediaSource} from '@core/media/types';

const media = (contentId: number) =>
  ({contentId, contentType: 'book', providerId: 'google_drive', format: 'pdf', strategy: {kind: 'tempFile'}, openedAt: 0}) as unknown as MediaSource;

describe('recentMedia', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(10_000);
  });
  afterEach(() => jest.useRealTimers());

  it('rend le lien une seule fois pour le même contenu', () => {
    rememberMedia(media(7));
    expect(takeRecentMedia(7)?.contentId).toBe(7);
    expect(takeRecentMedia(7)).toBeNull();
  });
  it('ignore un autre contenu et un lien trop ancien', () => {
    rememberMedia(media(7));
    expect(takeRecentMedia(8)).toBeNull();
    rememberMedia(media(7));
    jest.setSystemTime(10_000 + 31_000);
    expect(takeRecentMedia(7)).toBeNull();
  });
});
