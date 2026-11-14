// SEUL fichier de l'app qui décide quelle adresse est appelée.
// Migration VPS = changer le secret de configuration (mode 'gateway') puis recompiler.
import { BUILD_CONFIG } from './buildConfig.generated';

export type ServiceId =
  | 'payment'
  | 'content'
  | 'shop'
  | 'marketplace'
  | 'community'
  | 'admin';

const SERVICE_IDS: ServiceId[] = [
  'payment',
  'content',
  'shop',
  'marketplace',
  'community',
  'admin',
];

type PerServiceConfig = {
  mode: 'perService';
  urls: Record<ServiceId, string>;
  web: string;
};

type GatewayConfig = {
  mode: 'gateway';
  baseUrl: string;
  prefixes: Record<ServiceId, string>;
  web: string;
};

export type RegistryConfig = PerServiceConfig | GatewayConfig;

const config = BUILD_CONFIG.registry as RegistryConfig;

const trimEndSlash = (value: string): string => value.replace(/\/+$/, '');
const withLeadingSlash = (value: string): string =>
  value.startsWith('/') ? value : `/${value}`;

function assertHttps(label: string, value: unknown): void {
  if (typeof value !== 'string' || !/^https:\/\/[^\s]+$/.test(value)) {
    throw new Error(`[serviceRegistry] adresse invalide pour "${label}"`);
  }
}

export function assertRegistry(): void {
  assertHttps('web', config.web);
  if (config.mode === 'gateway') {
    assertHttps('baseUrl', config.baseUrl);
    SERVICE_IDS.forEach((id) => {
      if (!config.prefixes[id]) {
        throw new Error(`[serviceRegistry] préfixe manquant pour "${id}"`);
      }
    });
  } else {
    SERVICE_IDS.forEach((id) => assertHttps(id, config.urls[id]));
  }
}

export function resolveServiceUrl(service: ServiceId, path: string): string {
  const cleanPath = withLeadingSlash(path);
  if (config.mode === 'gateway') {
    const prefix = trimEndSlash(withLeadingSlash(config.prefixes[service]));
    return `${trimEndSlash(config.baseUrl)}${prefix}${cleanPath}`;
  }
  return `${trimEndSlash(config.urls[service])}${cleanPath}`;
}

export function resolveRealtimeUrl(service: ServiceId, path: string): string {
  return resolveServiceUrl(service, path).replace(/^https:/, 'wss:');
}

export function resolveWebUrl(path: string): string {
  return `${trimEndSlash(config.web)}${withLeadingSlash(path)}`;
}

/**
 * Hôte d'une adresse https, ou null. Analyse volontairement manuelle : la classe
 * URL de React Native/Hermes n'implémente pas tous ses accesseurs.
 * Refusés : autre schéma, identifiants (user@), port autre que 443, espaces, anti-slash.
 */
function parseHttpsHost(url: unknown): string | null {
  if (typeof url !== 'string') {
    return null;
  }
  const match = /^https:\/\/([^/?#]*)/i.exec(url.trim());
  if (!match) {
    return null;
  }
  const authority = match[1];
  if (!/^[a-z0-9.-]+(:443)?$/i.test(authority)) {
    return null;
  }
  const host = authority.replace(/:443$/, '').replace(/\.$/, '').toLowerCase();
  return host.length > 0 ? host : null;
}

/**
 * True si l'URL appartient strictement à l'hôte du site (https uniquement).
 * Comparaison d'hôte stricte, pas de « contient ». R-WEB-2 / R-WEB-4.
 */
export function isSiteUrl(url: string): boolean {
  const candidate = parseHttpsHost(url);
  const site = parseHttpsHost(config.web);
  return candidate !== null && site !== null && candidate === site;
}

/**
 * Origines autorisées pour la WebView d'inscription (schéma + hôte du site).
 * Aucun littéral http(s) hors de ce module.
 */
export function getSiteOriginWhitelist(): string[] {
  const site = parseHttpsHost(config.web);
  return site ? [`https://${site}`] : [];
}
