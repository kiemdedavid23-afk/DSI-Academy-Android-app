import commerceFr from '../src/shared/i18n/locales/commerce.fr.json';
import commerceEn from '../src/shared/i18n/locales/commerce.en.json';
import fr from '../src/shared/i18n/locales/fr.json';
import en from '../src/shared/i18n/locales/en.json';

const LANDING = [
  'title', 'body', 'howTitle', 'how1', 'how2', 'how3', 'needTitle',
  'need1', 'need2', 'need3', 'need4', 'termsPrefix', 'termsLink', 'termsSuffix',
  'start', 'hintCheck',
];

describe('écran d\'entrée Vendeur', () => {
  it.each([
    ['fr', fr],
    ['en', en],
  ])('%s : textes du site présents (mp.apply.landing)', (_l, json) => {
    const landing = (json as any).mp.apply.landing;
    LANDING.forEach(k => expect(typeof landing[k]).toBe('string'));
  });
  it.each([
    ['fr', commerceFr],
    ['en', commerceEn],
  ])('%s : message d\'attente de la candidature', (_l, json) => {
    expect(typeof (json as any).commerce.shell.seller.startSoon).toBe('string');
  });
});
