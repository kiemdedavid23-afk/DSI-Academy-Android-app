// src/core/config/serviceRegistry.ts
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
  urls: Record<ServiceId, string>; // une adresse par Worker (situation actuelle)
  web: string; // site web (navigateur d'inscription)
};

type GatewayConfig = {
  mode: 'gateway';
  baseUrl: string; // un seul hôte (VPS)
  prefixes: Record<ServiceId, string>; // ex. { payment: '/payment', ... }
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

// Échec franc au démarrage plutôt qu'une erreur réseau obscure plus tard.
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
    return `${trimEndSlash(config.baseUrl)}${withLeadingSlash(
      config.prefixes[service],
    )}${cleanPath}`;
  }
  return `${trimEndSlash(config.urls[service])}${cleanPath}`;
}

// Temps réel (WebSocket) : même décision, schéma https -> wss.
export function resolveRealtimeUrl(service: ServiceId, path: string): string {
  return resolveServiceUrl(service, path).replace(/^https:/, 'wss:');
}

// Site web (navigateur d'inscription), jamais un Worker.
export function resolveWebUrl(path: string): string {
  return `${trimEndSlash(config.web)}${withLeadingSlash(path)}`;
}