/**
 * Libellés d'affichage des valeurs brutes envoyées par le serveur
 * (statuts, formules) et dates courtes. Pur : reçoit `t`, n'importe rien.
 */

type Translate = (key: string) => string;

/** « acces_initial » → « Acces initial » (dernier recours si aucune traduction). */
function humanize(value: string): string {
  const spaced = value.replace(/[_-]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
}

/** i18next renvoie la clé elle-même quand la traduction manque : on bascule alors sur `fallback`. */
function translateOr(t: Translate, key: string, fallback: string): string {
  const out = t(key);
  return out === key ? fallback : out;
}

/** Statut brut (active, pending, paid…) → texte traduit. */
export function statusLabel(t: Translate, value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  return translateOr(t, `common.status.${normalize(value)}`, humanize(value));
}

/** Formule brute (acces_initial…) → texte traduit. */
export function planLabel(t: Translate, value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  return translateOr(t, `subscription.plans.${normalize(value)}`, humanize(value));
}

/** Date ISO → date courte selon la langue ; « — » si absente ou invalide. */
export function formatShortDate(
  iso: string | null | undefined,
  lang: 'fr' | 'en',
): string {
  if (!iso) {
    return '—';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '—';
  }
  return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR');
}
