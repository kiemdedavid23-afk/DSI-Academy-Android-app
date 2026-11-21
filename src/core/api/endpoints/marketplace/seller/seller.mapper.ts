/**
 * Espace vendeur (lot S1) : validation et conversion des réponses du Worker.
 * Un écart de contrat (champ obligatoire absent ou mal typé) donne l'échec
 * `invalidResponse`, lisible dans les logs, jamais un plantage d'écran.
 * Valeurs inconnues : statut de commande → `processing` ; le reste est refusé.
 */

import type {EnvelopeResult} from '@core/network';
import {
  asEpochMs,
  asHttpsUrl,
  asInt,
  asNumber,
  asRecord,
  asString,
  checkEnvelope,
  failure,
} from '../../commerce/commerce.mapper';
import {
  SELLER_PERIODS,
  type SellerAnalytics,
  type SellerAnalyticsListing,
  type SellerApplication,
  type SellerApplicationStatus,
  type SellerBalance,
  type SellerCategory,
  type SellerEarnings,
  type SellerFailure,
  type SellerLedgerEntry,
  type SellerListingCounts,
  type SellerListingDetail,
  type SellerListingStatus,
  type SellerListingSummary,
  type SellerListingsPage,
  type SellerMetric,
  type SellerOrderDetail,
  type SellerOrderItem,
  type SellerOrderStatus,
  type SellerOrdersPage,
  type SellerOverview,
  type SellerPeriodInfo,
  type SellerProfile,
  type SellerResult,
  type SellerReview,
  type SellerReviewsPage,
  type SellerSeriesPoint,
  type SellerStatus,
  type SellerStore,
  type SellerSuccessRate,
  type SellerTopListing,
  type SellerTrend,
  type SellerVisibility,
  type SellerWriteResult,
} from './seller.types';

function invalid(env: EnvelopeResult): SellerFailure {
  return failure('invalidResponse', env.status, 'INVALID_RESPONSE');
}

