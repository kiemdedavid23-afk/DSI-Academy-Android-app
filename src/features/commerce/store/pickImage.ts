/**
 * Choix d'une photo (galerie ou appareil photo) pour la candidature vendeur.
 * Seule porte d'entrée de `react-native-image-picker` côté commerce (T6).
 * La photo est réduite et recompressée à la prise (1600 px, qualité 0,8),
 * comme sur le site, pour rester sous 8 Mo. Aucune permission déclarée : la
 * galerie passe par le sélecteur système, l'appareil photo par l'application
 * Appareil photo du téléphone.
 */

import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {APPLICATION_FILE_MAX_BYTES} from './sellerTypes';

export type PickSource = 'camera' | 'gallery';

export type PickedImage = {
  uri: string;
  name: string;
  type: string;
  size: number | null;
};

export type PickErrorReason =
  | 'notImage'
  | 'unreadable'
  | 'tooLarge'
  | 'unavailable';

export type PickResult =
  | {kind: 'picked'; image: PickedImage}
  | {kind: 'cancelled'}
  | {kind: 'error'; reason: PickErrorReason};

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIDE = 1600;
const QUALITY = 0.8;

/** Clé i18n du message pour une erreur de choix de photo. */
export function pickErrorKey(reason: PickErrorReason): string {
  switch (reason) {
    case 'notImage':
      return 'mp.apply.errors.notImage';
    case 'tooLarge':
      return 'mp.apply.errors.tooLarge';
    case 'unavailable':
      return 'mp.apply.errors.prepareFailed';
    default:
      return 'mp.apply.errors.unreadable';
  }
}

export async function pickImage(
  source: PickSource,
  opts: {frontCamera?: boolean} = {},
): Promise<PickResult> {
  try {
    const options = {
      mediaType: 'photo' as const,
      maxWidth: MAX_SIDE,
      maxHeight: MAX_SIDE,
      quality: QUALITY,
      selectionLimit: 1,
      includeBase64: false,
      saveToPhotos: false,
      cameraType: opts.frontCamera ? ('front' as const) : ('back' as const),
    };
    const res =
      source === 'camera'
        ? await launchCamera(options)
        : await launchImageLibrary(options);
    if (res.didCancel) {
      return {kind: 'cancelled'};
    }
    if (res.errorCode) {
      return {kind: 'error', reason: 'unavailable'};
    }
    const asset = res.assets?.[0];
    if (!asset || !asset.uri) {
      return {kind: 'error', reason: 'unreadable'};
    }
    const type = asset.type ?? '';
    if (!ACCEPTED.includes(type)) {
      return {kind: 'error', reason: 'notImage'};
    }
    const size = typeof asset.fileSize === 'number' ? asset.fileSize : null;
    if (size !== null && size > APPLICATION_FILE_MAX_BYTES) {
      return {kind: 'error', reason: 'tooLarge'};
    }
    if (size === 0) {
      return {kind: 'error', reason: 'unreadable'};
    }
    return {
      kind: 'picked',
      image: {uri: asset.uri, name: asset.fileName ?? 'photo.jpg', type, size},
    };
  } catch {
    return {kind: 'error', reason: 'unavailable'};
  }
}
