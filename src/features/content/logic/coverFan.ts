/**
 * Géométrie des deux éventails de couvertures, en demi-cercles.
 * Éventail du haut : demi-cercle ouvert vers le haut (arche). Éventail du bas :
 * demi-cercle ouvert vers le bas (cuvette). Les deux forment un anneau et se
 * chevauchent à leur jonction, celui du haut posé par-dessus. Chaque couverture
 * est tournée autour du centre de son demi-cercle, bout extérieur sur le cercle.
 * Aucun rendu ici : que du calcul.
 */

export type FanKind = 'book' | 'audio' | 'video' | 'course';

export type CardSize = {w: number; h: number};

/** Rayon extérieur des demi-cercles (dp) : bout extérieur de chaque couverture. */
export const FAN_RADIUS = 146;
/** Ouverture de chaque éventail : un demi-cercle. */
export const FAN_SPAN = 180;
/** Les deux centres sont rapprochés de ce nombre de dp : c'est le chevauchement. */
export const FAN_OVERLAP = 40;

/** Taille d'une couverture (dp), dans le format de la maison. */
export const FAN_SPECS: Record<FanKind, CardSize> = {
  book: {w: 80, h: 120},
  audio: {w: 100, h: 100},
  video: {w: 136, h: 77},
  course: {w: 136, h: 77},
};

/** Taille dans la composition mixte de l'accueil (un peu plus petite). */
export const MIX_SPECS: Record<FanKind, CardSize> = {
  book: {w: 72, h: 108},
  audio: {w: 90, h: 90},
  video: {w: 122, h: 69},
  course: {w: 122, h: 69},
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

/** Hauteur des deux éventails : deux rayons moins le chevauchement. */
export function fanHeight(_kind?: FanKind): number {
  return 2 * FAN_RADIUS - FAN_OVERLAP;
}

/** Hauteur de la composition de l'accueil (même cercle que les maisons). */
export function mixedHeight(): number {
  return fanHeight();
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
  /** Centre du demi-cercle, en dp depuis le coin haut-gauche du cadre de la couverture. */
  origin: string;
  /** Rang de dessin : plus grand = dessus. */
  z: number;
};

/**
 * Placement général : une taille par couverture. Centre du demi-cercle du haut
 * à y = rayon ; centre du bas remonté de `FAN_OVERLAP`. Le bout extérieur de
 * chaque couverture est sur le cercle, quel que soit son format.
 */
export function placeArcs(
  topSizes: CardSize[],
  bottomSizes: CardSize[],
): {top: FanPlacement[]; bottom: FanPlacement[]} {
  const centerTop = FAN_RADIUS;
  const centerBottom = FAN_RADIUS - FAN_OVERLAP;

  const build = (
    sizes: CardSize[],
    frameTop: (s: CardSize) => number,
    center: number,
    zBase: number,
  ): FanPlacement[] => {
    const angles = fanAngles(sizes.length, FAN_SPAN);
    const order = stackOrder(angles);
    return angles.map((angle, index) => {
      const s = sizes[index];
      const top = frameTop(s);
      return {
        index,
        angle,
        top,
        origin: `${s.w / 2}px ${center - top}px`,
        z: zBase + order.indexOf(index),
      };
    });
  };

  return {
    // Cuvette (bas) dessinée d'abord ; l'arche (haut) passe par-dessus.
    bottom: build(bottomSizes, s => centerBottom + FAN_RADIUS - s.h, centerBottom, 0),
    top: build(topSizes, () => centerTop - FAN_RADIUS, centerTop, 100),
  };
}

/** Éventails d'une maison : toutes les couvertures dans le format de la maison. */
export function placeFans(kind: FanKind, topCount: number, bottomCount: number) {
  const s = FAN_SPECS[kind];
  return placeArcs(Array(topCount).fill(s), Array(bottomCount).fill(s));
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

/** Accueil Academy : chaque couverture garde le format de sa maison. */
export function placeMixedFans(
  topKinds: FanKind[],
  bottomKinds: FanKind[],
): {top: MixedPlacement[]; bottom: MixedPlacement[]} {
  const p = placeArcs(
    topKinds.map(k => MIX_SPECS[k]),
    bottomKinds.map(k => MIX_SPECS[k]),
  );
  return {
    top: p.top.map(x => ({...x, kind: topKinds[x.index]})),
    bottom: p.bottom.map(x => ({...x, kind: bottomKinds[x.index]})),
  };
}