function list(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** Entier ≥ 0, sinon null. */
function nat(v: unknown): number | null {
  const n = asInt(v);
  return n !== null && n >= 0 ? n : null;
}

function cursor(v: unknown): string | null {
  return asString(v);
}

// ─── Briques communes ────────────────────────────────────────────────────

function trendOf(v: unknown): SellerTrend {
  return v === 'up' || v === 'down' ? v : 'flat';
}

export function mapSellerMetric(raw: unknown): SellerMetric | null {
  const r = asRecord(raw);
  if (!r) {
    return null;
  }
  const value = asNumber(r.value);
  if (value === null) {
    return null;
  }
  return {
    value,
    previous: asNumber(r.previous),
    deltaPct: asNumber(r.deltaPct),
    trend: trendOf(r.trend),
  };
}

function mapPeriodInfo(raw: unknown): SellerPeriodInfo | null {
  const r = asRecord(raw);
  if (!r) {
    return null;
  }
  const key = SELLER_PERIODS.find(p => p === r.key);
  if (!key) {
    return null;
  }
  return {key, from: asEpochMs(r.from), to: asEpochMs(r.to)};
}

function mapSellerStatus(v: unknown): SellerStatus | null {
  return v === 'APPROVED' || v === 'SUSPENDED' || v === 'REVOKED' ? v : null;
}

const LISTING_STATUSES: SellerListingStatus[] = [
  'draft',
  'pending_review',
  'published',
  'rejected',
  'suspended',
  'archived',
];

function mapListingStatus(v: unknown): SellerListingStatus | null {
  return LISTING_STATUSES.find(s => s === v) ?? null;
}

/** Tout statut de commande inconnu reste « en cours » (jamais payée à tort). */
export function mapSellerOrderStatus(v: unknown): SellerOrderStatus {
  return v === 'paid' || v === 'failed' ? v : 'processing';
}

function mapVisibility(v: unknown): SellerVisibility {
  return v === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';
}

function mapCounts(raw: unknown): SellerListingCounts | null {
  const r = asRecord(raw);
  if (!r) {
    return null;
  }
  const all = nat(r.all);
  if (all === null) {
    return null;
  }
  return {
    all,
    published: nat(r.published) ?? 0,
    draft: nat(r.draft) ?? 0,
    pending_review: nat(r.pending_review) ?? 0,
    rejected: nat(r.rejected) ?? 0,
    suspended: nat(r.suspended) ?? 0,
    archived: nat(r.archived) ?? 0,
  };
}

function mapStore(raw: unknown): SellerStore | null {
  const r = asRecord(raw);
  if (!r) {
    return null;
  }
  const storeName = asString(r.storeName);
  const status = mapSellerStatus(r.status);
  const storeSlug = asString(r.storeSlug);
  const storeUrl = asHttpsUrl(r.storeUrl);
  if (!storeName || !status || !storeSlug || !storeUrl) {
    return null;
  }
  return {
    storeName,
    slogan: asString(r.slogan),
    bio: asString(r.bio),
    logoUrl: asHttpsUrl(r.logoUrl),
    status,
    rating: asNumber(r.rating),
    ratingCount: nat(r.ratingCount) ?? 0,
    storeSlug,
    storeUrl,
    joinedAt: asEpochMs(r.joinedAt),
  };
}

function mapTopListing(raw: unknown): SellerTopListing | null {
  const r = asRecord(raw);
  if (!r) {
    return null;
  }
  const id = asString(r.id);
  const title = asString(r.title);
  if (!id || !title) {
    return null;
  }
  return {
    id,
    title,
    coverUrl: asHttpsUrl(r.coverUrl),
    salesCount: nat(r.salesCount) ?? 0,
    revenueDsi: nat(r.revenueDsi) ?? 0,
  };
}

function mapOrderItem(raw: unknown): SellerOrderItem | null {
  const r = asRecord(raw);
  if (!r) {
    return null;
  }
  const id = asString(r.id);
  const priceDsi = nat(r.priceDsi);
  if (!id || priceDsi === null) {
    return null;
  }
  return {
    id,
    listingId: asString(r.listingId),
    listingTitle: asString(r.listingTitle),
    coverUrl: asHttpsUrl(r.coverUrl),
    buyerDisplayName: asString(r.buyerDisplayName),
    buyerCountry: asString(r.buyerCountry),
    priceDsi,
    commissionDsi: nat(r.commissionDsi) ?? 0,
    feesDsi: nat(r.feesDsi) ?? 0,
    netSellerDsi: nat(r.netSellerDsi) ?? 0,
    status: mapSellerOrderStatus(r.status),
    createdAt: asEpochMs(r.createdAt),
  };
}

function mapListingSummary(raw: unknown): SellerListingSummary | null {
  const r = asRecord(raw);
  if (!r) {
    return null;
  }
  const id = asString(r.id);
  const title = asString(r.title) ?? asString(r.name);
  const priceDsi = nat(r.priceDsi);
  const status = mapListingStatus(r.status);
  if (!id || !title || priceDsi === null || !status) {
    return null;
  }
  return {
    id,
    title,
    category: asString(r.category),
    categoryLabel: asString(r.categoryLabel),
    priceDsi,
    free: priceDsi === 0,
    status,
    visibility: mapVisibility(r.visibility),
    coverUrl: asHttpsUrl(r.coverUrl),
    salesCount: nat(r.salesCount) ?? 0,
    revenueDsi: nat(r.revenueDsi) ?? 0,
    viewsCount: nat(r.viewsCount) ?? 0,
    rejectionReason: asString(r.rejectionReason),
    createdAt: asEpochMs(r.createdAt),
    updatedAt: asEpochMs(r.updatedAt),
  };
}

function mapListingDetail(raw: unknown): SellerListingDetail | null {
  const base = mapListingSummary(raw);
  const r = asRecord(raw);
  if (!base || !r) {
    return null;
  }
  return {
    ...base,
    description: asString(r.description),
    deliveryType: asString(r.deliveryType),
    deliveryUrl: asString(r.deliveryUrl),
    imageFileId: asString(r.imageFileId),
  };
}

function mapAll<T>(raw: unknown, one: (x: unknown) => T | null): T[] | null {
  const out: T[] = [];
  for (const item of list(raw)) {
    const m = one(item);
    if (m === null) {
      return null;
    }
    out.push(m);
  }
  return out;
}

// ─── Candidature ─────────────────────────────────────────────────────────

const APPLICATION_STATUSES: SellerApplicationStatus[] = [
  'none',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'SUSPENDED',
  'REVOKED',
];

export function mapSellerApplication(
  env: EnvelopeResult,
): SellerResult<{application: SellerApplication}> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  const r = asRecord(env.data);
  const status = APPLICATION_STATUSES.find(s => s === r?.status);
  if (!r || !status) {
    return invalid(env);
  }
  return {
    kind: 'success',
    application: {
      status,
      reason: asString(r.reason),
      storeName: asString(r.storeName),
      slogan: asString(r.slogan),
      description: asString(r.description),
      submittedAt: asEpochMs(r.submittedAt),
      reviewedAt: asEpochMs(r.reviewedAt),
    },
  };
}

