import {isSiteUrl} from '@core/config/serviceRegistry';
import {BUILD_CONFIG} from '@core/config/buildConfig.generated';

const siteHost = new URL(BUILD_CONFIG.registry.web).hostname;

describe('isSiteUrl', () => {
  it('accepte https de l’hôte site', () => {
    expect(isSiteUrl(`https://${siteHost}/inscription`)).toBe(true);
    expect(isSiteUrl(`https://${siteHost}/`)).toBe(true);
  });

  it('refuse sous-domaine', () => {
    expect(isSiteUrl(`https://sub.${siteHost}/x`)).toBe(false);
  });

  it('refuse hôte qui contient le nom', () => {
    expect(isSiteUrl(`https://not${siteHost}/x`)).toBe(false);
    expect(isSiteUrl(`https://${siteHost}.evil.invalid/x`)).toBe(false);
  });

  it('refuse http', () => {
    expect(isSiteUrl(`http://${siteHost}/x`)).toBe(false);
  });

  it('refuse intent et file', () => {
    expect(isSiteUrl('intent://pay')).toBe(false);
    expect(isSiteUrl('file:///tmp/x')).toBe(false);
  });
});
