// Contrôles d'adresses. Les adresses http(s) littérales sont réservées à
// core/config et core/network (R-NET-1) : ce fichier est le seul endroit hors
// registre qui reconnaît le schéma d'une adresse reçue du Worker.

/** True si la valeur est une adresse https sans espace (aucun autre schéma). */
export function isHttpsUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https:\/\/[^\s/][^\s]*$/i.test(value);
}
