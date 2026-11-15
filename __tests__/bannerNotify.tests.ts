/**
 * bannerStore.notify : message lisible (Worker) affiché tel quel, titre selon le ton.
 */

import {bannerStore} from '../src/shared/store/bannerStore';

describe('bannerStore.notify', () => {
  beforeEach(() => {
    bannerStore.dismiss();
  });

  it('erreur : texte brut, titre app.notice.error, fermable, disparaît en 8 s', () => {
    bannerStore.notify({tone: 'error', message: 'Identifiants incorrects'});
    const b = bannerStore.get();
    expect(b?.tone).toBe('error');
    expect(b?.messageText).toBe('Identifiants incorrects');
    expect(b?.titleKey).toBe('app.notice.error');
    expect(b?.dismissible).toBe(true);
    expect(b?.autoHideMs).toBe(8000);
  });

  it('succès : disparaît en 5 s', () => {
    bannerStore.notify({tone: 'success', message: 'Demande envoyée'});
    expect(bannerStore.get()?.autoHideMs).toBe(5000);
    expect(bannerStore.get()?.titleKey).toBe('app.notice.success');
  });

  it('une seule bannière : la plus récente remplace la précédente', () => {
    bannerStore.notify({tone: 'error', message: 'A'});
    bannerStore.notify({tone: 'warning', message: 'B'});
    expect(bannerStore.get()?.messageText).toBe('B');
  });
});
