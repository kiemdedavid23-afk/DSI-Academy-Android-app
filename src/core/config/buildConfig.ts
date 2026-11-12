/**
 * Configuration injectée au build.
 * Ne pas placer de secrets dans l'application mobile.
 */
export const buildConfig = {
  appName: 'DSI Academy',
  environment: 'development',
} as const;
