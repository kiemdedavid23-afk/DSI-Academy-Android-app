/**
 * Le label de bootstrap avant ready ne doit jamais être la clé brute.
 * initI18n('fr') est appelé au chargement du module AppProviders.
 */
import {i18n, initI18n} from '@shared/i18n';

describe('AppProviders bootstrap i18n', () => {
  it('common.loading résolu en français sans clé brute', () => {
    initI18n('fr');
    const label = i18n.t('common.loading');
    expect(label).toBe('Chargement…');
    expect(label).not.toBe('common.loading');
  });
});
