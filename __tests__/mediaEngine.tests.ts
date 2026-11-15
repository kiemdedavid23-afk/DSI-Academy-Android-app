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
const probeOk = (over = {}) => ({kind: 'ok', status: 206, contentType: 'application/pdf', totalBytes: 2048, rangeSupported: true, ...over});
const probeFail = (reason: string, status: number | null) => ({kind: 'failure', reason, status});

beforeEach(() => {
  (fetchDeliveryLink as jest.Mock).mockReset();
  (probeSource as jest.Mock).mockReset();
});

describe('openMedia', () => {
  it('PDF Drive : lien, sondage, stratégie fichier temporaire', async () => {
    (fetchDeliveryLink as jest.Mock).mockResolvedValue(delivery());
    (probeSource as jest.Mock).mockResolvedValue(probeOk());
    const r = await openMedia(12);
    expect(fetchDeliveryLink).toHaveBeenCalledWith(12);
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.media).toMatchObject({contentId: 12, providerId: 'google_drive', format: 'pdf'});
      expect(r.media.strategy).toMatchObject({kind: 'tempFile', totalBytes: 2048, rangeSupported: true});
    }
  });
  it('YouTube : aucun sondage', async () => {
    (fetchDeliveryLink as jest.Mock).mockResolvedValue(delivery({contentType: 'video', providerId: 'youtube', format: 'youtube_url', url: 'https://www.youtube.com/watch?v=abcdefghijk'}));
    const r = await openMedia(30);
    expect(probeSource).not.toHaveBeenCalled();
    expect(r.kind === 'success' && r.media.strategy).toEqual({kind: 'embeddedYoutube', videoId: 'abcdefghijk'});
  });
  it('échec du Worker : aucun sondage, code conservé', async () => {
    (fetchDeliveryLink as jest.Mock).mockResolvedValue({kind: 'failure', errorKind: 'forbidden', status: 403, code: 'ACCESS_SUBSCRIPTION_INACTIVE'});
    const r = await openMedia(12);
    expect(r).toMatchObject({kind: 'failure', errorKind: 'subscriptionInactive', code: 'ACCESS_SUBSCRIPTION_INACTIVE'});
    expect(probeSource).not.toHaveBeenCalled();
  });
  it('provider ou format refusé : aucun sondage', async () => {
    (fetchDeliveryLink as jest.Mock).mockResolvedValue(delivery({providerId: 'telegram'}));
    expect(await openMedia(12)).toMatchObject({errorKind: 'unsupportedProvider'});
    (fetchDeliveryLink as jest.Mock).mockResolvedValue(delivery({format: 'cbz'}));
    expect(await openMedia(12)).toMatchObject({errorKind: 'unsupportedFormat'});
    expect(probeSource).not.toHaveBeenCalled();
  });
  it('lien refusé : une seule nouvelle résolution, puis succès', async () => {
    (fetchDeliveryLink as jest.Mock).mockResolvedValue(delivery());
    (probeSource as jest.Mock).mockResolvedValueOnce(probeFail('rejected', 403)).mockResolvedValueOnce(probeOk());
    const r = await openMedia(12);
    expect(fetchDeliveryLink).toHaveBeenCalledTimes(2);
    expect(r.kind).toBe('success');
  });
  it('page web à la place du fichier deux fois : échec sourceHtmlPage', async () => {
    (fetchDeliveryLink as jest.Mock).mockResolvedValue(delivery());
    (probeSource as jest.Mock).mockResolvedValue(probeFail('htmlPage', 200));
    const r = await openMedia(12);
    expect(fetchDeliveryLink).toHaveBeenCalledTimes(2);
    expect(r).toMatchObject({kind: 'failure', errorKind: 'sourceHtmlPage', retryable: false});
  });
  it('réseau, délai et limite : pas de nouvelle résolution, échec réessayable', async () => {
    (fetchDeliveryLink as jest.Mock).mockResolvedValue(delivery());
    (probeSource as jest.Mock).mockResolvedValue(probeFail('network', null));
    expect(await openMedia(12)).toMatchObject({errorKind: 'network', retryable: true});
    (probeSource as jest.Mock).mockResolvedValue(probeFail('rateLimited', 429));
    expect(await openMedia(12)).toMatchObject({errorKind: 'sourceRateLimited', retryable: true});
    expect(fetchDeliveryLink).toHaveBeenCalledTimes(2);
  });
  it('texte trop gros → tooLarge', async () => {
    (fetchDeliveryLink as jest.Mock).mockResolvedValue(delivery({format: 'txt'}));
    (probeSource as jest.Mock).mockResolvedValue(probeOk({contentType: 'text/plain', totalBytes: 50 * 1024 * 1024}));
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
