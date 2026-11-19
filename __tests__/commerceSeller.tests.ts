import commerceFr from '../src/shared/i18n/locales/commerce.fr.json';
import commerceEn from '../src/shared/i18n/locales/commerce.en.json';

const KEYS = [
  'title', 'body', 'howTitle', 'step1', 'step2', 'step3',
  'needTitle', 'need1', 'need2', 'need3', 'terms', 'start', 'startSoon',
];

describe('écran d\'entrée Vendeur', () => {
  it.each([
    ['fr', commerceFr],
    ['en', commerceEn],
  ])('%s : tous les textes sont présents', (_l, json) => {
    const seller = (json as any).commerce.shell.seller;
    KEYS.forEach(k => expect(typeof seller[k]).toBe('string'));
    expect(Object.keys(seller).sort()).toEqual([...KEYS].sort());
  });
  it('anciens textes retirés', () => {
    [commerceFr, commerceEn].forEach(json => {
      expect((json as any).commerce.discover).toBeUndefined();
      expect((json as any).commerce.shell.sellerSoon).toBeUndefined();
    });
  });
});
