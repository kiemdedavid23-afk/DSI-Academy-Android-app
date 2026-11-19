/**
 * Géométrie des deux éventails de couvertures du bandeau d'une maison.
 * Éventail du haut : attaché en bas, il s'ouvre vers le haut. Éventail du
 * bas : attaché en haut, il s'ouvre vers le bas. Les deux se chevauchent à
 * leur jonction, celui du haut posé par-dessus. Aucun rendu ici : que du calcul.
 */

export type FanKind = 'book' | 'audio' | 'video' | 'course';

export type FanSpec = {
  /** Largeur et hauteur d'une couverture (dp), dans le format de la maison. */
  w: number;
  h: number;
  /** Ouverture totale de l'éventail (degrés). */
  span: number;
  /** Chevauchement des deux points d'attache (dp). */
  overlap: number;
};

export const FAN_SPECS: Record<FanKind, FanSpec> = {
  book: {w: 76, h: 114, span: 80, overlap: 34},
  audio: {w: 92, h: 92, span: 70, overlap: 28},
  video: {w: 128, h: 72, span: 56, overlap: 22},
  course: {w: 128, h: 72, span: 56, overlap: 22},
};

/** Angles (degrés) répartis de -span/2 à +span/2 ; un seul élément : 0. */
export function fanAngles(count: number, span: number): number[] {
  if (count <= 0) {
    return [];
  }
  if (count === 1) {
    return [0];
  }
  return Array.from({length: count}, (_, i) => -span / 2 + (span * i) / (count - 1));
}

/** Moitié haute (la plus grande si impair) et moitié basse de la liste. */
export function splitCovers<T>(items: T[]): {top: T[]; bottom: T[]} {
  const mid = Math.ceil(items.length / 2);
  return {top: items.slice(0, mid), bottom: items.slice(mid)};
}

/** Hauteur du bandeau d'éventails : deux couvertures moins le chevauchement. */
export function fanHeight(kind: FanKind): number {
  const s = FAN_SPECS[kind];
  return 2 * s.h - s.overlap;
}

/**
 * Ordre de dessin : les couvertures les plus inclinées d'abord (dessous), la
 * centrale en dernier (dessus), pour un éventail symétrique.
 */
export function stackOrder(angles: number[]): number[] {
  return angles
    .map((angle, index) => ({index, abs: Math.abs(angle)}))
    .sort((a, b) => b.abs - a.abs || a.index - b.index)
    .map(x => x.index);
}

export type FanPlacement = {
  /** Indice de la couverture dans sa moitié. */
  index: number;
  angle: number;
  /** Bord haut du cadre non tourné de la couverture (dp, depuis le haut du bandeau). */
  top: number;
  origin: string;
  /** Rang de dessin : plus grand = dessus. */
  z: number;
};

/**
 * Placement des deux éventails. Les couvertures du haut ont leur point
 * d'attache en bas du cadre ; celles du bas, en haut du cadre. Le point
 * d'attache du bas est remonté de `overlap` : les deux éventails s'imbriquent.
 */
export function placeFans(
  kind: FanKind,
  topCount: number,
  bottomCount: number,
): {top: FanPlacement[]; bottom: FanPlacement[]} {
  const s = FAN_SPECS[kind];
  const pivotTop = s.h;
  const pivotBottom = s.h - s.overlap;

  const build = (count: number, top: number, origin: string, zBase: number): FanPlacement[] => {
    const angles = fanAngles(count, s.span);
    const order = stackOrder(angles);
    return angles.map((angle, index) => ({
      index,
      angle,
      top,
      origin,
      z: zBase + order.indexOf(index),
    }));
  };

  return {
    // L'éventail du bas est dessiné d'abord ; celui du haut passe par-dessus.
    bottom: build(bottomCount, pivotBottom, '50% 0%', 0),
    top: build(topCount, pivotTop - s.h, '50% 100%', 100),
  };
}

/* ───────── Accueil Academy : éventails mélangeant les quatre maisons ───────── */

/** Taille d'une couverture dans la composition mixte (chaque maison garde son format). */
export const MIX_SPECS: Record<FanKind, {w: number; h: number}> = {
  book: {w: 64, h: 96},
  audio: {w: 80, h: 80},
  video: {w: 112, h: 63},
  course: {w: 112, h: 63},
};

/** Hauteur de référence (la plus haute couverture), ouverture et chevauchement de la composition mixte. */
export const MIX_REF = {h: 96, span: 70, overlap: 28};

/** Hauteur du bandeau de l'accueil : deux hauteurs de référence moins le chevauchement. */
export function mixedHeight(): number {
  return 2 * MIX_REF.h - MIX_REF.overlap;
}

/**
 * Mélange des listes (une par maison) en alternant : 1re de chacune, puis 2e de
 * chacune, etc. Liste stable (même entrée, même sortie), `total` éléments au plus.
 */
export function mixCovers<T>(lists: T[][], total: number): T[] {
  const out: T[] = [];
  const longest = Math.max(0, ...lists.map(l => l.length));
  for (let i = 0; i < longest && out.length < total; i++) {
    for (const list of lists) {
      if (i < list.length && out.length < total) {
        out.push(list[i]);
      }
    }
  }
  return out;
}

export type MixedPlacement = FanPlacement & {kind: FanKind};

/**
 * Même géométrie que `placeFans`, mais chaque couverture a son propre format :
 * les points d'attache restent communs (en bas du cadre pour l'éventail du haut,
 * en haut du cadre pour celui du bas), seule la position du cadre change.
 */
export function placeMixedFans(
  topKinds: FanKind[],
  bottomKinds: FanKind[],
): {top: MixedPlacement[]; bottom: MixedPlacement[]} {
  const build = (
    kinds: FanKind[],
    topOf: (kind: FanKind) => number,
    origin: string,
    zBase: number,
  ): MixedPlacement[] => {
    const angles = fanAngles(kinds.length, MIX_REF.span);
    const order = stackOrder(angles);
    return angles.map((angle, index) => ({
      index,
      angle,
      kind: kinds[index],
      top: topOf(kinds[index]),
      origin,
      z: zBase + order.indexOf(index),
    }));
  };
  return {
    bottom: build(bottomKinds, () => MIX_REF.h - MIX_REF.overlap, '50% 0%', 0),
    top: build(topKinds, k => MIX_REF.h - MIX_SPECS[k].h, '50% 100%', 100),
  };
}
