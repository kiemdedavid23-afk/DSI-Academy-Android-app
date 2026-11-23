/**
 * Choix de la photo de profil communautaire dans la galerie.
 * Le Worker Communauté ne redimensionne pas (rapport §12.2) : la photo est
 * réduite à 512 px de côté au plus et recompressée ici, avant l'envoi.
 * Aucune permission déclarée : la galerie passe par le sélecteur système.
 */

import {
  launchImageLibrary,
  type PhotoQuality,
} from 'react-native-image-picker';
import type {AvatarFile} from '@core/api/endpoints/community/profile.types';

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_MAX_SIDE = 512;
const AVATAR_QUALITY: PhotoQuality = 0.85;

export type PickAvatarResult =
  | {kind: 'picked'; file: AvatarFile}
  | {kind: 'cancelled'}
  /** `code` : code d'erreur photo du Worker, pour réutiliser les mêmes libellés. */
  | {kind: 'error'; code: string};

export async function pickAvatar(): Promise<PickAvatarResult> {
  try {
    const res = await launchImageLibrary({
      mediaType: 'photo',
      maxWidth: AVATAR_MAX_SIDE,
      maxHeight: AVATAR_MAX_SIDE,
      quality: AVATAR_QUALITY,
      selectionLimit: 1,
      includeBase64: false,
    });
    if (res.didCancel) {
      return {kind: 'cancelled'};
    }
    if (res.errorCode) {
      return {kind: 'error', code: 'AVATAR_UNREADABLE'};
    }
    const asset = res.assets?.[0];
    if (!asset || !asset.uri) {
      return {kind: 'error', code: 'AVATAR_UNREADABLE'};
    }
    const type = asset.type ?? '';
    if (!AVATAR_TYPES.includes(type)) {
      return {kind: 'error', code: 'AVATAR_UNSUPPORTED_TYPE'};
    }
    const size = typeof asset.fileSize === 'number' ? asset.fileSize : null;
    if (size === 0) {
      return {kind: 'error', code: 'AVATAR_FILE_REQUIRED'};
    }
    if (size !== null && size > AVATAR_MAX_BYTES) {
      return {kind: 'error', code: 'AVATAR_TOO_LARGE'};
    }
    return {
      kind: 'picked',
      file: {uri: asset.uri, name: asset.fileName ?? 'photo.jpg', type},
    };
  } catch {
    return {kind: 'error', code: 'AVATAR_UNREADABLE'};
  }
}
