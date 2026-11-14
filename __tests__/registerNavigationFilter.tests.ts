import {decideNavigation} from '@features/auth/registration-browser/logic/navigationFilter';
import {BUILD_CONFIG} from '@core/config/buildConfig.generated';

const site = BUILD_CONFIG.registry.web.replace(/\/+$/, '');

describe('decideNavigation', () => {
  it('autorise l’hôte site', () => {
    expect(decideNavigation(`${site}/inscription`)).toEqual({action: 'allow'});
  });

  it('ouvre en externe une page https hors site', () => {
    expect(decideNavigation('https://pay.example.invalid/checkout')).toEqual({
      action: 'openExternal',
      url: 'https://pay.example.invalid/checkout',
    });
  });

  it('refuse les autres schémas', () => {
    expect(decideNavigation('intent://x')).toEqual({action: 'deny'});
    expect(decideNavigation('tel:+225000')).toEqual({action: 'deny'});
    expect(decideNavigation('file:///x')).toEqual({action: 'deny'});
    expect(decideNavigation('http://example.invalid')).toEqual({action: 'deny'});
  });

  it('refuse une adresse https sans hôte et ouvre l’externe quelle que soit la casse', () => {
    expect(decideNavigation('https://')).toEqual({action: 'deny'});
    expect(decideNavigation('')).toEqual({action: 'deny'});
    expect(decideNavigation('HTTPS://pay.example.invalid/x')).toEqual({
      action: 'openExternal',
      url: 'HTTPS://pay.example.invalid/x',
    });
  });

  it('about:blank reste autorisé', () => {
    expect(decideNavigation('about:blank')).toEqual({action: 'allow'});
  });
});
