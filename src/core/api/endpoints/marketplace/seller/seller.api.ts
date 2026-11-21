import {http, safeEnvelope} from '@core/network';
import {sessionStore} from '@core/session';
import {failure} from '../../commerce/commerce.mapper';
import {
  mapApplicationFileUpload,
  mapApplicationSubmit,
  mapSellerAnalytics,
  mapSellerApplication,
  mapSellerCategories,
  mapSellerEarnings,
  mapSellerListingDetail,
  mapSellerListings,
  mapSellerListingStatus,
  mapSellerLogoUpload,
  mapSellerOrderDetail,
  mapSellerOrders,
  mapSellerOverview,
  mapSellerProfile,
  mapSellerProfileUpdate,
  mapSellerReviews,
  mapSellerWrite,
} from './seller.mapper';
import {
  SELLER_PERIODS,
  type SellerApplicationInput,
  type SellerFailure,
  type SellerListingInput,
  type SellerListingsQuery,
  type SellerOrdersQuery,
  type SellerPeriod,
  type SellerProfilePatch,
  type SellerWriteResult,
  type TrackKind,
} from './seller.types';

/**
 * Worker Marketplace, espace vendeur (lot S1).
 * Toutes les routes `/seller/*` exigent X-Access-Proof. Seule `POST /track` est
 * publique. Jamais de route /internal/. Identité déduite de la preuve : aucun
 * identifiant de membre n'est envoyé.
 * Hors lot : export CSV (`GET /seller/orders/export`), car le client réseau ne
 * lit que du JSON ; il vient au lot S6 avec la décision T7.
 */

export const SELLER_LIMIT_DEFAULT = 20;
export const SELLER_LIMIT_MAX = 100;
const VISITOR_KEY =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const mp = () => http.service('marketplace');
const base = '/api/marketplace/seller';

function noProof(): SellerFailure | null {
  return sessionStore.getAccessProof() ? null : failure('noProof', null);
}

function missingId(id: string): SellerFailure | null {
  return id ? null : failure('validation', null, 'MISSING_ID');
}

function validPeriod(p: SellerPeriod | undefined): boolean {
  return p === undefined || SELLER_PERIODS.includes(p);
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) {
    return SELLER_LIMIT_DEFAULT;
  }
  return Math.min(SELLER_LIMIT_MAX, Math.max(1, Math.floor(limit)));
}

const proof = {auth: 'accessProof'} as const;

// ─── Candidature (lecture) ───────────────────────────────────────────────

/** Source du statut vendeur : relue à chaque ouverture de l'espace vendeur. */
export async function fetchSellerApplication() {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapSellerApplication(
    await safeEnvelope(mp().get(`${base}/application`, proof)),
  );
}

// ─── Aperçu, profil ──────────────────────────────────────────────────────

/** 503 `CONFIG` si le solde du Paiement est indisponible : pas de données partielles. */
export async function fetchSellerOverview(period: SellerPeriod = '30d') {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  if (!validPeriod(period)) {
    return failure('validation', null, 'INVALID_PERIOD');
  }
  return mapSellerOverview(
    await safeEnvelope(
      mp().get(`${base}/overview`, {...proof, query: {period}}),
    ),
  );
}

/**
 * Envoi d'un fichier de candidature (logo, recto, verso, selfie). `form` porte
 * les champs `file` et `kind` ; 8 Mo maximum, stockage privé côté Worker.
 */
export async function uploadApplicationFile(form: FormData) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapApplicationFileUpload(
    await safeEnvelope(mp().postForm(`${base}/application/files`, form, proof)),
  );
}

/**
 * Dépôt ou redépôt (même route que `/application/resubmit`, contrat identique).
 * Tous les champs sont obligatoires ; limites 80 / 120 / 2000 caractères.
 */
export async function submitSellerApplication(input: SellerApplicationInput) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  const ids = [
    input.logoFileId,
    input.idDocumentFrontFileId,
    input.idDocumentBackFileId,
    input.idSelfieFileId,
  ];
  if (
    input.storeName.trim() === '' ||
    input.slogan.trim() === '' ||
    input.description.trim() === '' ||
    ids.some(id => !id)
  ) {
    return failure('validation', null, 'INVALID_APPLICATION');
  }
  return mapApplicationSubmit(
    await safeEnvelope(mp().post(`${base}/application`, input, proof)),
  );
}

