import {
  asDateIso,
  mapContent,
} from '../src/core/api/endpoints/content/common.mapper';
import {
  mapCatalogue,
  mapCategoryTree,
} from '../src/core/api/endpoints/content/catalogue.mapper';
import {
  mapNavigation,
  mapParts,
} from '../src/core/api/endpoints/content/parts.mapper';
import {mapDelivery} from '../src/core/api/endpoints/content/delivery.mapper';

const summary = (id: number) => ({
  id,
  uid: 'u' + id,
  type: 'training',
  slug: 's' + id,
  title: 'T' + id,
  description: null,
  language: 'fr',
  level: null,
  thumbnail_url: null,
  duration_seconds: 600,
});

describe('dates et pagination (secondes Unix)', () => {
  it('asDateIso : entier → ISO, texte conservé, reste null', () => {
    expect(asDateIso(1793527200)).toBe('2026-11-01T10:00:00.000Z');
    expect(asDateIso('2026-11-01T10:00:00Z')).toBe('2026-11-01T10:00:00Z');
    expect(asDateIso(null)).toBeNull();
    expect(asDateIso(0)).toBeNull();
  });
  it('mapContent : created_at entier lu, nouveaux champs', () => {
    const c = mapContent({
      id: 1, type: 'book', slug: 'a', title: 'A',
      created_at: 1793527200, updated_at: 1793527200,
      like_count: 7, parts_count: 3, is_part: false,
    });
    expect(c).toMatchObject({
      createdAt: '2026-11-01T10:00:00.000Z',
      likeCount: 7, partsCount: 3, isPart: false,
    });
    expect(mapContent({id: 1, type: 'book', slug: 'a', title: 'A'})).toMatchObject({
      likeCount: 0, partsCount: 0, isPart: null, createdAt: null,
    });
  });
  it('curseur numérique conservé : la page suivante est possible', () => {
    const r = mapCatalogue(200, {
      items: [],
      next_cursor: {cursor_created_at: 1793527200, cursor_id: 10},
    });
    expect(r).toMatchObject({
      kind: 'success',
      nextCursor: {createdAt: 1793527200, id: 10},
    });
  });
});

describe('arbre des catégories', () => {
  it('mappe les compteurs et les enfants', () => {
    const r = mapCategoryTree(200, {
      items: [{
        id: 3, name: 'Dev', slug: 'dev', parent_id: null, depth: 1,
        content_count: 4, total_count: 11,
        children: [{id: 8, name: 'Python', slug: 'python', parent_id: 3, depth: 2,
          content_count: 7, total_count: 7, children: []}],
      }],
      max_depth: 8,
    });
    expect(r).toMatchObject({kind: 'success', maxDepth: 8});
    if (r.kind === 'success') {
      expect(r.items[0]).toMatchObject({contentCount: 4, totalCount: 11});
      expect(r.items[0].children[0]).toMatchObject({id: 8, parentId: 3, totalCount: 7});
    }
  });
  it('arbre vide : succès ; route absente : notFound NOT_FOUND', () => {
    expect(mapCategoryTree(200, {items: [], max_depth: 8})).toMatchObject({kind: 'success', items: []});
    expect(mapCategoryTree(404, {error: 'NOT_FOUND'})).toMatchObject({
      kind: 'failure', errorKind: 'notFound', code: 'NOT_FOUND',
    });
  });
});

describe('parties', () => {
  it('mappe une œuvre et ses parties directes', () => {
    const r = mapParts(200, {
      work: summary(12), is_work: true, total_parts: 1,
      total_duration_seconds: 5400, duration_complete: true, unknown_duration_parts: 0,
      items: [{index: 1, link_id: 77, kind: 'module', position: 0, depth: 1,
        content: summary(13), parts_count: 3, duration_seconds: 3600, duration_complete: true}],
    });
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.overview).toMatchObject({isWork: true, totalParts: 1, totalDurationSeconds: 5400});
      expect(r.overview.items[0]).toMatchObject({linkId: 77, kind: 'module', partsCount: 3, children: []});
    }
  });
  it('arbre récursif', () => {
    const r = mapParts(200, {
      work: summary(12), is_work: true, total_parts: 1,
      items: [{index: 1, link_id: 1, kind: 'module', position: 0, depth: 1, content: summary(13),
        children: [{index: 1, link_id: 2, kind: 'lesson', position: 0, depth: 2, content: summary(14), children: []}]}],
    });
    if (r.kind === 'success') {
      expect(r.overview.items[0].children[0]).toMatchObject({linkId: 2, kind: 'lesson'});
    } else {
      throw new Error('attendu : succès');
    }
  });
  it('contenu non composé : is_work false, pas d\'erreur', () => {
    const r = mapParts(200, {work: summary(5), is_work: false, total_parts: 0, items: []});
    expect(r).toMatchObject({kind: 'success', overview: {isWork: false, items: []}});
  });
  it('404 CONTENT_NOT_FOUND conservé', () => {
    expect(mapParts(404, {error: 'CONTENT_NOT_FOUND'})).toMatchObject({errorKind: 'notFound', code: 'CONTENT_NOT_FOUND'});
  });
});

describe('navigation', () => {
  it('place, chemin et voisins', () => {
    const r = mapNavigation(200, {
      content: summary(14), work: summary(12), parent: summary(13),
      path: [{id: 12, uid: 'u12', type: 'training', slug: 's12', title: 'T12'}],
      kind: 'lesson', position: 1, depth: 2, scope: 'parent', index: 2, total: 5,
      previous: {link_id: 1, kind: 'lesson', position: 0, content: summary(11), parts_count: 0},
      next: null,
    });
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.navigation).toMatchObject({index: 2, total: 5, scope: 'parent', next: null});
      expect(r.navigation.previous?.content.id).toBe(11);
      expect(r.navigation.path).toHaveLength(1);
    }
  });
  it('NOT_A_PART et INVALID_NAVIGATION_SCOPE : codes conservés', () => {
    expect(mapNavigation(404, {error: 'NOT_A_PART — x'})).toMatchObject({errorKind: 'notFound', code: 'NOT_A_PART'});
    expect(mapNavigation(422, {error: 'INVALID_NAVIGATION_SCOPE'})).toMatchObject({errorKind: 'validation', code: 'INVALID_NAVIGATION_SCOPE'});
  });
});

describe('livraison v1.2', () => {
  const ok = {
    status: 'OK', type: 'link', content_id: 12, content_type: 'book', asset_id: 34,
    provider_id: 'google_drive', format: 'pdf',
    delivery: {status: 'OK', url: 'https://drive.google.com/uc?id=x', mime_type: 'application/pdf', size_bytes: '2048000'},
  };
  it('size_bytes texte lu, suggested_filename absent → null', () => {
    const r = mapDelivery(200, ok);
    expect(r).toMatchObject({kind: 'success', link: {sizeBytes: 2048000, suggestedFilename: null}});
  });
  it('suggested_filename lu avec intent=download', () => {
    const r = mapDelivery(200, {...ok, suggested_filename: 'a.pdf'});
    expect(r).toMatchObject({kind: 'success', link: {suggestedFilename: 'a.pdf'}});
  });
  it('NO_DOWNLOADABLE_ASSET : notFound, code conservé', () => {
    expect(mapDelivery(404, {error: 'NO_DOWNLOADABLE_ASSET'})).toMatchObject({errorKind: 'notFound', code: 'NO_DOWNLOADABLE_ASSET'});
  });
});
