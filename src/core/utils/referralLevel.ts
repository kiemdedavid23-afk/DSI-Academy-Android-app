/**
 * Niveaux de parrainage (contrat §2.6) — filleuls directs ACTIFS.
 * Réutilisé L3c / carte membre.
 */

export type ReferralLevelId =
  | 'explorateur'
  | 'contributeur'
  | 'batisseur'
  | 'leader'
  | 'referent'
  | 'ambassadeur'
  | 'pilier_dsi';

type Band = {
  id: ReferralLevelId;
  min: number;
  max: number | null; // null = open-ended
};

const BANDS: readonly Band[] = [
  {id: 'explorateur', min: 0, max: 4},
  {id: 'contributeur', min: 5, max: 19},
  {id: 'batisseur', min: 20, max: 49},
  {id: 'leader', min: 50, max: 99},
  {id: 'referent', min: 100, max: 249},
  {id: 'ambassadeur', min: 250, max: 499},
  {id: 'pilier_dsi', min: 500, max: null},
];

export type ReferralLevelInfo = {
  level: ReferralLevelId;
  /** Seuil min du niveau suivant, ou null si max */
  nextThreshold: number | null;
  /** 0..1 progression dans la bande courante vers le suivant */
  progress: number;
  actifs: number;
};

export function referralLevel(actifsRaw: number): ReferralLevelInfo {
  const actifs = Number.isFinite(actifsRaw)
    ? Math.max(0, Math.floor(actifsRaw))
    : 0;
  let band = BANDS[0];
  for (const b of BANDS) {
    if (actifs >= b.min && (b.max === null || actifs <= b.max)) {
      band = b;
      break;
    }
  }
  if (band.max === null) {
    return {
      level: band.id,
      nextThreshold: null,
      progress: 1,
      actifs,
    };
  }
  const nextThreshold = band.max + 1;
  const span = band.max - band.min + 1;
  const progress = Math.min(1, Math.max(0, (actifs - band.min) / span));
  return {
    level: band.id,
    nextThreshold,
    progress,
    actifs,
  };
}
