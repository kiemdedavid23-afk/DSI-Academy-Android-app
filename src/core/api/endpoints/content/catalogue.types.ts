import type {Content, ContentFailure, ContentType} from './common.types';

/** Curseur de pagination : les DEUX valeurs sont obligatoires (API.md). */
export type CatalogueCursor = {createdAt: string; id: number};

export type Category = {
  id: number;
  name: string;
  slug: string;
  count: number;
};

export type CatalogueParams = {
  type: ContentType;
  categoryId?: number;
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
