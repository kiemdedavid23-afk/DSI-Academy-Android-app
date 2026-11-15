import {mapMoyensRetrait} from '../src/core/api/endpoints/payment/moyensRetrait.mapper';
import {mapWithdrawRequest} from '../src/core/api/endpoints/payment/retraits.mapper';

describe('mapMoyensRetrait', () => {
  it('strict strings', () => {
    const r = mapMoyensRetrait(200, {
      pays: 'BF',
      moyens: ['Orange Money', 'Moov Money', 12, null, ''],
    });
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.moyens).toEqual(['Orange Money', 'Moov Money']);
    }
  });
});

describe('mapWithdrawRequest', () => {
  it('success net fields', () => {
    const r = mapWithdrawRequest(200, {
      status: 'demande_enregistree',
      idRetrait: 'RET-1',
      montantDsiDemande: 5000,
      montantDsiNet: 5000,
      montantFcfaDemande: 2000,
      fraisRetraitFcfa: 190,
      montantFcfa: 1810,
      statut: 'demande',
      dateDemande: '2026-11-14T09:30:00.000Z',
      moyenPaiement: 'Orange Money',
      message: 'ok',
    });
    expect(r.kind).toBe('success');
    if (r.kind === 'success' && r.status === 'demande_enregistree') {
      expect(r.montantFcfa).toBe(1810);
      expect(r.fraisRetraitFcfa).toBe(190);
    }
  });
  it('refuse', () => {
    const r = mapWithdrawRequest(200, {status: 'refuse', message: 'Hors horaires'});
    expect(r.kind).toBe('success');
    if (r.kind === 'success') expect(r.status).toBe('refuse');
  });
});
