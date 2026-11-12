/**
 * Tests de src/core/config/serviceRegistry.ts
 *
 * Ces tests s'appuient sur le fichier généré buildConfig.generated.ts
 * (mode fixture). Ils doivent être exécutés après `npm run generate:config`.
 */

// On mocke le module généré pour contrôler le registre sans fichier physique.
jest.mock('./buildConfig.generated', () => ({
  BUILD_CONFIG: {
    registry: {
      mode: 'perService',
      urls: {
        payment: 'https://payment.example.invalid',
        content: 'https://content.example.invalid/',
        shop: 'https://shop.example.invalid',
        marketplace: 'https://marketplace.example.invalid',
        community: 'https://community.example.invalid',
        admin: 'https://admin.example.invalid',
      },
      web: 'https://web.example.invalid/',
    },
  },
}));

import {
  resolveServiceUrl,
  resolveRealtimeUrl,
  resolveWebUrl,
  assertRegistry,
} from './serviceRegistry';

describe('serviceRegistry (mode perService)', () => {
  it('résout une URL de service sans barre oblique en trop', () => {
    expect(resolveServiceUrl('payment', '/login')).toBe(
      'https://payment.example.invalid/login',
    );
  });

  it('ajoute la barre oblique manquante au chemin', () => {
    expect(resolveServiceUrl('payment', 'login')).toBe(
      'https://payment.example.invalid/login',
    );
  });

  it('supprime les barres obliques en trop de la base', () => {
    // content a une barre finale dans le mock
    expect(resolveServiceUrl('content', '/items')).toBe(
      'https://content.example.invalid/items',
    );
  });

  it('convertit https en wss pour le temps réel', () => {
    expect(resolveRealtimeUrl('community', '/ws')).toBe(
      'wss://community.example.invalid/ws',
    );
  });

  it('résout l\'URL web', () => {
    expect(resolveWebUrl('/register')).toBe(
      'https://web.example.invalid/register',
    );
  });

  it('assertRegistry ne lève pas en mode valide', () => {
    expect(() => assertRegistry()).not.toThrow();
  });
});

describe('serviceRegistry (mode gateway)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('./buildConfig.generated', () => ({
      BUILD_CONFIG: {
        registry: {
          mode: 'gateway',
          baseUrl: 'https://gateway.example.invalid/',
          prefixes: {
            payment: '/payment',
            content: 'content',
            shop: '/shop/',
            marketplace: '/marketplace',
            community: '/community',
            admin: '/admin',
          },
          web: 'https://web.example.invalid',
        },
      },
    }));
  });

  it('résout via baseUrl + préfixe + chemin', () => {
    // Re-require après doMock
    const {
      resolveServiceUrl: resolve,
    } = require('./serviceRegistry');
    expect(resolve('payment', '/login')).toBe(
      'https://gateway.example.invalid/payment/login',
    );
  });

  it('normalise les barres obliques du préfixe', () => {
    const {resolveServiceUrl: resolve} = require('./serviceRegistry');
    expect(resolve('content', 'items')).toBe(
      'https://gateway.example.invalid/content/items',
    );
    expect(resolve('shop', '/cart')).toBe(
      'https://gateway.example.invalid/shop/cart',
    );
  });
});

describe('assertRegistry (échecs)', () => {
  it('échoue si web est invalide', () => {
    jest.resetModules();
    jest.doMock('./buildConfig.generated', () => ({
      BUILD_CONFIG: {
        registry: {
          mode: 'perService',
          urls: {
            payment: 'https://payment.example.invalid',
            content: 'https://content.example.invalid',
            shop: 'https://shop.example.invalid',
            marketplace: 'https://marketplace.example.invalid',
            community: 'https://community.example.invalid',
            admin: 'https://admin.example.invalid',
          },
          web: 'http://not-https.example.invalid',
        },
      },
    }));
    const {assertRegistry: assert} = require('./serviceRegistry');
    expect(() => assert()).toThrow(/adresse invalide/);
  });

  it('échoue si une URL de service est invalide', () => {
    jest.resetModules();
    jest.doMock('./buildConfig.generated', () => ({
      BUILD_CONFIG: {
        registry: {
          mode: 'perService',
          urls: {
            payment: 'not-a-url',
            content: 'https://content.example.invalid',
            shop: 'https://shop.example.invalid',
            marketplace: 'https://marketplace.example.invalid',
            community: 'https://community.example.invalid',
            admin: 'https://admin.example.invalid',
          },
          web: 'https://web.example.invalid',
        },
      },
    }));
    const {assertRegistry: assert} = require('./serviceRegistry');
    expect(() => assert()).toThrow(/adresse invalide/);
  });
});
