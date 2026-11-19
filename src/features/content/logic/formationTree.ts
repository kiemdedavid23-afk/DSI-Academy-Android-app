/**
 * Programme d'une formation : arbre de composants (GET /components/tree) aplati
 * en sections et modules. Chaque module est un contenu à part entière : l'app
 * demande la livraison avec l'id du MODULE, jamais celui de la formation.
 */

import type {ContentTreeNode, PartItem} from '@core/utils/contentDisplay';

export type ModuleType = 'book' | 'audio' | 'video';

export type ProgramItem =
  | {kind: 'section'; key: string; title: string; depth: number}
  | {
      kind: 'module';
      key: string;
      contentId: number;
      title: string;
      type: ModuleType;
      depth: number;
      durationSeconds: number | null;
    };

export type ProgramModule = Extract<ProgramItem, {kind: 'module'}>;

/** Seuil au-delà duquel un module compte comme terminé (même seuil que les lecteurs). */
export const DONE_PERCENT = 97;
const MAX_DEPTH = 10;

export function flattenProgram(root: ContentTreeNode): ProgramItem[] {
  const out: ProgramItem[] = [];
  const seen = new Set<number>([root.content.id]);

  function walk(node: ContentTreeNode, depth: number) {
    if (depth > MAX_DEPTH) {
      return;
    }
    const children = [...node.children].sort(
      (a, b) => a.component.position - b.component.position,
    );
    for (const {component, node: child} of children) {
      const c = child.content;
      if (seen.has(c.id)) {
        continue;
      }
      seen.add(c.id);
      if (c.type === 'training') {
        out.push({kind: 'section', key: `s${component.id}`, title: c.title, depth});
        walk(child, depth + 1);
      } else {
        out.push({
          kind: 'module',
          key: `m${component.id}`,
          contentId: c.id,
          title: c.title,
          type: c.type,
          depth,
          durationSeconds: c.durationSeconds,
        });
      }
    }
  }

  walk(root, 0);
  return out;
}

/**
 * Programme depuis les PARTIES de l'œuvre (GET /content/:id/parts/tree, Worker
 * v1.2). Une partie de type « training » ou qui a des sous-parties est une
 * section ; les autres sont des modules (livre, audio, vidéo).
 */
export function flattenParts(parts: PartItem[]): ProgramItem[] {
  const out: ProgramItem[] = [];
  const seen = new Set<number>();

  function walk(list: PartItem[], depth: number) {
    if (depth > MAX_DEPTH) {
      return;
    }
    const sorted = [...list].sort(
      (a, b) => a.position - b.position || a.index - b.index,
    );
    for (const part of sorted) {
      const c = part.content;
      if (seen.has(c.id)) {
        continue;
      }
      seen.add(c.id);
      if (c.type === 'training' || part.children.length > 0) {
        out.push({kind: 'section', key: `s${part.linkId}`, title: c.title, depth});
        walk(part.children, depth + 1);
      } else {
        out.push({
          kind: 'module',
          key: `m${part.linkId}`,
          contentId: c.id,
          title: c.title,
          type: c.type,
          depth,
          durationSeconds: c.durationSeconds,
        });
      }
    }
  }

  walk(parts, 0);
  return out;
}

/** Nombre de lignes montrées avant « Voir tout » dans la fiche. */
export const PARTS_PREVIEW = 6;

/**
 * Lignes de la section « Parties » de la fiche : tout si déplié, sinon les
 * premières ; un titre de section ne reste jamais seul en dernière ligne.
 */
export function previewItems(items: ProgramItem[], expanded: boolean, limit = PARTS_PREVIEW): ProgramItem[] {
  if (expanded || items.length <= limit) {
    return items;
  }
  const head = items.slice(0, limit);
  return head[head.length - 1]?.kind === 'section' ? head.slice(0, -1) : head;
}

export function modulesOf(items: ProgramItem[]): ProgramModule[] {
  return items.filter((i): i is ProgramModule => i.kind === 'module');
}

export type FormationSummary = {
  total: number;
  done: number;
  percent: number;
  /** Premier module non terminé, sinon null (formation terminée ou vide). */
  nextModuleId: number | null;
  started: boolean;
};

export function summarize(
  items: ProgramItem[],
  progress: Record<number, number>,
): FormationSummary {
  const modules = modulesOf(items);
  const done = modules.filter(m => (progress[m.contentId] ?? 0) >= DONE_PERCENT).length;
  const next = modules.find(m => (progress[m.contentId] ?? 0) < DONE_PERCENT);
  return {
    total: modules.length,
    done,
    percent: modules.length === 0 ? 0 : Math.round((done / modules.length) * 100),
    nextModuleId: next ? next.contentId : null,
    started: modules.some(m => (progress[m.contentId] ?? 0) > 0),
  };
}

/** Module précédent et suivant dans l'ordre du programme (sections ignorées). Rien si le module n'est pas dans la formation ouverte. */
export function neighbors(
  items: ProgramItem[],
  contentId: number,
): {prev: ProgramModule | null; next: ProgramModule | null} {
  const modules = modulesOf(items);
  const i = modules.findIndex(m => m.contentId === contentId);
  if (i < 0) {
    return {prev: null, next: null};
  }
  return {prev: modules[i - 1] ?? null, next: modules[i + 1] ?? null};
}
