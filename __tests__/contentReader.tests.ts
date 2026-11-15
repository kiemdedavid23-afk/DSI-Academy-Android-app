import {chunkText, CHUNK_HARD_MAX} from '../src/features/content/logic/chunkText';
import {readBoundedText} from '@core/network/textSource';
import {readTextContent} from '@core/media/textReader';
import {openMedia} from '@core/media/engine';
import {readerErrorKey} from '@core/utils/readerFailure';
import {favoritesStore, progressStore} from '@shared/store';
import {
  createTextReaderStore,
  SAVE_DELAY_MS,
} from '../src/features/content/store/textReaderStore';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const asyncStorage = require('@react-native-async-storage/async-storage');

jest.mock('@core/media/engine');
const mOpen = openMedia as jest.Mock;

function res(status: number, body = '', headers: Record<string, string> = {}) {
  return {
    status,
    headers: {get: (k: string) => headers[k] ?? null},
    text: async () => body,
  };
}
const g = global as unknown as {fetch: jest.Mock};

beforeEach(async () => {
  g.fetch = jest.fn();
  mOpen.mockReset();
  if (typeof asyncStorage.clear === 'function') {
    await asyncStorage.clear();
  }
});

describe('chunkText', () => {
  it('vide → aucun bloc ; normalise les fins de ligne', () => {
    expect(chunkText('  \n ')).toEqual([]);
    expect(chunkText('a\r\n\r\nb')).toEqual(['a\n\nb']);
  });
  it('regroupe les petits paragraphes, sépare les grands', () => {
    const p = 'x'.repeat(1000);
    expect(chunkText(`${p}\n\n${p}`)).toHaveLength(2);
  });
  it('coupe un paragraphe démesuré sans rien perdre', () => {
    const long = 'mot '.repeat(2000).trim();
    const chunks = chunkText(long);
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every(c => c.length <= CHUNK_HARD_MAX)).toBe(true);
    expect(chunks.join(' ').replace(/\s+/g, ' ')).toBe(long);
  });
});

describe('readBoundedText', () => {
  it('lit un texte', async () => {
    g.fetch.mockResolvedValue(res(200, 'bonjour'));
    expect(await readBoundedText('u', {maxBytes: 100})).toEqual({kind: 'ok', text: 'bonjour'});
  });
  it('classe les statuts', async () => {
    const cases: Array<[number, string]> = [[403, 'rejected'], [404, 'notFound'], [429, 'rateLimited'], [500, 'server']];
    for (const [status, reason] of cases) {
      g.fetch.mockResolvedValue(res(status));
      expect(await readBoundedText('u', {maxBytes: 100})).toMatchObject({reason});
    }
  });
  it('refuse un texte trop gros (en-tête ou corps)', async () => {
    g.fetch.mockResolvedValue(res(200, 'x', {'Content-Length': '500'}));
    expect(await readBoundedText('u', {maxBytes: 100})).toMatchObject({reason: 'tooLarge'});
    g.fetch.mockResolvedValue(res(200, 'x'.repeat(101)));
    expect(await readBoundedText('u', {maxBytes: 100})).toMatchObject({reason: 'tooLarge'});
  });
  it('réseau et annulation', async () => {
    g.fetch.mockRejectedValue(new Error('x'));
    expect(await readBoundedText('u', {maxBytes: 100})).toMatchObject({reason: 'network'});
    const c = new AbortController();
    c.abort();
    expect(await readBoundedText('u', {maxBytes: 100, signal: c.signal})).toMatchObject({reason: 'aborted'});
  });
});

const textMedia = {
  kind: 'success',
  media: {format: 'txt', strategy: {kind: 'boundedText', url: 'u', maxBytes: 100, totalBytes: null}},
};

