/**
 * File d'attente des bannières in-app (une seule visible).
 * API : show / dismiss. Priorité à la plus récente du même type.
 * Le store garde des CLÉS i18n (titleKey / messageKey) : la traduction se fait
 * au rendu (un store ne traduit pas). Un message déjà lisible (ex. message du
 * Worker) passe par messageText, affiché tel quel ; notify() est le raccourci.
 */

export type BannerTone = 'warning' | 'success' | 'info' | 'error';

export type BannerPayload = {
  id: string;
  type: string;
  tone: BannerTone;
  /** Clé i18n du titre. */
  titleKey?: string;
  /** Clé i18n du message. */
  messageKey?: string;
  /** Titre déjà lisible (prioritaire sur titleKey). */
  titleText?: string;
  /** Message déjà lisible, ex. message du Worker (prioritaire sur messageKey). */
  messageText?: string;
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
      titleText: payload.titleText,
      messageText: payload.messageText,
      dismissible: payload.dismissible,
      autoHideMs: payload.autoHideMs,
    };
    emit();
  },

  /**
   * Raccourci pour un message lisible (Worker, résultat d'action).
   * Titre = « Erreur », « Succès »… selon le ton. Toujours fermable ;
   * disparaît seul après autoHideMs (8 s erreur/alerte, 5 s sinon).
   */
  notify(input: {
    tone: BannerTone;
    message: string;
    type?: string;
    autoHideMs?: number;
  }): void {
    const slow = input.tone === 'error' || input.tone === 'warning';
    bannerStore.show({
      type: input.type ?? `notice-${input.tone}`,
      tone: input.tone,
      titleKey: `app.notice.${input.tone}`,
      messageText: input.message,
      dismissible: true,
      autoHideMs: input.autoHideMs ?? (slow ? 8000 : 5000),
    });
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
