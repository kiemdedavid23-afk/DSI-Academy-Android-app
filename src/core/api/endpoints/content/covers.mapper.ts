import {
  asInt,
  asRecord,
  asString,
  checkResponse,
  failure,
  mapThumbnail,
} from './common.mapper';
import type {Content} from './common.types';
import type {CoverItem, CoversResult} from './covers.types';

function mapCover(raw: unknown): CoverItem | null {
  const r = asRecord(raw);
  const id = asInt(r?.id);
  const slug = asString(r?.slug);
  const title = asString(r?.title);
  // Petite variante facultative, sinon la miniature ; sans image https : écartée.
  const imageUrl = mapThumbnail(r?.cover_small_url) ?? mapThumbnail(r?.thumbnail_url);
  if (!r || id === null || slug === null || title === null || imageUrl === null) {
    return null;
  }
  return {id, slug, title, imageUrl};
}

/**
 * GET /content/covers?type=&limit= → { type, items: [...], count }.
 * Aucun contenu avec couverture : succès avec une liste vide.
 */
export function mapCovers(
  status: number,
  body: unknown,
  bodyKind?: string,
): CoversResult {
  const bad = checkResponse(status, body, bodyKind);
  if (bad) {
    return bad;
  }
  const r = asRecord(body);
  if (!r || !Array.isArray(r.items)) {
    return failure('invalidResponse', status, 'MISSING_ITEMS');
  }
  const items: CoverItem[] = [];
  const seen = new Set<number>();
  r.items.forEach(entry => {
    const cover = mapCover(entry);
    if (cover && !seen.has(cover.id)) {
      seen.add(cover.id);
      items.push(cover);
    }
  });
  return {kind: 'success', items};
}

/**
 * Repli (Worker sans /content/covers) : couvertures tirées d'une page du
 * catalogue. Les parties (is_part) et les contenus sans image sont écartés.
 */
export function coversFromContents(contents: Content[], limit: number): CoverItem[] {
  const out: CoverItem[] = [];
  for (const c of contents) {
    if (out.length >= limit) {
      break;
    }
    if (c.thumbnailUrl && c.isPart !== true) {
      out.push({id: c.id, slug: c.slug, title: c.title, imageUrl: c.thumbnailUrl});
    }
  }
  return out;
}
