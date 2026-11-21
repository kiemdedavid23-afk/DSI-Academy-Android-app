/**
 * Produits vendeur (lot S5) : règles sans écran. Le Worker compte en DSI
 * entiers ; le vendeur saisit et lit des FCFA (D20). FCFA = floor(DSI × 2 / 5),
 * donc DSI = ceil(FCFA × 5 / 2) : l'aller-retour est exact.
 */

import type {
  SellerListingDetail,
  SellerListingInput,
  SellerListingStatus,
} from '../../store/sellerTypes';

export const PRODUCT_FILTERS = ['all', 'published', 'draft'] as const;
export type ProductFilter = (typeof PRODUCT_FILTERS)[number];

export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 5000;

/** FCFA saisi → DSI du Worker (entier). */
export function fcfaToDsi(fcfa: number): number {
  if (!Number.isFinite(fcfa) || fcfa <= 0) {
    return 0;
  }
  return Math.ceil((Math.floor(fcfa) * 5) / 2);
}

/** Texte saisi → entier ≥ 0, ou null si invalide. Vide = 0 (produit gratuit). */
export function parsePriceFcfa(text: string): number | null {
  const clean = text.replace(/\s/g, '');
  if (clean === '') {
    return 0;
  }
  return /^\d{1,9}$/.test(clean) ? Number(clean) : null;
}

export type ProductDraft = {
  title: string;
  deliveryUrl: string;
  priceText: string;
  description: string;
  category: string;
  /** `pending_review` = « Publié » (envoyé en modération), `draft` = « Brouillon ». */
  launch: 'pending_review' | 'draft';
};

export const EMPTY_DRAFT: ProductDraft = {
  title: '',
  deliveryUrl: '',
  priceText: '',
  description: '',
  category: '',
  launch: 'pending_review',
};

export type ProductDraftError =
  | 'title'
  | 'deliveryUrl'
  | 'price'
  | 'description'
  | 'category';

function isHttps(url: string): boolean {
  return /^https:\/\/[^\s/$.?#][^\s]*$/i.test(url.trim());
}

/** Erreurs d'une étape (1 : titre, lien, prix ; 2 : description ; 3 : catégorie). */
export function draftErrors(d: ProductDraft, step: 1 | 2 | 3): ProductDraftError[] {
  const out: ProductDraftError[] = [];
  if (step === 1) {
    if (d.title.trim() === '' || d.title.length > TITLE_MAX) {
      out.push('title');
    }
    if (!isHttps(d.deliveryUrl)) {
      out.push('deliveryUrl');
    }
    if (parsePriceFcfa(d.priceText) === null) {
      out.push('price');
    }
  }
  if (step === 2 && (d.description.trim() === '' || d.description.length > DESCRIPTION_MAX)) {
    out.push('description');
  }
  if (step === 3 && d.category === '') {
    out.push('category');
  }
  return out;
}

/** Brouillon → corps du Worker. `forCreate` ajoute le statut de lancement. */
export function draftToInput(d: ProductDraft, forCreate: boolean): SellerListingInput {
  const price = parsePriceFcfa(d.priceText) ?? 0;
  const input: SellerListingInput = {
    title: d.title.trim(),
    description: d.description.trim(),
    category: d.category,
    priceDsi: fcfaToDsi(price),
    deliveryUrl: d.deliveryUrl.trim(),
  };
  if (forCreate) {
    input.status = d.launch;
  }
  return input;
}

/** Produit du Worker → brouillon de modification. */
export function detailToDraft(l: SellerListingDetail): ProductDraft {
  return {
    title: l.title,
    deliveryUrl: l.deliveryUrl ?? '',
    priceText: String(Math.floor((l.priceDsi * 2) / 5)),
    description: l.description ?? '',
    category: l.category ?? '',
    launch: 'draft',
  };
}

export type ProductAction = 'edit' | 'submit' | 'unpublish' | 'duplicate' | 'archive';

/** Actions permises selon le statut (le Worker garde le dernier mot : 409, 403). */
export function actionsFor(status: SellerListingStatus): ProductAction[] {
  switch (status) {
    case 'draft':
    case 'rejected':
      return ['edit', 'submit', 'duplicate', 'archive'];
    case 'published':
      return ['edit', 'unpublish', 'duplicate', 'archive'];
    case 'pending_review':
      return ['edit', 'duplicate', 'archive'];
    case 'suspended':
      return ['duplicate', 'archive'];
    default:
      return [];
  }
}

/** Échec d'un store produits → clé i18n. Jamais le texte du Worker (D17). */
export function productErrorKey(error: string | null): string {
  switch (error) {
    case 'network':
      return 'app.catalogue.errorNetwork';
    case 'noProof':
    case 'unauthorized':
      return 'mp.states.errorSession';
    case 'forbidden':
      return 'commerce.sellerSpace.products.errors.forbidden';
    case 'conflict':
      return 'commerce.sellerSpace.products.errors.conflict';
    case 'notFound':
      return 'commerce.sellerSpace.products.errors.notFound';
    case 'validation':
      return 'commerce.sellerSpace.products.errors.validation';
    case 'server':
    case 'upstream':
    case 'unavailable':
      return 'app.catalogue.errorServer';
    default:
      return 'app.catalogue.errorGeneric';
  }
}
