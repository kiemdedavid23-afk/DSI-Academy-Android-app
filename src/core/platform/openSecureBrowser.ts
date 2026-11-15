/**
 * Ouvre une URL https dans le navigateur externe (R-WEB-3).
 * Refuse toute URL non https.
 */

import {Linking} from 'react-native';

export function isHttpsUrl(url: string): boolean {
  try {
    return /^https:\/\//i.test(url.trim());
  } catch {
    return false;
  }
}

/**
 * @returns true si l'ouverture a été demandée, false si URL invalide ou échec.
 */
export async function openSecureBrowser(url: string): Promise<boolean> {
  const u = (url ?? '').trim();
  if (!isHttpsUrl(u)) {
    return false;
  }
  try {
    const supported = await Linking.canOpenURL(u);
    if (!supported) {
      return false;
    }
    await Linking.openURL(u);
    return true;
  } catch {
    return false;
  }
}
