import {
  HERO_ART_INDEX,
  PURCHASES_TABS,
  resolveSection,
  sectionsFor,
} from '../src/features/commerce/logic/commerceSections';
import commerceFr from '../src/shared/i18n/locales/commerce.fr.json';
import commerceEn from '../src/shared/i18n/locales/commerce.en.json';

describe('sectionsFor', () => {
  it('Marketplace : quatre sections, Vendeur en dernier', () => {
    expect(sectionsFor('marketplace')).toEqual(['discover', 'explore', 'purchases', 'seller']);
  });
  it('Boutique : pas de section Vendeur', () => {
    expect(sectionsFor('shop')).toEqual(['discover', 'explore', 'purchases']);
  });
});

describe('resolveSection', () => {
  it('garde la section demandée si la maison la propose', () => {
    expect(resolveSection('marketplace', 'seller')).toBe('seller');
    expect(resolveSection('shop', 'purchases')).toBe('purchases');
  });
  it('retombe sur Découvrir sinon', () => {
    expect(resolveSection('shop', 'seller')).toBe('discover');
    expect(resolveSection('marketplace', undefined)).toBe('discover');
  });
});

describe('coque : données', () => {
  it('une illustration différente par section', () => {
    expect(new Set(Object.values(HERO_ART_INDEX)).size).toBe(4);
  });
  it('sous-onglets de Mes achats', () => {
    expect(PURCHASES_TABS).toEqual(['purchases', 'favorites']);
  });
  it('textes fr/en : une carte d\'ambiance par section de chaque maison', () => {
    [commerceFr, commerceEn].forEach(c => {
      const hero = c.commerce.shell.hero;
      expect(Object.keys(hero.marketplace).sort()).toEqual(['discover', 'explore', 'purchases', 'seller']);
      expect(Object.keys(hero.shop).sort()).toEqual(['discover', 'explore', 'purchases']);
    });
  });
});
