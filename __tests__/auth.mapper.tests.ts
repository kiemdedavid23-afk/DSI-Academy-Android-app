import {mapAuthConnexionResponse} from '@core/api/endpoints/payment/auth.mapper';
import connecte from '../contracts/payment/auth.connexion.connecte.json';
import connecteNull from '../contracts/payment/auth.connexion.connecte.accessProof-null.json';
import pendingDirect from '../contracts/payment/auth.connexion.pending_payment.direct.json';
import pendingHosted from '../contracts/payment/auth.connexion.pending_payment.hosted.json';
import refuse from '../contracts/payment/auth.connexion.refuse.json';
import suspendu from '../contracts/payment/auth.connexion.suspendu.json';
import http400 from '../contracts/payment/auth.connexion.http400.json';

describe('mapAuthConnexionResponse', () => {
  it('mappe connecte avec token', () => {
    const r = mapAuthConnexionResponse(200, connecte);
    expect(r.kind).toBe('session');
    if (r.kind === 'session') {
      expect(r.token).toBe('TEST_TOKEN_NOT_REAL');
      expect(r.accessProof).toBe('TEST_ACCESS_PROOF_NOT_REAL');
      expect(r.expiresIn).toBe(604800);
    }
  });

  it('accepte accessProof null et abonnement inactif', () => {
    const r = mapAuthConnexionResponse(200, connecteNull);
    expect(r.kind).toBe('session');
    if (r.kind === 'session') {
      expect(r.accessProof).toBeNull();
      expect(r.subscriptionActive).toBe(false);
    }
  });

  it('mappe pending_payment direct', () => {
    const r = mapAuthConnexionResponse(200, pendingDirect);
    expect(r).toEqual({
      kind: 'pendingPayment',
      userId: 'DSI-00000',
      paymentTrackingToken: 'TEST_TRACKING_TOKEN_NOT_REAL',
      paymentMode: 'direct',
      paymentUrl: null,
    });
  });

  it('mappe pending_payment hosted', () => {
    const r = mapAuthConnexionResponse(200, pendingHosted);
    expect(r.kind).toBe('pendingPayment');
    if (r.kind === 'pendingPayment') {
      expect(r.paymentMode).toBe('hosted');
      expect(r.paymentUrl).toContain('.invalid');
    }
  });

  it('mappe refuse avec message Worker', () => {
    const r = mapAuthConnexionResponse(200, refuse);
    expect(r).toEqual({
      kind: 'failure',
      errorKind: 'credentials',
      message: 'Identifiant ou mot de passe incorrect.',
    });
  });

  it('mappe suspendu avec message Worker', () => {
    const r = mapAuthConnexionResponse(200, suspendu);
    expect(r.kind).toBe('failure');
    if (r.kind === 'failure') {
      expect(r.errorKind).toBe('refused');
    }
    if (r.kind === 'failure') {
      expect(r.message).toContain('suspendu');
    }
  });

  it('mappe HTTP 400 en failure', () => {
    const r = mapAuthConnexionResponse(400, http400);
    expect(r.kind).toBe('failure');
  });

  it('connecte sans token → failure', () => {
    const r = mapAuthConnexionResponse(200, {
      status: 'connecte',
      token: '',
    });
    expect(r.kind).toBe('failure');
  });

  it('pending_payment sans jeton → failure', () => {
    const r = mapAuthConnexionResponse(200, {
      status: 'pending_payment',
      paymentMode: 'direct',
    });
    expect(r.kind).toBe('failure');
  });

  it('status inconnu → failure', () => {
    const r = mapAuthConnexionResponse(200, {status: 'autre'});
    expect(r.kind).toBe('failure');
  });
});
