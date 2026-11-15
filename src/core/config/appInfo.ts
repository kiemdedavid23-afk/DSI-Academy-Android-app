/**
 * Identité application — source unique pour releases/check.
 * applicationId figé (contrat Notifications §6.7).
 * APP_VERSION = package.json version (test vs versionName Android).
 */

export const APPLICATION_ID = 'app.dsiacademy' as const;

/** Aligné sur package.json "version". */
export const APP_VERSION = '0.1.0';
