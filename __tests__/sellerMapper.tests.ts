import type {EnvelopeResult} from '@core/network';
import {
  mapSellerAnalytics,
  mapSellerApplication,
  mapSellerCategories,
  mapSellerEarnings,
  mapSellerListingDetail,
  mapSellerListings,
  mapSellerListingStatus,
  mapSellerOrderDetail,
  mapSellerOrders,
  mapSellerOverview,
  mapSellerProfile,
  mapSellerProfileUpdate,
  mapSellerReviews,
  mapSellerWrite,
} from '@core/api/endpoints/marketplace/seller/seller.mapper';
import overview from '../contracts/marketplace/seller/overview.json';
import overviewSuspended from '../contracts/marketplace/seller/overview.suspended.json';
import profile from '../contracts/marketplace/seller/profile.json';
import profileUpdate from '../contracts/marketplace/seller/profile.update.json';
import categories from '../contracts/marketplace/seller/categories.json';
import listings from '../contracts/marketplace/seller/listings.json';
import listingDetail from '../contracts/marketplace/seller/listing.detail.json';
import listingStatus from '../contracts/marketplace/seller/listing.status.json';
import orders from '../contracts/marketplace/seller/orders.json';
import orderDetail from '../contracts/marketplace/seller/order.detail.json';
import earnings from '../contracts/marketplace/seller/earnings.json';
import analytics from '../contracts/marketplace/seller/analytics.json';
import reviews from '../contracts/marketplace/seller/reviews.json';
import appApproved from '../contracts/marketplace/seller/application.approved.json';
import appNone from '../contracts/marketplace/seller/application.none.json';
import appRejected from '../contracts/marketplace/seller/application.rejected.json';
import trackNot from '../contracts/marketplace/seller/track.notRecorded.json';
import err503 from '../contracts/marketplace/seller/error.503.config.json';
import err403 from '../contracts/marketplace/seller/error.403.forbidden.json';

type Body = {success: boolean; error: string | null; code: string | null; data: unknown};

function env(status: number, b: Body): EnvelopeResult {
  return {
    success: b.success,
    error: b.error,
    code: b.code,
    data: b.data,
    status,
  };
}
const ok = (b: unknown) => env(200, b as Body);
/** Copie profonde modifiable d'une fixture. */
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

describe('Aperçu vendeur', () => {
  it('mappe l’aperçu complet', () => {
    const r = mapSellerOverview(ok(overview));
    expect(r.kind).toBe('success');
    if (r.kind !== 'success') {
      return;
    }
    const o = r.overview;
    expect(o.seller.storeName).toBe('Digital Service International');
    expect(o.seller.logoUrl).toBe('https://cdn.example.invalid/logos/u_77.webp');
    expect(o.seller.storeSlug).toBe('digital-service-international');
    expect(o.profileCompletion.percent).toBe(71);
    expect(o.profileCompletion.missing).toEqual(['slogan', 'cover', 'firstSale']);
    expect(o.balance.availableDsi).toBe(1237);
    expect(o.period.key).toBe('30d');
    expect(o.period.salesDsi.trend).toBe('flat');
    expect(o.counts.products.published).toBe(15);
    expect(o.recentOrders[0].buyerDisplayName).toBe('Awa K.');
    expect(o.recentOrders[0].status).toBe('paid');
    expect(o.topListings[0].revenueDsi).toBe(3000);
  });
  it('vendeur suspendu : statut et suspension lus', () => {
    const r = mapSellerOverview(ok(overviewSuspended));
    expect(r.kind === 'success' && r.overview.seller.status).toBe('SUSPENDED');
    expect(r.kind === 'success' && r.overview.suspension.type).toBe('TEMPORARY');
    expect(r.kind === 'success' && r.overview.suspension.endsAt).toBe(
      Date.parse('2026-12-01T00:00:00Z'),
    );
  });
  it('solde absent : contrat inattendu, pas de données partielles', () => {
    const b = clone(overview);
    delete (b.data as {balance?: unknown}).balance;
    const r = mapSellerOverview(ok(b));
    expect(r.kind === 'failure' && r.errorKind).toBe('invalidResponse');
  });
  it('logo non https : ignoré, jamais affiché', () => {
    const b = clone(overview);
    b.data.seller.logoUrl = 'http://x.invalid/logo.png';
    const r = mapSellerOverview(ok(b));
    expect(r.kind === 'success' && r.overview.seller.logoUrl).toBeNull();
  });
  it('lien de boutique non https : réponse refusée', () => {
    const b = clone(overview);
    b.data.seller.storeUrl = 'javascript:alert(1)';
    const r = mapSellerOverview(ok(b));
    expect(r.kind === 'failure' && r.errorKind).toBe('invalidResponse');
  });
  it('503 CONFIG : service indisponible, code conservé', () => {
    const r = mapSellerOverview(env(503, err503));
    expect(r.kind === 'failure' && r.errorKind).toBe('unavailable');
    expect(r.kind === 'failure' && r.code).toBe('CONFIG');
  });
  it('403 FORBIDDEN : non vendeur', () => {
    const r = mapSellerOverview(env(403, err403));
    expect(r.kind === 'failure' && r.errorKind).toBe('forbidden');
  });
});

