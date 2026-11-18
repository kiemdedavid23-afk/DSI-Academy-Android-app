import {
  asBool,
  asInt,
  asNumber,
  asRecord,
  asString,
  checkResponse,
  failure,
  isContentType,
  mapThumbnail,
} from './common.mapper';
import type {
  ContentSummary,
  NavigationNeighbor,
  NavigationResult,
  NavigationScope,
  PartItem,
  PartNavigation,
  PartsOverview,
  PartsResult,
  PathEntry,
} from './parts.types';

/** Profondeur maximale lue (le Worker plafonne à 16). */
const MAX_DEPTH = 16;

export function mapContentSummary(raw: unknown): ContentSummary | null {
  const r = asRecord(raw);
  const id = asInt(r?.id);
  const slug = asString(r?.slug);
  const title = asString(r?.title);
  if (!r || id === null || slug === null || title === null || !isContentType(r.type)) {
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
    level: asString(r.level),
    thumbnailUrl: mapThumbnail(r.thumbnail_url),
    durationSeconds: asNumber(r.duration_seconds),
  };
}

function mapPartItem(raw: unknown, level: number): PartItem | null {
  const r = asRecord(raw);
  const linkId = asInt(r?.link_id);
  const content = mapContentSummary(r?.content);
  if (!r || linkId === null || content === null) {
    return null;
  }
  const children: PartItem[] = [];
  if (Array.isArray(r.children) && level < MAX_DEPTH) {
    r.children.forEach(child => {
      const item = mapPartItem(child, level + 1);
      if (item) {
        children.push(item);
      }
    });
  }
  return {
    index: asInt(r.index) ?? 0,
    linkId,
    kind: asString(r.kind) ?? 'part',
    position: asInt(r.position) ?? 0,
    depth: asInt(r.depth) ?? level,
    content,
    partsCount: asNumber(r.parts_count) ?? 0,
    durationSeconds: asNumber(r.duration_seconds),
    durationComplete: r.duration_complete === undefined ? true : asBool(r.duration_complete),
    children,
  };
}

function mapOverview(body: unknown): PartsOverview | null {
  const r = asRecord(body);
  const work = mapContentSummary(r?.work);
  if (!r || work === null) {
    return null;
  }
  const items: PartItem[] = [];
  if (Array.isArray(r.items)) {
    r.items.forEach(entry => {
      const item = mapPartItem(entry, 1);
      if (item) {
        items.push(item);
      }
    });
  }
  return {
    work,
    isWork: asBool(r.is_work),
    totalParts: asNumber(r.total_parts) ?? items.length,
    totalDurationSeconds: asNumber(r.total_duration_seconds),
    durationComplete: r.duration_complete === undefined ? true : asBool(r.duration_complete),
    unknownDurationParts: asNumber(r.unknown_duration_parts) ?? 0,
    items,
  };
}

/**
 * GET /content/:id/parts et /parts/tree. Un contenu qui n'est pas une œuvre
 * répond 200 avec is_work=false et items=[] (pas une erreur).
 */
export function mapParts(
  status: number,
  body: unknown,
  bodyKind?: string,
): PartsResult {
  const bad = checkResponse(status, body, bodyKind);
  if (bad) {
    return bad;
  }
  const overview = mapOverview(body);
  if (overview === null) {
    return failure('invalidResponse', status, 'INVALID_PARTS');
  }
  return {kind: 'success', overview};
}

function mapNeighbor(raw: unknown): NavigationNeighbor | null {
  const r = asRecord(raw);
  const linkId = asInt(r?.link_id);
  const content = mapContentSummary(r?.content);
  if (!r || linkId === null || content === null) {
    return null;
  }
  return {
    linkId,
    kind: asString(r.kind) ?? 'part',
    position: asInt(r.position) ?? 0,
    content,
    partsCount: asNumber(r.parts_count) ?? 0,
  };
}

function mapPathEntry(raw: unknown): PathEntry | null {
  const r = asRecord(raw);
  const id = asInt(r?.id);
  const slug = asString(r?.slug);
  const title = asString(r?.title);
  if (!r || id === null || slug === null || title === null || !isContentType(r.type)) {
    return null;
  }
  return {id, uid: asString(r.uid), type: r.type, slug, title};
}

/**
 * GET /content/:id/navigation?scope=parent|work. Erreurs : 404 NOT_A_PART (le
 * contenu n'est pas une partie), 422 INVALID_NAVIGATION_SCOPE : codes conservés.
 */
export function mapNavigation(
  status: number,
  body: unknown,
  bodyKind?: string,
): NavigationResult {
  const bad = checkResponse(status, body, bodyKind);
  if (bad) {
    return bad;
  }
  const r = asRecord(body);
  const content = mapContentSummary(r?.content);
  if (!r || content === null) {
    return failure('invalidResponse', status, 'INVALID_NAVIGATION');
  }
  const path: PathEntry[] = [];
  if (Array.isArray(r.path)) {
    r.path.forEach(entry => {
      const p = mapPathEntry(entry);
      if (p) {
        path.push(p);
      }
    });
  }
  const scope: NavigationScope = r.scope === 'work' ? 'work' : 'parent';
  const navigation: PartNavigation = {
    content,
    work: mapContentSummary(r.work),
    parent: mapContentSummary(r.parent),
    path,
    kind: asString(r.kind) ?? 'part',
    position: asInt(r.position) ?? 0,
    depth: asInt(r.depth) ?? 1,
    scope,
    index: asInt(r.index) ?? 0,
    total: asInt(r.total) ?? 0,
    previous: mapNeighbor(r.previous),
    next: mapNeighbor(r.next),
  };
  return {kind: 'success', navigation};
}