// ─── Aperçu ──────────────────────────────────────────────────────────────

export function mapSellerOverview(
  env: EnvelopeResult,
): SellerResult<{overview: SellerOverview}> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  const r = asRecord(env.data);
  const seller = mapStore(r?.seller);
  const susp = asRecord(r?.suspension);
  const completion = asRecord(r?.profileCompletion);
  const bal = asRecord(r?.balance);
  const per = asRecord(r?.period);
  const periodInfo = mapPeriodInfo(per);
  const salesDsi = mapSellerMetric(per?.salesDsi);
  const orders = mapSellerMetric(per?.orders);
  const cnt = asRecord(r?.counts);
  const products = mapCounts(cnt?.products);
  const percent = nat(completion?.percent);
  const available = nat(bal?.availableDsi);
  const recent = mapAll(r?.recentOrders, mapOrderItem);
  const top = mapAll(r?.topListings, mapTopListing);
  if (
    !r ||
    !seller ||
    !susp ||
    !completion ||
    percent === null ||
    available === null ||
    !periodInfo ||
    !salesDsi ||
    !orders ||
    !products ||
    !recent ||
    !top
  ) {
    return invalid(env);
  }
  const balance: SellerBalance = {
    availableDsi: available,
    pendingDsi: nat(bal?.pendingDsi) ?? 0,
    asOf: asEpochMs(bal?.asOf),
  };
  return {
    kind: 'success',
    overview: {
      seller,
      suspension: {
        type: asString(susp.type),
        reason: asString(susp.reason),
        endsAt: asEpochMs(susp.endsAt),
        revokedAt: asEpochMs(susp.revokedAt),
      },
      profileCompletion: {
        percent,
        missing: list(completion.missing).filter(
          (m): m is string => typeof m === 'string',
        ),
      },
      balance,
      period: {...periodInfo, salesDsi, orders},
      counts: {
        products,
        ordersTotal: nat(cnt?.ordersTotal) ?? 0,
        ordersPaidTotal: nat(cnt?.ordersPaidTotal) ?? 0,
        revenueTotalDsi: nat(cnt?.revenueTotalDsi) ?? 0,
      },
      recentOrders: recent,
      topListings: top,
    },
  };
}

// ─── Profil, catégories ──────────────────────────────────────────────────

function mapProfile(raw: unknown): SellerProfile | null {
  const store = mapStore(raw);
  const lim = asRecord(asRecord(raw)?.limits);
  if (!store || !lim) {
    return null;
  }
  const storeNameMax = nat(lim.storeNameMax);
  const sloganMax = nat(lim.sloganMax);
  const bioMax = nat(lim.bioMax);
  const logoMaxBytes = nat(lim.logoMaxBytes);
  if (
    storeNameMax === null ||
    sloganMax === null ||
    bioMax === null ||
    logoMaxBytes === null
  ) {
    return null;
  }
  return {...store, limits: {storeNameMax, sloganMax, bioMax, logoMaxBytes}};
}

export function mapSellerProfile(
  env: EnvelopeResult,
): SellerResult<{profile: SellerProfile}> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  const profile = mapProfile(env.data);
  return profile ? {kind: 'success', profile} : invalid(env);
}

/** PATCH profil : `{ updated: true, profile }`. */
export function mapSellerProfileUpdate(
  env: EnvelopeResult,
): SellerResult<{profile: SellerProfile}> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  const r = asRecord(env.data);
  const profile = mapProfile(r?.profile);
  return r?.updated === true && profile ? {kind: 'success', profile} : invalid(env);
}

export function mapSellerLogoUpload(
  env: EnvelopeResult,
): SellerResult<{logoUrl: string}> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  const logoUrl = asHttpsUrl(asRecord(env.data)?.logoUrl);
  return logoUrl ? {kind: 'success', logoUrl} : invalid(env);
}

export function mapSellerCategories(
  env: EnvelopeResult,
): SellerResult<{items: SellerCategory[]}> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  const items = mapAll(asRecord(env.data)?.items, raw => {
    const r = asRecord(raw);
    const slug = asString(r?.slug);
    const label = asString(r?.label);
    return slug && label ? {slug, label} : null;
  });
  return items ? {kind: 'success', items} : invalid(env);
}

// ─── Produits ────────────────────────────────────────────────────────────

