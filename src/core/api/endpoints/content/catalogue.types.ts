import type {Content, ContentFailure, ContentType} from './common.types';

/** Curseur de pagination : les DEUX valeurs sont obligatoires (API.md). */
export type CatalogueCursor = {createdAt: number; id: number};

export type Category = {
  id: number;
  name: string;
  slug: string;
  count: number;
  /** Image de couverture de la catégorie (https), null si absente. */
  thumbnailUrl: string | null;
};

export type CatalogueParams = {
  type: ContentType;
  categoryId?: number;
  /** true : la catégorie seule, sans ses sous-catégories. */
  exactCategory?: boolean;
  language?: string;
  limit?: number;
  cursor?: CatalogueCursor | null;
};

export type CatalogueResult =
  | {
      kind: 'success';
      items: Content[];
      nextCursor: CatalogueCursor | null;
      /** Éléments reçus mais écartés (non publiés ou modérés). */
      hiddenCount: number;
    }
  | ContentFailure;

export type ContentDetailResult =
  | {kind: 'success'; item: Content}
  | ContentFailure;

export type SearchParams = {
  query: string;
  type?: ContentType;
  language?: string;
  categoryId?: number;
  exactCategory?: boolean;
  limit?: number;
  offset?: number;
};

export type SearchResult =
  | {
      kind: 'success';
      query: string;
      items: Content[];
      limit: number;
      offset: number;
    }
  | ContentFailure;

export type CategoriesResult =
  | {kind: 'success'; items: Category[]}
  | ContentFailure;

/** Nœud de l'arbre des catégories (GET /content/categories/tree). */
export type CategoryNode = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  /** Image de couverture de la catégorie (https), null si absente. */
  thumbnailUrl: string | null;
  /** 1 pour une catégorie principale. */
  depth: number;
  /** Contenus publiés directement dans la catégorie. */
  contentCount: number;
  /** content_count + ceux de tous les descendants actifs. */
  totalCount: number;
  children: CategoryNode[];
};

export type CategoryTreeResult =
  | {kind: 'success'; items: CategoryNode[]; maxDepth: number}
  | ContentFailure;