export async function fetchSellerProfile() {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapSellerProfile(await safeEnvelope(mp().get(`${base}/profile`, proof)));
}

/** Seuls les champs fournis sont envoyés ; absent = inchangé. */
export async function updateSellerProfile(patch: SellerProfilePatch) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  const body: Record<string, string> = {};
  if (patch.storeName !== undefined) {
    if (patch.storeName.trim() === '') {
      return failure('validation', null, 'EMPTY_STORE_NAME');
    }
    body.storeName = patch.storeName;
  }
  if (patch.slogan !== undefined) {
    body.slogan = patch.slogan;
  }
  if (patch.bio !== undefined) {
    body.bio = patch.bio;
  }
  if (Object.keys(body).length === 0) {
    return failure('validation', null, 'EMPTY_PATCH');
  }
  return mapSellerProfileUpdate(
    await safeEnvelope(mp().patch(`${base}/profile`, body, proof)),
  );
}

/** `form` : un FormData avec le champ `file` (png, jpeg ou webp, 8 Mo max). */
export async function uploadSellerLogo(form: FormData) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapSellerLogoUpload(
    await safeEnvelope(mp().postForm(`${base}/profile/logo`, form, proof)),
  );
}

export async function fetchSellerCategories() {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapSellerCategories(
    await safeEnvelope(mp().get(`${base}/categories`, proof)),
  );
}

// ─── Produits ────────────────────────────────────────────────────────────

export async function fetchSellerListings(query: SellerListingsQuery = {}) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapSellerListings(
    await safeEnvelope(
      mp().get(`${base}/listings`, {
        ...proof,
        query: {
          status: query.status && query.status !== 'all' ? query.status : undefined,
          q: query.q ? query.q : undefined,
          limit: clampLimit(query.limit),
          cursor: query.cursor ? query.cursor : undefined,
        },
      }),
    ),
  );
}

export async function fetchSellerListing(id: string) {
  const missing = noProof() ?? missingId(id);
  if (missing) {
    return missing;
  }
  return mapSellerListingDetail(
    await safeEnvelope(
      mp().get(`${base}/listings/${encodeURIComponent(id)}`, proof),
    ),
  );
}

/** Création : `status` = `draft` ou `pending_review` (défaut), jamais `published`. */
export async function createSellerListing(input: SellerListingInput) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  if (!input.title || !input.description || !input.category || !input.deliveryUrl) {
    return failure('validation', null, 'MISSING_FIELD');
  }
  if (input.priceDsi === undefined || !Number.isInteger(input.priceDsi) || input.priceDsi < 0) {
    return failure('validation', null, 'INVALID_PRICE');
  }
  return mapSellerListingDetail(
    await safeEnvelope(mp().post(`${base}/listings`, {...input}, proof)),
  );
}

/** Seuls les champs fournis sont envoyés. Prix 0 accepté. `status` n'est pas modifiable ici (voir submit et unpublish). */
export async function updateSellerListing(id: string, input: SellerListingInput) {
  const missing = noProof() ?? missingId(id);
  if (missing) {
    return missing;
  }
  const body: Record<string, unknown> = {};
  if (input.title !== undefined) {
    body.title = input.title;
  }
  if (input.description !== undefined) {
    body.description = input.description;
  }
  if (input.category !== undefined) {
    body.category = input.category;
  }
  if (input.priceDsi !== undefined) {
    body.priceDsi = input.priceDsi;
  }
  if (input.visibility !== undefined) {
    body.visibility = input.visibility;
  }
  if (input.deliveryUrl !== undefined) {
    body.deliveryUrl = input.deliveryUrl;
  }
  if (input.imageFileId !== undefined) {
    body.coverFileId = input.imageFileId;
  }
  if (Object.keys(body).length === 0) {
    return failure('validation', null, 'EMPTY_PATCH');
  }
  return mapSellerListingDetail(
    await safeEnvelope(
      mp().patch(`${base}/listings/${encodeURIComponent(id)}`, body, proof),
    ),
  );
}

async function listingAction(id: string, action: 'submit' | 'unpublish') {
  const missing = noProof() ?? missingId(id);
  if (missing) {
    return missing;
  }
  return mapSellerListingStatus(
    await safeEnvelope(
      mp().post(`${base}/listings/${encodeURIComponent(id)}/${action}`, {}, proof),
    ),
  );
}

