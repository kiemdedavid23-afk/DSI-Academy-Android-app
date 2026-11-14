import {canAccessResource} from '@shared/access';

describe('canAccessResource', () => {
  it('refuse si abonnement requis et inactif', () => {
    expect(
      canAccessResource({
        subscriptionActive: false,
        requireSubscription: true,
      }),
    ).toEqual({ok: false, reason: 'subscription_required'});
  });

  it('refuse si preuve requise et absente', () => {
    expect(
      canAccessResource({
        subscriptionActive: true,
        accessProof: null,
        requireSubscription: true,
        requireProof: true,
      }),
    ).toEqual({ok: false, reason: 'proof_required'});
  });

  it('ok si abonnement actif et preuve non requise', () => {
    expect(
      canAccessResource({
        subscriptionActive: true,
        accessProof: null,
        requireSubscription: true,
        requireProof: false,
      }),
    ).toEqual({ok: true, reason: null});
  });

  it('ok si abonnement non requis', () => {
    expect(
      canAccessResource({
        subscriptionActive: false,
        requireSubscription: false,
      }),
    ).toEqual({ok: true, reason: null});
  });

  it('ok avec preuve quand requise', () => {
    expect(
      canAccessResource({
        subscriptionActive: true,
        accessProof: 'PROOF',
        requireProof: true,
      }),
    ).toEqual({ok: true, reason: null});
  });
});
