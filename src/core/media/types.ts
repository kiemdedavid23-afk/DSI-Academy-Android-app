import type {ContentType} from '../api/endpoints/content/common.types';

/**
 * Stratégies de lecture. Le moteur ne lit pas lui-même les octets d'un
 * média : il garantit un lien exploitable et dit au lecteur comment lire.
 * Rien n'est enregistré durablement (streaming sans sauvegarde).
 */
export type PlaybackStrategy =
  /** Audio ou vidéo progressifs : le lecteur natif lit l'adresse directement (Range natif). */
  | {
      kind: 'nativeStream';
      url: string;
      format: string;
      mimeType: string | null;
      totalBytes: number | null;
      rangeSupported: boolean;
    }
  /** Vidéo YouTube : lecteur intégré, jamais de redirection. */
  | {kind: 'embeddedYoutube'; videoId: string}
  /** PDF, EPUB… : fichier temporaire, effacé à la fermeture (écrit au lot lecteur). */
  | {
      kind: 'tempFile';
      url: string;
      format: string;
      totalBytes: number | null;
      rangeSupported: boolean;
    }
  /** Texte brut : lu en mémoire, borné. */
  | {
      kind: 'boundedText';
      url: string;
      maxBytes: number;
      totalBytes: number | null;
    };

export type StrategyRefusal =
  | 'UNSUPPORTED_PROVIDER'
  | 'UNSUPPORTED_FORMAT'
  | 'FORMAT_MISMATCH'
  | 'TRAINING_HAS_NO_ASSET'
  | 'INVALID_YOUTUBE_LINK';

export type MediaErrorKind =
  | 'accessDenied'
  | 'subscriptionInactive'
  | 'notAvailable'
  | 'notFound'
  | 'noAsset'
  | 'sourceUnavailable'
  | 'sourceRejected'
  | 'sourceRateLimited'
  | 'sourceHtmlPage'
  | 'sourceServer'
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'tooLarge'
  | 'unsupportedFormat'
  | 'unsupportedProvider'
  | 'workerNotMigrated'
  | 'invalidRequest'
  | 'server';

export type MediaFailure = {
  kind: 'failure';
  errorKind: MediaErrorKind;
  /** Code stable du Worker ou de la source, jamais un texte à afficher. */
  code: string | null;
  /** Une nouvelle tentative a un sens (réseau, serveur, limite). */
  retryable: boolean;
};

export type MediaSource = {
  contentId: number;
  contentType: ContentType;
  providerId: string;
  format: string;
  strategy: PlaybackStrategy;
  openedAt: number;
};

export type OpenMediaResult =
  | {kind: 'success'; media: MediaSource}
  | MediaFailure;