describe('readTextContent', () => {
  it('texte : succès', async () => {
    mOpen.mockResolvedValue(textMedia);
    g.fetch.mockResolvedValue(res(200, 'salut'));
    expect(await readTextContent(1)).toEqual({kind: 'success', contentId: 1, text: 'salut'});
  });
  it('pdf : notText, sans lecture réseau', async () => {
    mOpen.mockResolvedValue({kind: 'success', media: {format: 'pdf', strategy: {kind: 'tempFile'}}});
    expect(await readTextContent(1)).toEqual({kind: 'notText', contentId: 1, format: 'pdf'});
    expect(g.fetch).not.toHaveBeenCalled();
  });
  it('lien refusé : une seule nouvelle demande de lien', async () => {
    mOpen.mockResolvedValue(textMedia);
    g.fetch.mockResolvedValueOnce(res(403)).mockResolvedValueOnce(res(200, 'ok'));
    expect(await readTextContent(1)).toMatchObject({kind: 'success', text: 'ok'});
    expect(mOpen).toHaveBeenCalledTimes(2);
    g.fetch.mockResolvedValue(res(403));
    expect(await readTextContent(1)).toMatchObject({kind: 'failure', errorKind: 'sourceRejected'});
  });
  it('échec du moteur transmis tel quel', async () => {
    const f = {kind: 'failure', errorKind: 'accessDenied', code: null, retryable: false};
    mOpen.mockResolvedValue(f);
    expect(await readTextContent(1)).toBe(f);
  });
});

describe('readerErrorKey', () => {
  it('clés i18n', () => {
    expect(readerErrorKey('accessDenied')).toBe('content.accessProofMissing');
    expect(readerErrorKey('network')).toBe('app.catalogue.errorNetwork');
    expect(readerErrorKey('tooLarge')).toBe('app.reader.tooLarge');
    expect(readerErrorKey(null)).toBe('content.deliveryError');
  });
});

describe('progressStore / favoris', () => {
  it('progression : enregistre, borne, relit', async () => {
    expect(await progressStore.get(5)).toBeNull();
    await progressStore.save(5, 140);
    expect(await progressStore.get(5)).toBe(100);
    await progressStore.save(5, 42.5);
    expect(await progressStore.get('5')).toBe(42.5);
    await progressStore.clear();
    expect(await progressStore.get(5)).toBeNull();
  });
  it('favoris : toggle ajoute puis retire', async () => {
    const item = {id: '7', house: 'library', title: 'T', path: ''};
    expect(await favoritesStore.toggle(item)).toBe(true);
    expect(await favoritesStore.has('7')).toBe(true);
    expect(await favoritesStore.toggle(item)).toBe(false);
    expect(await favoritesStore.has('7')).toBe(false);
  });
});

describe('textReaderStore', () => {
  it('ouvre, reprend à la progression sauvegardée, enregistre à retardement', async () => {
    jest.useFakeTimers({doNotFake: ['nextTick', 'setImmediate']});
    await progressStore.save(9, 40);
    mOpen.mockResolvedValue(textMedia);
    g.fetch.mockResolvedValue(res(200, 'un\n\ndeux'));
    const s = createTextReaderStore();
    await s.open(9, 'Mon livre');
    expect(s.getState().status).toBe('ready');
    expect(s.getState().resumePercent).toBe(40);

    s.reportProgress(55);
    s.reportProgress(60);
    jest.advanceTimersByTime(SAVE_DELAY_MS + 10);
    jest.useRealTimers();
    await new Promise(r => setTimeout(r, 20));
    expect(await progressStore.get(9)).toBe(60);
    s.reset();
  });
  it('pas de reprise sous 3 % ni au-delà de 97 %', async () => {
    mOpen.mockResolvedValue(textMedia);
    g.fetch.mockResolvedValue(res(200, 'a'));
    const s = createTextReaderStore();
    await progressStore.save(3, 2);
    await s.open(3, 'T');
    expect(s.getState().resumePercent).toBeNull();
    await progressStore.save(3, 99);
    await s.open(3, 'T');
    expect(s.getState().resumePercent).toBeNull();
    s.reset();
  });
  it('pdf : unsupported ; échec : error avec retryable', async () => {
    const s = createTextReaderStore();
    mOpen.mockResolvedValue({kind: 'success', media: {format: 'pdf', strategy: {kind: 'tempFile'}}});
    await s.open(1, 'T');
    expect(s.getState().status).toBe('unsupported');
    mOpen.mockResolvedValue({kind: 'failure', errorKind: 'network', code: null, retryable: true});
    await s.open(1, 'T');
    expect(s.getState()).toMatchObject({status: 'error', errorKind: 'network', retryable: true});
    s.reset();
  });
});
