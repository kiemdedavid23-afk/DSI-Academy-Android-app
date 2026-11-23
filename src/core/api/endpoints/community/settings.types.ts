/**
 * Réglages (rapport §11.9). Six clés booléennes. Le Worker les enregistre mais
 * ne les applique jamais : l'app ne les présente pas comme des garanties.
 */

export const PRIVACY_KEYS = ['showLastSeen', 'allowDirectMessages', 'allowCalls'] as const;
export const PREFS_KEYS = ['notifyMessages', 'notifyCalls', 'notifySpaces'] as const;

export type PrivacyKey = (typeof PRIVACY_KEYS)[number];
export type PrefsKey = (typeof PREFS_KEYS)[number];

export type CommunitySettings = {
  privacy: Record<PrivacyKey, boolean>;
  prefs: Record<PrefsKey, boolean>;
};
