import {mapRenewSubscription} from '../src/core/api/endpoints/payment/abonnement.mapper';
import {mapPaymentNetworks, mapPaymentStatus} from '../src/core/api/endpoints/payment/paiement.mapper';
import active from '../contracts/payment/abonnement.renouveler.active.json';
import refuse from '../contracts/payment/abonnement.renouveler.refuse.json';
import pendingD from '../contracts/payment/abonnement.renouveler.pending_direct.json';
import pendingH from '../contracts/payment/abonnement.renouveler.pending_hosted.json';
import reseaux from '../contracts/payment/paiement.reseaux.renouvellement.json';

describe('mapRenewSubscription', () => {
  it('active', () => {
    const r = mapRenewSubscription(200, active);
    expect(r.kind).toBe('success');
    if (r.kind === 'success') expect(r.status).toBe('active');
  });
  it('refuse', () => {
    const r = mapRenewSubscription(200, refuse);
    expect(r.kind).toBe('success');
    if (r.kind === 'success' && r.status === 'refuse') {
      expect(r.message).toMatch(/Solde/);
    }
  });
  it('pending direct', () => {
    const r = mapRenewSubscription(200, pendingD);
    expect(r.kind).toBe('success');
    if (r.kind === 'success' && r.status === 'pending_payment') {
      expect(r.paymentTrackingToken).toBeTruthy();
      expect(r.paymentUrl).toBeNull();
    }
  });
  it('pending hosted', () => {
    const r = mapRenewSubscription(200, pendingH);
    expect(r.kind).toBe('success');
    if (r.kind === 'success' && r.status === 'pending_payment') {
      expect(r.paymentUrl).toMatch(/^https:/);
    }
  });
  it('unknown status', () => {
    const r = mapRenewSubscription(200, {status: 'weird'});
    expect(r.kind).toBe('failure');
  });
  it('unreadable body', () => {
    expect(mapRenewSubscription(200, null, 'invalid').kind).toBe('failure');
  });
  it('429 unavailable', () => {
    const r = mapRenewSubscription(429, {});
    expect(r.kind).toBe('failure');
    if (r.kind === 'failure') expect(r.errorKind).toBe('unavailable');
  });
});

describe('mapPaymentNetworks', () => {
  it('maps known fields and ignores unknown', () => {
    const r = mapPaymentNetworks(200, {
      ...reseaux,
      reseaux: [
        {...reseaux.reseaux[0], extraProviderField: true},
      ],
    });
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.data.montant).toBe(1050);
      expect(r.data.reseaux[0].code).toBe('orange');
      expect(r.data.reseaux[0].otpRequis).toBe(true);
      expect(r.data.reseaux[0].instructionsOtp).toMatch(/1050/);
      expect((r.data.reseaux[0] as any).extraProviderField).toBeUndefined();
    }
  });
  it('empty list', () => {
    const r = mapPaymentNetworks(200, {mode: 'direct', montant: 0, reseaux: []});
    expect(r.kind).toBe('success');
    if (r.kind === 'success') expect(r.data.reseaux).toEqual([]);
  });
  it('otpRequis absent → false', () => {
    const r = mapPaymentNetworks(200, {
      mode: 'direct',
      montant: 1,
      reseaux: [{code: 'x', libelle: 'X'}],
    });
    expect(r.kind).toBe('success');
    if (r.kind === 'success') expect(r.data.reseaux[0].otpRequis).toBe(false);
  });
});

describe('mapPaymentStatus', () => {
  it.each(['non_initie', 'attente', 'active', 'refuse', 'introuvable'])(
    '%s',
    st => {
      const r = mapPaymentStatus(200, {status: st});
      expect(r.kind).toBe('success');
      if (r.kind === 'success') expect(r.status).toBe(st);
    },
  );
});
