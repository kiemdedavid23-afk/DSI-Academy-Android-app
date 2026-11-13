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