describe('Candidature (statut)', () => {
  it('approuvée', () => {
    const r = mapSellerApplication(ok(appApproved));
    expect(r.kind === 'success' && r.application.status).toBe('APPROVED');
  });
  it('rien déposé', () => {
    const r = mapSellerApplication(ok(appNone));
    expect(r.kind === 'success' && r.application.status).toBe('none');
    expect(r.kind === 'success' && r.application.storeName).toBeNull();
  });
  it('refusée : motif conservé', () => {
    const r = mapSellerApplication(ok(appRejected));
    expect(r.kind === 'success' && r.application.status).toBe('REJECTED');
    expect(r.kind === 'success' && r.application.reason).toBe(
      'Pièce d\'identité illisible',
    );
  });
  it('statut inconnu : contrat inattendu', () => {
    const b = clone(appNone);
    (b.data as {status: string}).status = 'WHATEVER';
    const r = mapSellerApplication(ok(b));
    expect(r.kind === 'failure' && r.errorKind).toBe('invalidResponse');
  });
});

describe('Profil et catégories', () => {
  it('profil avec limites', () => {
    const r = mapSellerProfile(ok(profile));
    expect(r.kind === 'success' && r.profile.limits.bioMax).toBe(2000);
    expect(r.kind === 'success' && r.profile.ratingCount).toBe(12);
  });
  it('mise à jour : exige updated: true', () => {
    const r = mapSellerProfileUpdate(ok(profileUpdate));
    expect(r.kind === 'success' && r.profile.slogan).toBe('Nouveau slogan');
    const b = clone(profileUpdate);
    (b.data as {updated: boolean}).updated = false;
    const bad = mapSellerProfileUpdate(ok(b));
    expect(bad.kind === 'failure' && bad.errorKind).toBe('invalidResponse');
  });
  it('catégories', () => {
    const r = mapSellerCategories(ok(categories));
    expect(r.kind === 'success' && r.items).toHaveLength(6);
    expect(r.kind === 'success' && r.items[0]).toEqual({slug: 'tools', label: 'Outils'});
  });
});

describe('Produits vendeur', () => {
  it('liste : compteurs, élément, couverture absente', () => {
    const r = mapSellerListings(ok(listings));
    expect(r.kind).toBe('success');
    if (r.kind !== 'success') {
      return;
    }
    expect(r.page.counts.all).toBe(15);
    expect(r.page.items[0].title).toBe('Abonnement DSI Academy');
    expect(r.page.items[0].coverUrl).toBeNull();
    expect(r.page.items[0].free).toBe(false);
    expect(r.page.nextCursor).toBeNull();
  });
  it('produit gratuit : free déduit du prix 0', () => {
    const b = clone(listings);
    b.data.items[0].priceDsi = 0;
    const r = mapSellerListings(ok(b));
    expect(r.kind === 'success' && r.page.items[0].free).toBe(true);
  });
  it('statut de produit inconnu : réponse refusée', () => {
    const b = clone(listings);
    b.data.items[0].status = 'weird';
    const r = mapSellerListings(ok(b));
    expect(r.kind === 'failure' && r.errorKind).toBe('invalidResponse');
  });
  it('détail : lien de livraison et description', () => {
    const r = mapSellerListingDetail(ok(listingDetail));
    expect(r.kind === 'success' && r.listing.deliveryUrl).toBe(
      'https://exemple.invalid/acces',
    );
    expect(r.kind === 'success' && r.listing.description).toBe(
      'Accès complet à l\'académie.',
    );
  });
  it('action de statut : id et statut', () => {
    const r = mapSellerListingStatus(ok(listingStatus));
    expect(r.kind === 'success' && r.status).toBe('pending_review');
  });
});

