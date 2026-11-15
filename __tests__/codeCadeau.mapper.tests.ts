import {mapRedeemCode} from '../src/core/api/endpoints/payment/codeCadeau.mapper';

describe('mapRedeemCode', () => {
  it('succès : montant crédité', () => {
    const r = mapRedeemCode(200, {
      status: 'succes',
      montantDsi: 500,
      message: 'ok',
    });
    expect(r).toEqual({
      kind: 'success',
      status: 'succes',
      montantDsi: 500,
      message: 'ok',
    });
  });

  it('refus : message unique du contrat §2.7, repris tel quel, sans raison déduite', () => {
    const r = mapRedeemCode(200, {
      status: 'refuse',
      message: 'Ce code est invalide ou a expiré.',
    });
    expect(r).toEqual({
      kind: 'success',
      status: 'refuse',
      message: 'Ce code est invalide ou a expiré.',
    });
    expect(r).not.toHaveProperty('reason');
  });

  it('refus : un texte « déjà utilisé » du serveur ne crée aucune raison', () => {
    const r = mapRedeemCode(200, {
      status: 'refuse',
      message: 'Ce code a déjà été utilisé.',
    });
    expect(r.kind).toBe('success');
    expect(r).not.toHaveProperty('reason');
    if (r.kind === 'success' && r.status === 'refuse') {
      expect(r.message).toBe('Ce code a déjà été utilisé.');
    }
  });

  it('refus sans message : message null (l\'écran affiche le texte par défaut)', () => {
    const r = mapRedeemCode(200, {status: 'refuse'});
    expect(r).toEqual({kind: 'success', status: 'refuse', message: null});
  });

  it('429', () => {
    const r = mapRedeemCode(429, {});
    expect(r.kind).toBe('failure');
    if (r.kind === 'failure') expect(r.errorKind).toBe('tooMany');
  });
});
