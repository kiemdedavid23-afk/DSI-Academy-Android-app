import {openMedia} from '@core/media/engine';
import {fetchDeliveryLink} from '@core/api/endpoints/content/delivery.api';
import {probeSource, PROBE_TIMEOUT_MS} from '@core/network/sourceProbe';

jest.mock('@core/api/endpoints/content/delivery.api', () => ({fetchDeliveryLink: jest.fn()}));
jest.mock('@core/network/sourceProbe', () => ({
  ...jest.requireActual('@core/network/sourceProbe'),
  probeSource: jest.fn(),
}));

const delivery = (over: Record<string, unknown> = {}) => ({
  kind: 'success',
  link: {contentId: 12, contentType: 'book', assetId: 34, providerId: 'google_drive', format: 'pdf', url: 'https://files.example.invalid/f', mimeType: null, sizeBytes: null, ...over},
});

beforeEach(() => {
  (fetchDeliveryLink as jest.Mock).mockReset();
  (probeSource as jest.Mock).mockReset();
});

describe('openMedia', () => {
  it('PDF Drive : une seule demande au Worker, aucun sondage, taille du Worker', async () => {
    (fetchDeliveryLink as jest.Mock).mockResolvedValue(delivery({sizeBytes: 2048}));
    const r = await openMedia(12);
    expect(fetchDeliveryLink).toHaveBeenCalledTimes(1);
    expect(fetchDeliveryLink).toHaveBeenCalledWith(12);
    expect(probeSource).not.toHaveBeenCalled();
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.media).toMatchObject({contentId: 12, providerId: 'google_drive', format: 'pdf'});
      expect(r.media.strategy).toMatchObject({kind: 'tempFile', totalBytes: 2048});
    }
  });
  it('audio : lecture directe du lien, sans sondage', async () => {
    (fetchDeliveryLink as jest.Mock).mockResolvedValue(delivery({contentType: 'audio', format: 'mp3', mimeType: 'audio/mpeg'}));
    const r = await openMedia(20);
    expect(probeSource).not.toHaveBeenCalled();
    expect(r.kind === 'success' && r.media.strategy).toMatchObject({kind: 'nativeStream', format: 'mp3', mimeType: 'audio/mpeg'});
  });
  it('YouTube : aucun sondage', async () => {
    (fetchDeliveryLink as jest.Mock).mockResolvedValue(delivery({contentType: 'video', providerId: 'youtube', format: 'youtube_url', url: 'https://www.youtube.com/watch?v=abcdefghijk'}));
    const r = await openMedia(30);
    expect(probeSource).not.toHaveBeenCalled();
    expect(r.kind === 'success' && r.media.strategy).toEqual({kind: 'embeddedYoutube', videoId: 'abcdefghijk'});
  });
  it('échec du Worker : code conservé', async () => {
    (fetchDeliveryLink as jest.Mock).mockResolvedValue({kind: 'failure', errorKind: 'forbidden', status: 403, code: 'ACCESS_SUBSCRIPTION_INACTIVE'});
    const r = await openMedia(12);
    expect(r).toMatchObject({kind: 'failure', errorKind: 'subscriptionInactive', code: 'ACCESS_SUBSCRIPTION_INACTIVE'});
    expect(fetchDeliveryLink).toHaveBeenCalledTimes(1);
  });
  it('provider ou format refusé', async () => {
    (fetchDeliveryLink as jest.Mock).mockResolvedValue(delivery({providerId: 'telegram'}));
    expect(await openMedia(12)).toMatchObject({errorKind: 'unsupportedProvider'});
    (fetchDeliveryLink as jest.Mock).mockResolvedValue(delivery({format: 'cbz'}));
    expect(await openMedia(12)).toMatchObject({errorKind: 'unsupportedFormat'});
    expect(probeSource).not.toHaveBeenCalled();
  });
  it('texte trop gros (taille du Worker) → tooLarge', async () => {
    (fetchDeliveryLink as jest.Mock).mockResolvedValue(delivery({format: 'txt', sizeBytes: 50 * 1024 * 1024}));
    expect(await openMedia(12)).toMatchObject({errorKind: 'tooLarge'});
  });
  it('annulation avant démarrage', async () => {
    const c = new AbortController();
    c.abort();
    expect(await openMedia(12, {signal: c.signal})).toMatchObject({errorKind: 'aborted', retryable: false});
    expect(fetchDeliveryLink).not.toHaveBeenCalled();
  });
});

describe('PROBE_TIMEOUT_MS', () => {
  it('défini', () => expect(PROBE_TIMEOUT_MS).toBeGreaterThan(0));
});
