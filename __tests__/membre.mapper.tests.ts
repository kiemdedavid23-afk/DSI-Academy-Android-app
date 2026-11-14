import {
  mapMemberBalance,
  mapMemberProfile,
  mapMemberSubscription,
  mapMemberWithdrawals,
} from '@core/api/endpoints/payment/membre.mapper';

describe('membre.mapper', () => {
  it('profil succès racine', () => {
    const r = mapMemberProfile(200, {
      identifiantDsi: 'DSI-000123',
      nom: 'Ouedraogo',
      prenom: 'Awa',
      statut: 'active',
    });
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.data.identifiantDsi).toBe('DSI-000123');
    }
  });

  it('profil erreur métier 200', () => {
    const r = mapMemberProfile(200, {erreur: 'Compte introuvable'});
    expect(r).toEqual({
      kind: 'failure',
      errorKind: 'business',
      message: 'Compte introuvable',
    });
  });

  it('solde convertit chaînes en nombres', () => {
    const r = mapMemberBalance(200, {
      identifiantDsi: 'DSI-1',
      soldeDsiActuel: '5000',
      totalDsiGagnes: '12000',
    });
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.data.soldeDsiActuel).toBe(5000);
      expect(r.data.totalDsiGagnes).toBe(12000);
    }
  });

  it('abonnement types', () => {
    const r = mapMemberSubscription(200, {
      formule: 'acces_initial',
      dateDebut: '2026-11-14T10:00:00.000Z',
      dateFin: '2027-11-14T10:00:00.000Z',
      statut: 'active',
      modePaiement: 'fcfa',
      renouvellements: [],
    });
    expect(r.kind).toBe('success');
  });

  it('retraits mappe montantDsiNet', () => {
    const r = mapMemberWithdrawals(200, {
      total: 1,
      retraits: [
        {
          idRetrait: 'RET-1',
          montantDsiNet: '1000',
          statut: 'en_attente',
          dateDemande: '2026-11-10T08:00:00.000Z',
        },
      ],
    });
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.data.retraits[0].montantDsiNet).toBe(1000);
      expect(r.data.retraits[0].statut).toBe('en_attente');
    }
  });

  it('503 → server', () => {
    expect(mapMemberProfile(503, {}).errorKind).toBe('server');
  });
});