/** Brouillon ou refusé → en modération. 409 si l'état ne le permet pas. */
export const submitSellerListing = (id: string) => listingAction(id, 'submit');
/** Publié → brouillon. */
export const unpublishSellerListing = (id: string) => listingAction(id, 'unpublish');

/** Copie en brouillon, titre « … (copie) ». */
export async function duplicateSellerListing(id: string) {
  const missing = noProof() ?? missingId(id);
  if (missing) {
    return missing;
  }
  return mapSellerListingDetail(
    await safeEnvelope(
      mp().post(`${base}/listings/${encodeURIComponent(id)}/duplicate`, {}, proof),
    ),
  );
}

/** Archivage logique : commandes, avis et gains restent intacts. */
export async function archiveSellerListing(id: string) {
  const missing = noProof() ?? missingId(id);
  if (missing) {
    return missing;
  }
  return mapSellerListingStatus(
    await safeEnvelope(
      mp().delete(`${base}/listings/${encodeURIComponent(id)}`, proof),
    ),
  );
}

// ─── Ventes, gains ───────────────────────────────────────────────────────

export async function fetchSellerOrders(query: SellerOrdersQuery = {}) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  if (!validPeriod(query.period)) {
    return failure('validation', null, 'INVALID_PERIOD');
  }
  return mapSellerOrders(
    await safeEnvelope(
      mp().get(`${base}/orders`, {
        ...proof,
        query: {
          period: query.period ?? 'all',
          status: query.status && query.status !== 'all' ? query.status : undefined,
          limit: clampLimit(query.limit),
          cursor: query.cursor ? query.cursor : undefined,
        },
      }),
    ),
  );
}

export async function fetchSellerOrder(id: string) {
  const missing = noProof() ?? missingId(id);
  if (missing) {
    return missing;
  }
  return mapSellerOrderDetail(
    await safeEnvelope(mp().get(`${base}/orders/${encodeURIComponent(id)}`, proof)),
  );
}

/** 503 `CONFIG` si le solde du Paiement est indisponible. */
export async function fetchSellerEarnings(
  query: {limit?: number; cursor?: string | null} = {},
) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapSellerEarnings(
    await safeEnvelope(
      mp().get(`${base}/earnings`, {
        ...proof,
        query: {
          limit: clampLimit(query.limit),
          cursor: query.cursor ? query.cursor : undefined,
        },
      }),
    ),
  );
}

// ─── Analyses, avis ──────────────────────────────────────────────────────

export async function fetchSellerAnalytics(period: SellerPeriod = '30d') {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  if (!validPeriod(period)) {
    return failure('validation', null, 'INVALID_PERIOD');
  }
  return mapSellerAnalytics(
    await safeEnvelope(
      mp().get(`${base}/analytics`, {...proof, query: {period}}),
    ),
  );
}

export async function fetchSellerReviews(
  query: {limit?: number; cursor?: string | null} = {},
) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapSellerReviews(
    await safeEnvelope(
      mp().get(`${base}/reviews`, {
        ...proof,
        query: {
          limit: clampLimit(query.limit),
          cursor: query.cursor ? query.cursor : undefined,
        },
      }),
    ),
  );
}

// ─── Suivi des visites ───────────────────────────────────────────────────

/**
 * `POST /track` : route publique, sans preuve. Appel « tire et oublie » : ne
 * lève jamais, ne bloque aucun écran. `visitorKey` : UUID v4 conservé
 * localement (lot S2). Une clé invalide n'envoie rien.
 */
export async function trackVisit(
  kind: TrackKind,
  targetId: string,
  visitorKey: string,
): Promise<SellerWriteResult> {
  if (!targetId) {
    return failure('validation', null, 'MISSING_ID');
  }
  if (!VISITOR_KEY.test(visitorKey)) {
    return failure('validation', null, 'INVALID_VISITOR_KEY');
  }
  try {
    return mapSellerWrite(
      await safeEnvelope(
        mp().post(
          '/api/marketplace/track',
          {kind, targetId, visitorKey},
          {auth: 'none'},
        ),
      ),
    );
  } catch {
    return failure('network', null, 'NETWORK_ERROR');
  }
}
