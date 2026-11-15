/**
 * File d'attente des bannières in-app (une seule visible).
 * API : show / dismiss. Priorité à la plus récente du même type.
 * Le store garde des CLÉS i18n (titleKey / messageKey) : la traduction se fait
 * au rendu (un store ne traduit pas).
 */

export type BannerTone = 'warning' | 'success' | 'info' | 'error';

export type BannerPayload = {
  id: string;
  type: string;
  tone: BannerTone;
  /** Clé i18n du titre. */
  titleKey: string;
  /** Clé i18n du message. */
  messageKey: string;
  dismissible: boolean;
  /** ms ; undefined = jusqu'à dismiss manuel */
  autoHideMs?: number;
};

type Listener = () => void;

let current: BannerPayload | null = null;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach(l => l());
}

export const bannerStore = {
  get(): BannerPayload | null {
    return current;
  },

  show(payload: Omit<BannerPayload, 'id'> & {id?: string}): void {
    current = {
      id: payload.id ?? `${payload.type}-${Date.now()}`,
      type: payload.type,
      tone: payload.tone,
      titleKey: payload.titleKey,
      messageKey: payload.messageKey,
      dismissible: payload.dismissible,
      autoHideMs: payload.autoHideMs,
    };
    emit();
  },

  dismiss(id?: string): void {
    if (!current) {
      return;
    }
    if (id && current.id !== id) {
      return;
    }
    current = null;
    emit();
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
