import {mapMemberPayments} from '../src/core/api/endpoints/payment/paiements.mapper';
import {mapMemberReferral} from '../src/core/api/endpoints/payment/parrainage.mapper';
import page1 from '../contracts/payment/membre.paiements.page1.json';
import zero from '../contracts/payment/membre.parrainage.zero.json';
import withH from '../contracts/payment/membre.parrainage.withHistory.json';

describe('mapMemberPayments', () => {
  it('envelope + statuses', () => {
    const r = mapMemberPayments(200, page1);
    expect(r.kind).toBe('success');
    if (r.kind !== 'success') return;
    expect(r.data.total).toBe(3);
    expect(r.data.paiements[0].statut).toBe('paid');
    expect(r.data.paiements[1].montant).toBe('2100');
    expect(r.data.paiements[2].statut).toBe('refunded');
  });
  it('404 notFound', () => {
    const r = mapMemberPayments(404, {erreur: 'x'});
    expect(r.kind).toBe('failure');
    if (r.kind === 'failure') expect(r.notFound).toBe(true);
  });
  it('missing fields → nulls', () => {
    const r = mapMemberPayments(200, {
      paiements: [{}],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.data.paiements[0].idTransaction).toBeNull();
    }
  });
});

describe('mapMemberReferral', () => {
  it('zero filleuls', () => {
    const r = mapMemberReferral(200, zero);
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.data.filleulsDirectsTotal).toBe(0);
      expect(r.data.historique).toEqual([]);
      expect(r.data.historiqueLimite).toBe(50);
    }
  });
  it('both historique metas + items from site', () => {
    const r = mapMemberReferral(200, withH);
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.data.historiqueHasMore).toBe(false);
      expect(r.data.historique[0].type).toBe('gain_parrainage_n1');
      expect(r.data.historique[0].montant).toBe(500);
    }
  });
});