describe('Ventes et gains', () => {
  it('liste des ventes : résumé sans période précédente', () => {
    const r = mapSellerOrders(ok(orders));
    expect(r.kind).toBe('success');
    if (r.kind !== 'success') {
      return;
    }
    expect(r.page.period.key).toBe('all');
    expect(r.page.summary.revenueDsi.value).toBe(1300);
    expect(r.page.summary.revenueDsi.previous).toBeNull();
    expect(r.page.summary.revenueDsi.deltaPct).toBeNull();
    expect(r.page.summary.netRevenueDsi.value).toBe(1170);
    expect(r.page.items[0].netSellerDsi).toBe(900);
  });
  it('statut de commande inconnu : reste « en cours »', () => {
    const b = clone(orders);
    b.data.items[0].status = 'refunded';
    const r = mapSellerOrders(ok(b));
    expect(r.kind === 'success' && r.page.items[0].status).toBe('processing');
  });
  it('acheteur inconnu : nom et pays null', () => {
    const b = clone(orders);
    (b.data.items[0] as {buyerDisplayName: unknown}).buyerDisplayName = null;
    (b.data.items[0] as {buyerCountry: unknown}).buyerCountry = null;
    const r = mapSellerOrders(ok(b));
    expect(r.kind === 'success' && r.page.items[0].buyerDisplayName).toBeNull();
    expect(r.kind === 'success' && r.page.items[0].buyerCountry).toBeNull();
  });
  it('détail : valeurs techniques jamais exposées', () => {
    const r = mapSellerOrderDetail(ok(orderDetail));
    expect(r.kind === 'success' && r.order.paidAt).toBe(
      Date.parse('2026-11-18T15:02:05Z'),
    );
    expect(r.kind === 'success' && 'paymentRef' in r.order).toBe(false);
    expect(r.kind === 'success' && 'financialStatus' in r.order).toBe(false);
  });
  it('gains : solde réel et écritures', () => {
    const r = mapSellerEarnings(ok(earnings));
    expect(r.kind === 'success' && r.earnings.availableDsi).toBe(1237);
    expect(r.kind === 'success' && r.earnings.ledger[0].amountDsi).toBe(900);
  });
  it('gains : 503 CONFIG', () => {
    const r = mapSellerEarnings(env(503, err503));
    expect(r.kind === 'failure' && r.code).toBe('CONFIG');
  });
});

describe('Analyses et avis', () => {
  it('analyses : indicateurs, série, entonnoir', () => {
    const r = mapSellerAnalytics(ok(analytics));
    expect(r.kind).toBe('success');
    if (r.kind !== 'success') {
      return;
    }
    const a = r.analytics;
    expect(a.period.granularity).toBe('day');
    expect(a.kpis.uniqueVisitors).toEqual({
      value: 7,
      previous: 6,
      deltaPct: 16.7,
      trend: 'up',
    });
    expect(a.kpis.successRate.percent).toBe(0);
    expect(a.series).toHaveLength(1);
    expect(a.funnel.storeViews).toBe(11);
    expect(a.topListings[0].conversionPct).toBe(7.5);
    expect(a.byCountry[0].country).toBe('BF');
  });
  it('granularité inconnue : réponse refusée', () => {
    const b = clone(analytics);
    (b.data.period as {granularity: string}).granularity = 'week';
    const r = mapSellerAnalytics(ok(b));
    expect(r.kind === 'failure' && r.errorKind).toBe('invalidResponse');
  });
  it('tendance inconnue : « flat »', () => {
    const b = clone(analytics);
    (b.data.kpis.pageViews as {trend: string}).trend = 'sideways';
    const r = mapSellerAnalytics(ok(b));
    expect(r.kind === 'success' && r.analytics.kpis.pageViews.trend).toBe('flat');
  });
  it('avis : répartition et note', () => {
    const r = mapSellerReviews(ok(reviews));
    expect(r.kind === 'success' && r.page.summary.rating).toBe(4.5);
    expect(r.kind === 'success' && r.page.summary.distribution['5']).toBe(7);
    expect(r.kind === 'success' && r.page.items[0].rating).toBe(5);
  });
  it('avis : note hors 1 à 5 refusée', () => {
    const b = clone(reviews);
    b.data.items[0].rating = 9;
    const r = mapSellerReviews(ok(b));
    expect(r.kind === 'failure' && r.errorKind).toBe('invalidResponse');
  });
});

describe('Écritures', () => {
  it('« recorded: false » n’est pas une erreur', () => {
    expect(mapSellerWrite(ok(trackNot)).kind).toBe('success');
  });
  it('429 : indisponible, code conservé', () => {
    const r = mapSellerWrite(
      env(429, {success: false, error: 'x', code: 'RATE_LIMITED', data: null}),
    );
    expect(r.kind === 'failure' && r.errorKind).toBe('unavailable');
    expect(r.kind === 'failure' && r.code).toBe('RATE_LIMITED');
  });
  it('409 : conflit', () => {
    const r = mapSellerListingStatus(
      env(409, {success: false, error: 'x', code: 'CONFLICT', data: null}),
    );
    expect(r.kind === 'failure' && r.errorKind).toBe('conflict');
  });
});
