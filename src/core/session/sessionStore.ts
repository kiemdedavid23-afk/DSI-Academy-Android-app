/**
 * Session membre : token, état, accessProof, expiresAt.
 * - « Se souvenir de moi » → Keychain ; sinon mémoire process uniquement.
 * - Connexion sans souvenir : purge d'abord le Keychain (évite reprise d'ancienne session).
 * - Au démarrage : relecture sécurisée ; session expirée → clearSession.
 * core n'importe jamais shared (R-LAY-1).
 */

import {useSyncExternalStore} from 'react';
import {configureHttpAuth} from '../network/authProviders';
import {secureGet, secureRemove, secureSet} from '../storage/secureStorage';

type SessionListener = () => void;

export type MemberSession = {
  token: string;
  accountStatus: string | null;
  subscriptionStatus: string | null;
  subscriptionActive: boolean;
  dateFin: string | null;
  accessProof: string | null;
  expiresAt: number;
  userId: string;
};

const SESSION_SECURE_KEY = 'member_session';

let memorySession: MemberSession | null = null;
let rememberFlag = false;

const listeners = new Set<SessionListener>();
const clearedListeners = new Set<SessionListener>();

function emit(): void {
  listeners.forEach(listener => listener());
}

function emitCleared(): void {
  clearedListeners.forEach(listener => listener());
}

function bindHttpAuth(): void {
  configureHttpAuth({
    getBearerToken: () => memorySession?.token ?? null,
    getAccessProof: () => memorySession?.accessProof ?? null,
  });
}

async function persistSecure(session: MemberSession): Promise<void> {
  await secureSet(SESSION_SECURE_KEY, JSON.stringify(session));
}

async function clearSecure(): Promise<void> {
  await secureRemove(SESSION_SECURE_KEY);
}

function isExpired(session: MemberSession, now: number): boolean {
  return session.expiresAt <= now;
}

export const sessionStore = {
  hasSession(): boolean {
    return memorySession !== null && memorySession.token.length > 0;
  },

  getSession(): MemberSession | null {
    return memorySession;
  },

  getToken(): string | null {
    return memorySession?.token ?? null;
  },

  getAccessProof(): string | null {
    return memorySession?.accessProof ?? null;
  },

  /**
   * Active une présence de session en mémoire (tests / compat L0d).
   * Ne crée pas de jeton réel.
   */
  setSessionPresent(present: boolean): void {
    if (!present) {
      if (memorySession !== null) {
        memorySession = null;
        rememberFlag = false;
        bindHttpAuth();
        emit();
        emitCleared();
      }
      return;
    }
    if (memorySession !== null) {
      return;
    }
    memorySession = {
      token: 'TEST_PRESENT',
      accountStatus: null,
      subscriptionStatus: null,
      subscriptionActive: false,
      dateFin: null,
      accessProof: null,
      expiresAt: Date.now() + 604800_000,
      userId: '',
    };
    bindHttpAuth();
    emit();
  },

  /**
   * Enregistre une session après connexion réussie.
   * souvenir=true → Keychain ; sinon mémoire seule, après purge Keychain.
   */
  async setSession(
    input: {
      token: string;
      userId: string;
      accountStatus: string | null;
      subscriptionStatus: string | null;
      subscriptionActive: boolean;
      dateFin: string | null;
      accessProof: string | null;
      expiresIn: number;
    },
    souvenir: boolean,
    now = Date.now(),
  ): Promise<void> {
    const expiresInMs =
      (typeof input.expiresIn === 'number' && input.expiresIn > 0
        ? input.expiresIn
        : 604800) * 1000;

    const session: MemberSession = {
      token: input.token,
      userId: input.userId,
      accountStatus: input.accountStatus,
      subscriptionStatus: input.subscriptionStatus,
      subscriptionActive: input.subscriptionActive,
      dateFin: input.dateFin,
      accessProof: input.accessProof,
      expiresAt: now + expiresInMs,
    };

    if (souvenir) {
      await persistSecure(session);
      rememberFlag = true;
    } else {
      await clearSecure();
      rememberFlag = false;
    }

    memorySession = session;
    bindHttpAuth();
    emit();
  },

  /**
   * Relecture au démarrage (avant navigation).
   * Session absente ou expirée → clearSession.
   */
  async hydrate(now = Date.now()): Promise<boolean> {
    const raw = await secureGet(SESSION_SECURE_KEY);
    if (!raw) {
      memorySession = null;
      rememberFlag = false;
      bindHttpAuth();
      emit();
      return false;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<MemberSession>;
      if (typeof parsed.token !== 'string' || !parsed.token) {
        await clearSecure();
        memorySession = null;
        rememberFlag = false;
        bindHttpAuth();
        emit();
        return false;
      }
      const session: MemberSession = {
        token: parsed.token,
        userId: typeof parsed.userId === 'string' ? parsed.userId : '',
        accountStatus:
          parsed.accountStatus === null || typeof parsed.accountStatus === 'string'
            ? (parsed.accountStatus as string | null)
            : null,
        subscriptionStatus:
          parsed.subscriptionStatus === null ||
          typeof parsed.subscriptionStatus === 'string'
            ? (parsed.subscriptionStatus as string | null)
            : null,
        subscriptionActive: Boolean(parsed.subscriptionActive),
        dateFin:
          parsed.dateFin === null || typeof parsed.dateFin === 'string'
            ? (parsed.dateFin as string | null)
            : null,
        accessProof:
          parsed.accessProof === null || typeof parsed.accessProof === 'string'
            ? (parsed.accessProof as string | null)
            : null,
        expiresAt:
          typeof parsed.expiresAt === 'number' ? parsed.expiresAt : 0,
      };
      if (isExpired(session, now)) {
        await this.clearSessionAsync();
        return false;
      }
      memorySession = session;
      rememberFlag = true;
      bindHttpAuth();
      emit();
      return true;
    } catch {
      await clearSecure();
      memorySession = null;
      rememberFlag = false;
      bindHttpAuth();
      emit();
      return false;
    }
  },

  clearSession(): void {
    memorySession = null;
    rememberFlag = false;
    bindHttpAuth();
    emit();
    emitCleared();
    void clearSecure();
  },

  async clearSessionAsync(): Promise<void> {
    memorySession = null;
    rememberFlag = false;
    bindHttpAuth();
    emit();
    emitCleared();
    await clearSecure();
  },

  isRemembered(): boolean {
    return rememberFlag;
  },

  subscribe(listener: SessionListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  onSessionCleared(listener: SessionListener): () => void {
    clearedListeners.add(listener);
    return () => {
      clearedListeners.delete(listener);
    };
  },
};

export function useHasSession(): boolean {
  return useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.hasSession,
    sessionStore.hasSession,
  );
}

// Branche les fournisseurs HTTP dès le chargement du module.
bindHttpAuth();
