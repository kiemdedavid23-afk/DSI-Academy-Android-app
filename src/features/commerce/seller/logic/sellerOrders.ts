/**
 * Ventes vendeur (lot S6) : règles sans écran. Export : le client réseau ne
 * lit que du JSON, l'export est donc construit dans l'app à partir de
 * `GET /seller/orders` (mêmes colonnes que la route d'export du Worker,
 * montants en DSI, UTF-8 avec BOM).
 */

import type {SellerOrderItem, SellerPeriod} from '../../store/sellerTypes';

export const ORDER_PERIODS: SellerPeriod[] = ['7d', '30d', '12m', 'all'];
export const ORDER_FILTERS = ['all', 'paid', 'processing'] as const;
export type OrderFilter = (typeof ORDER_FILTERS)[number];

/** Plafond de lignes exportées (100 par page, 50 pages). */
export const EXPORT_MAX_PAGES = 50;

export const CSV_COLUMNS = [
  'orderId',
  'createdAt',
  'listingTitle',
  'buyerDisplayName',
  'buyerCountry',
  'priceDsi',
  'commissionDsi',
  'feesDsi',
  'netSellerDsi',
  'status',
] as const;

/** Une cellule : guillemets doublés ; préfixe `'` contre l'injection de formule. */
export function csvCell(value: string | number | null): string {
  if (value === null) {
    return '';
  }
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text) && typeof value === 'string') {
    text = `'${text}`;
  }
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function ordersToCsv(items: SellerOrderItem[]): string {
  const lines = [CSV_COLUMNS.join(',')];
  for (const o of items) {
    lines.push(
      [
        o.id,
        o.createdAt === null ? null : new Date(o.createdAt).toISOString(),
        o.listingTitle,
        o.buyerDisplayName,
        o.buyerCountry,
        o.priceDsi,
        o.commissionDsi,
        o.feesDsi,
        o.netSellerDsi,
        o.status,
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return `\uFEFF${lines.join('\n')}\n`;
}

/** Échec du store ventes → clé i18n. Jamais le texte du Worker (D17). */
export function ordersErrorKey(error: string | null): string {
  switch (error) {
    case 'network':
      return 'app.catalogue.errorNetwork';
    case 'noProof':
    case 'unauthorized':
      return 'mp.states.errorSession';
    case 'forbidden':
      return 'commerce.sellerSpace.overview.forbidden';
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
