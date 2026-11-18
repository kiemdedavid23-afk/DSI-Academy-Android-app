/**
 * Clé d'idempotence d'achat (décision P3).
 * Une clé par intention d'achat. Réutilisée uniquement pour reprendre la
 * même intention (incident réseau, 502 Marketplace, 202 Boutique).
 * Nouvelle intention, ou nouvel essai après un échec = nouvelle clé.
 * Longueur exigée par la Marketplace : 8 à 128 caractères.
 */

export const IDEMPOTENCY_MIN = 8;
export const IDEMPOTENCY_MAX = 128;

type CryptoLike = {randomUUID?: () => string};

function randomHex(length: number): string {
  let out = '';
  while (out.length < length) {
    out += Math.floor(Math.random() * 0x100000000)
      .toString(16)
      .padStart(8, '0');
  }
  return out.slice(0, length);
}

export function createCheckoutKey(): string {
  const c = (globalThis as {crypto?: CryptoLike}).crypto;
  if (c && typeof c.randomUUID === 'function') {
    return `chk_${c.randomUUID().replace(/-/g, '')}`;
  }
  return `chk_${Date.now().toString(36)}${randomHex(20)}`;
}

export function isValidCheckoutKey(key: unknown): key is string {
  return (
    typeof key === 'string' &&
    key.length >= IDEMPOTENCY_MIN &&
    key.length <= IDEMPOTENCY_MAX &&
    /^[A-Za-z0-9_-]+$/.test(key)
  );
}
