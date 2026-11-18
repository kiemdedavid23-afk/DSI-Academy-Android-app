import {isHttpsUrl} from '../../../config/urlGuards';
import {CONTENT_TYPES} from './common.types';
import type {Content, ContentFailure, ContentType} from './common.types';

export function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

export function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

export function asInt(v: unknown): number | null {
  return typeof v === 'number' && Number.isInteger(v) ? v : null;
}

/** Nombre fini, ou chaîne numérique (le Worker renvoie parfois size_bytes en texte). */
export function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Date du Worker : entier en secondes Unix (v1.2). Une chaîne de date
 * (anciens contrats) est conservée. Renvoie une date ISO ou null.
 */
export function asDateIso(v: unknown): string | null {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
    return new Date(v * 1000).toISOString();
  }
  return typeof v === 'string' && v !== '' ? v : null;
}

export function asBool(v: unknown): boolean {
  return v === true || v === 1;
}

export function isContentType(v: unknown): v is ContentType {
  return (
    typeof v === 'string' && (CONTENT_TYPES as readonly string[]).includes(v)
  );
}

const ERROR_SEPARATOR = ' — ';

/**
 * Le Worker répond { "error": "CODE — message" } (API.md, format d'erreur).
 * Le code stable est la partie avant « — ». Aucun message n'est conservé.
 */
export function parseWorkerErrorCode(body: unknown): string | null {
  const raw = asString(asRecord(body)?.error);
  if (!raw) {
    return null;
  }
  const code = raw.split(ERROR_SEPARATOR)[0].trim();
  return /^[A-Z0-9_]+$/.test(code) ? code : null;
}

export function failure(
  errorKind: ContentFailure['errorKind'],
  status: number | null,
  code: string | null = null,
): ContentFailure {
  return {kind: 'failure', errorKind, status, code};
}

/** Échec HTTP (statuts du contrat : 401, 403, 404, 409, 422, 500, 502). */
export function mapHttpFailure(status: number, body: unknown): ContentFailure {
  const code = parseWorkerErrorCode(body);
  if (status === 401) {
    return failure('unauthorized', status, code);
  }
  if (status === 403) {
    return failure('forbidden', status, code);
  }
  if (status === 404) {
    return failure('notFound', status, code);
  }
  if (status === 409 || status === 422 || status === 400) {
    return failure('validation', status, code);
  }
  if (status === 429 || status === 503) {
    return failure('unavailable', status, code);
  }
  if (status === 502) {
    return failure('providerLink', status, code);
  }
  return failure('server', status, code);
}

/**
 * Contrôle commun d'une réponse : null si le corps JSON est exploitable avec
 * un statut 2xx, sinon l'échec à renvoyer.
 */
export function checkResponse(
  status: number,
  body: unknown,
  bodyKind?: string,
): ContentFailure | null {
  if (status < 200 || status >= 300) {
    return mapHttpFailure(status, body);
  }
  if (bodyKind === 'invalid' || bodyKind === 'empty' || body === null) {
    return failure('invalidResponse', status, 'INVALID_BODY');
  }
  return null;
}

/** Vignette : https uniquement, sinon null (le placeholder est côté écran). */
export function mapThumbnail(v: unknown): string | null {
  return isHttpsUrl(v) ? v : null;
}

/** Contenu (API.md, objet « Contenu »). Renvoie null si un champ vital manque. */
export function mapContent(raw: unknown): Content | null {
  const r = asRecord(raw);
  if (!r) {
    return null;
  }
  const id = asInt(r.id);
  const slug = asString(r.slug);
  const title = asString(r.title);
  if (
    id === null ||
    slug === null ||
    title === null ||
    !isContentType(r.type)
  ) {
    return null;
  }
  return {
    id,
    uid: asString(r.uid),
    type: r.type,
    slug,
    title,
    description: asString(r.description),
    language: asString(r.language) ?? 'fr',
    categoryId: asInt(r.category_id),
    editorialStatus: asString(r.editorial_status) ?? 'draft',
    moderationStatus: asString(r.moderation_status) ?? 'active',
    metadata: asRecord(r.metadata) ?? {},
    level: asString(r.level),
    durationSeconds: asNumber(r.duration_seconds),
    viewCount: asNumber(r.view_count) ?? 0,
    likeCount: asNumber(r.like_count) ?? 0,
    partsCount: asNumber(r.parts_count) ?? 0,
    isPart: typeof r.is_part === 'boolean' ? r.is_part : null,
    thumbnailUrl: mapThumbnail(r.thumbnail_url),
    createdAt: asDateIso(r.created_at),
    updatedAt: asDateIso(r.updated_at),
  };
}

/**
 * NOTES-ET-ECARTS n°2 : les GET publics ne filtrent pas le statut (brouillons,
 * archivés, modérés lisibles). L'app ne montre que published + active.
 */
export function isPubliclyVisible(content: Content): boolean {
  return (
    content.editorialStatus === 'published' &&
    content.moderationStatus === 'active'
  );
}