export function mapSellerListings(
  env: EnvelopeResult,
): SellerResult<{page: SellerListingsPage}> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  const r = asRecord(env.data);
  const counts = mapCounts(r?.counts);
  const items = mapAll(r?.items, mapListingSummary);
  if (!r || !counts || !items) {
    return invalid(env);
  }
  return {
    kind: 'success',
    page: {counts, items, nextCursor: cursor(r.nextCursor)},
  };
}

/** Détail, création, modification, duplication : `{ listing: {…} }`. */
export function mapSellerListingDetail(
  env: EnvelopeResult,
): SellerResult<{listing: SellerListingDetail}> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  const listing = mapListingDetail(asRecord(env.data)?.listing);
  return listing ? {kind: 'success', listing} : invalid(env);
}

/** Soumettre, dépublier, archiver : `{ id, status }`. */
export function mapSellerListingStatus(
  env: EnvelopeResult,
): SellerResult<{id: string; status: SellerListingStatus}> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  const r = asRecord(env.data);
  const id = asString(r?.id);
  const status = mapListingStatus(r?.status);
  return id && status ? {kind: 'success', id, status} : invalid(env);
}

// ─── Ventes, gains ───────────────────────────────────────────────────────

export function mapSellerOrders(
  env: EnvelopeResult,
): SellerResult<{page: SellerOrdersPage}> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  const r = asRecord(env.data);
  const period = mapPeriodInfo(r?.period);
  const sum = asRecord(r?.summary);
  const revenueDsi = mapSellerMetric(sum?.revenueDsi);
  const netRevenueDsi = mapSellerMetric(sum?.netRevenueDsi);
  const paidOrders = mapSellerMetric(sum?.paidOrders);
  const items = mapAll(r?.items, mapOrderItem);
  if (!r || !period || !revenueDsi || !netRevenueDsi || !paidOrders || !items) {
    return invalid(env);
  }
  return {
    kind: 'success',
    page: {
      period,
      summary: {
        revenueDsi,
        netRevenueDsi,
        paidOrders,
        processingOrders: nat(sum?.processingOrders) ?? 0,
        failedOrders: nat(sum?.failedOrders) ?? 0,
      },
      items,
      nextCursor: cursor(r.nextCursor),
    },
  };
}

export function mapSellerOrderDetail(
  env: EnvelopeResult,
): SellerResult<{order: SellerOrderDetail}> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  const raw = asRecord(env.data)?.order;
  const base = mapOrderItem(raw);
  if (!base) {
    return invalid(env);
  }
  // `paymentRef`, `financialStatus` : valeurs techniques, volontairement ignorées.
  return {
    kind: 'success',
    order: {...base, paidAt: asEpochMs(asRecord(raw)?.paidAt)},
  };
}

function mapLedgerEntry(raw: unknown): SellerLedgerEntry | null {
  const r = asRecord(raw);
  const id = asString(r?.id);
  const amountDsi = nat(r?.amountDsi);
  if (!r || !id || amountDsi === null) {
    return null;
  }
  return {
    id,
    orderId: asString(r.orderId),
    listingTitle: asString(r.listingTitle),
    amountDsi,
    type: asString(r.type),
    createdAt: asEpochMs(r.createdAt),
  };
}

export function mapSellerEarnings(
  env: EnvelopeResult,
): SellerResult<{earnings: SellerEarnings}> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  const r = asRecord(env.data);
  const availableDsi = nat(r?.availableDsi);
  const ledger = mapAll(r?.ledger, mapLedgerEntry);
  if (!r || availableDsi === null || !ledger) {
    return invalid(env);
  }
  return {
    kind: 'success',
    earnings: {
      availableDsi,
      pendingDsi: nat(r.pendingDsi) ?? 0,
      ledger,
      nextCursor: cursor(r.nextCursor),
    },
  };
}

// ─── Analyses, avis ──────────────────────────────────────────────────────

function mapSuccessRate(raw: unknown): SellerSuccessRate | null {
  const r = asRecord(raw);
  const percent = asNumber(r?.percent);
  const attempted = nat(r?.attempted);
  const succeeded = nat(r?.succeeded);
  if (!r || percent === null || attempted === null || succeeded === null) {
    return null;
  }
  return {
    percent,
    attempted,
    succeeded,
    previousPercent: asNumber(r.previousPercent),
    trend: trendOf(r.trend),
  };
}

function mapSeriesPoint(raw: unknown): SellerSeriesPoint | null {
  const r = asRecord(raw);
  const date = asString(r?.date);
  if (!r || !date) {
    return null;
  }
  return {
    date,
    netRevenueDsi: nat(r.netRevenueDsi) ?? 0,
    orders: nat(r.orders) ?? 0,
    uniqueVisitors: nat(r.uniqueVisitors) ?? 0,
    pageViews: nat(r.pageViews) ?? 0,
  };
}

