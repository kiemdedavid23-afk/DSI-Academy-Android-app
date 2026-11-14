/**
 * Session membre : token, état, accessProof, expiresAt.
 * Fin de session unique : expireSession(reason).
 * Aucune fausse session de production (R-DATA-6).
 */

import {useSyncExternalStore} from 'react';
import {configureHttpAuth} from '../network/authProviders';
import {secureGet, secureRemove, secureSet} from '../storage/secureStorage';
import {registrationTracking} from './registrationTracking';
import {lastLoginIdentifier} from './lastLoginIdentifier';
import {
  sessionEndReason,
  type SessionEndReason,
} from './sessionEndReason';
import {sessionExpiryWatch} from './sessionExpiryWatch';

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
let ending = false;

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
    onUnauthorized: ctx => {
      if (ctx.auth === 'bearer' && ctx.status === 401) {
        void sessionStore.expireSession('unauthorized');
      }
    },
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
      typeof input.expiresIn === 'number' && input.expiresIn > 0
        ? input.expiresIn * 1000
        : 604800_000;
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
    memorySession = session;
    rememberFlag = souvenir;
    bindHttpAuth();
    emit();
    if (souvenir) {
      try {
        await persistSecure(session);
      } catch {
        // toléré
      }
    } else {
      try {
        await clearSecure();
      } catch {
        // toléré
      }
    }
    sessionExpiryWatch.reschedule();
  },

  async hydrate(now = Date.now()): Promise<boolean> {
    try {
      const raw = await secureGet(SESSION_SECURE_KEY);
      if (!raw) {
        memorySession = null;
        rememberFlag = false;
        bindHttpAuth();
        emit();
        return false;
      }
      const parsed = JSON.parse(raw) as Partial<MemberSession>;
      if (
        typeof parsed.token !== 'string' ||
        parsed.token.length === 0 ||
        typeof parsed.expiresAt !== 'number'
      ) {
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
        expiresAt: parsed.expiresAt,
      };
      if (isExpired(session, now)) {
        await this.expireSession('expired');
        return false;
      }
      memorySession = session;
      rememberFlag = true;
      bindHttpAuth();
      emit();
      sessionExpiryWatch.reschedule();
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

  /**
   * Fin de session unique (idempotente).
   * 1) mémoire + Keychain 2) tracking + prefill id 3) clearSession/purge
   * 4) motif one-shot (sauf loggedOut → pas de message)
   */
  async expireSession(reason: SessionEndReason): Promise<void> {
    if (ending) {
      return;
    }
    if (reason !== 'loggedOut' && memorySession === null) {
      // 401 sans session : ignoré
      if (reason === 'unauthorized') {
        return;
      }
    }
    ending = true;
    try {
      memorySession = null;
      rememberFlag = false;
      bindHttpAuth();
      emit();
      emitCleared();
      try {
        await clearSecure();
      } catch {
        // toléré : pas de log détaillé
      }
      try {
        await registrationTracking.clear();
      } catch {
        // ignore
      }
      lastLoginIdentifier.clear();
      if (reason === 'unauthorized' || reason === 'expired') {
        sessionEndReason.set(reason);
      } else {
        sessionEndReason.clear();
      }
      sessionExpiryWatch.reschedule();
    } finally {
      ending = false;
    }
  },

  clearSession(): void {
    memorySession = null;
    rememberFlag = false;
    bindHttpAuth();
    emit();
    emitCleared();
    void clearSecure();
    sessionExpiryWatch.reschedule();
  },

  async clearSessionAsync(): Promise<void> {
    memorySession = null;
    rememberFlag = false;
    bindHttpAuth();
    emit();
    emitCleared();
    await clearSecure();
    sessionExpiryWatch.reschedule();
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

bindHttpAuth();
