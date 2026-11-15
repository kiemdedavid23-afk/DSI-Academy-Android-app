import type {Content, ContentFailure, ContentType} from './common.types';

export type ComponentChild = {
  uid: string | null;
  title: string;
  type: ContentType;
  slug: string;
};

/** Composant (lien parent → enfant), tel que listé par /components. */
export type ContentComponent = {
  id: number;
  parentContentId: number;
  childContentId: number;
  componentType: string;
  position: number;
  status: string;
  metadata: Record<string, unknown>;
  createdAt: string | null;
  child: ComponentChild | null;
};

export type TreeLink = {
  id: number;
  componentType: string;
  position: number;
};

export type ContentTreeNode = {
  content: Content;
  children: Array<{component: TreeLink; node: ContentTreeNode}>;
};

export type ComponentsResult =
  | {kind: 'success'; items: ContentComponent[]}
  | ContentFailure;

export type TreeResult =
  | {kind: 'success'; tree: ContentTreeNode}
  | ContentFailure;