function mapAnalyticsListing(raw: unknown): SellerAnalyticsListing | null {
  const base = mapTopListing(raw);
  const r = asRecord(raw);
  if (!base || !r) {
    return null;
  }
  return {
    ...base,
    views: nat(r.views) ?? 0,
    conversionPct: asNumber(r.conversionPct) ?? 0,
  };
}

export function mapSellerAnalytics(
  env: EnvelopeResult,
): SellerResult<{analytics: SellerAnalytics}> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  const r = asRecord(env.data);
  const per = asRecord(r?.period);
  const periodInfo = mapPeriodInfo(per);
  const kpis = asRecord(r?.kpis);
  const netRevenueDsi = mapSellerMetric(kpis?.netRevenueDsi);
  const uniqueVisitors = mapSellerMetric(kpis?.uniqueVisitors);
  const pageViews = mapSellerMetric(kpis?.pageViews);
  const successRate = mapSuccessRate(kpis?.successRate);
  const series = mapAll(r?.series, mapSeriesPoint);
  const top = mapAll(r?.topListings, mapAnalyticsListing);
  const fun = asRecord(r?.funnel);
  const countries = mapAll(r?.byCountry, raw => {
    const c = asRecord(raw);
    const country = asString(c?.country);
    return country
      ? {
          country,
          orders: nat(c?.orders) ?? 0,
          revenueDsi: nat(c?.revenueDsi) ?? 0,
        }
      : null;
  });
  const granularity =
    per?.granularity === 'day' || per?.granularity === 'month'
      ? per.granularity
      : null;
  if (
    !r ||
    !periodInfo ||
    !granularity ||
    !netRevenueDsi ||
    !uniqueVisitors ||
    !pageViews ||
    !successRate ||
    !series ||
    !top ||
    !fun ||
    !countries
  ) {
    return invalid(env);
  }
  return {
    kind: 'success',
    analytics: {
      period: {...periodInfo, granularity},
      kpis: {netRevenueDsi, uniqueVisitors, pageViews, successRate},
      series,
      funnel: {
        storeViews: nat(fun.storeViews) ?? 0,
        listingViews: nat(fun.listingViews) ?? 0,
        ordersCreated: nat(fun.ordersCreated) ?? 0,
        ordersPaid: nat(fun.ordersPaid) ?? 0,
      },
      topListings: top,
      byCountry: countries,
    },
  };
}

function mapReview(raw: unknown): SellerReview | null {
  const r = asRecord(raw);
  const id = asString(r?.id);
  const rating = asInt(r?.rating);
  if (!r || !id || rating === null || rating < 1 || rating > 5) {
    return null;
  }
  return {
    id,
    listingId: asString(r.listingId),
    listingTitle: asString(r.listingTitle),
    rating,
    comment: asString(r.comment),
    authorDisplayName: asString(r.authorDisplayName),
    createdAt: asEpochMs(r.createdAt),
  };
}

export function mapSellerReviews(
  env: EnvelopeResult,
): SellerResult<{page: SellerReviewsPage}> {
  const fail = checkEnvelope(env, 'marketplace');
  if (fail) {
    return fail;
  }
  const r = asRecord(env.data);
  const sum = asRecord(r?.summary);
  const dist = asRecord(sum?.distribution);
  const items = mapAll(r?.items, mapReview);
  const ratingCount = nat(sum?.ratingCount);
  if (!r || !sum || ratingCount === null || !items) {
    return invalid(env);
  }
  return {
    kind: 'success',
    page: {
      summary: {
        rating: asNumber(sum.rating),
        ratingCount,
        distribution: {
          '1': nat(dist?.['1']) ?? 0,
          '2': nat(dist?.['2']) ?? 0,
          '3': nat(dist?.['3']) ?? 0,
          '4': nat(dist?.['4']) ?? 0,
          '5': nat(dist?.['5']) ?? 0,
        },
      },
      items,
      nextCursor: cursor(r.nextCursor),
    },
  };
}

// ─── Écritures ───────────────────────────────────────────────────────────

/**
 * Écritures sans donnée utile : succès 2xx. Sert aussi à `POST /track` :
 * `recorded: false` (cible inconnue, visite du vendeur) n'est pas une erreur.
 */
export function mapSellerWrite(env: EnvelopeResult): SellerWriteResult {
  const fail = checkEnvelope(env, 'marketplace');
  return fail ?? {kind: 'success'};
}
