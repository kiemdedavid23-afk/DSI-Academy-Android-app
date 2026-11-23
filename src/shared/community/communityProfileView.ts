import {
  isCommunitySessionCode,
  isCommunitySubscriptionCode,
} from './communityErrors';

/**
 * État affiché par la carte « Profil communautaire » (reprend le site :
 * loading · ready · needsProfile · subscription · session · error).
 * Un rechargement qui échoue garde le profil déjà affiché.
 */
export type CommunityProfileView =
  | 'loading'
  | 'ready'
  | 'needsProfile'
  | 'subscription'
  | 'session'
  | 'error';

type StoreSnapshot = {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: {needsProfile: boolean; profile: unknown | null} | null;
  error: string | null;
};

export function communityProfileView(
  state: StoreSnapshot,
  subscriptionActive: boolean | null,
): CommunityProfileView {
  if (state.data) {
    return state.data.needsProfile || !state.data.profile
      ? 'needsProfile'
      : 'ready';
  }
  if (state.status === 'idle' || state.status === 'loading') {
    return 'loading';
  }
  const code = state.error;
  if (code === 'noProof' || code === 'unauthorized') {
    return 'session';
  }
  if (isCommunitySubscriptionCode(code, subscriptionActive)) {
    return 'subscription';
  }
  if (isCommunitySessionCode(code, subscriptionActive)) {
    return 'session';
  }
  return 'error';
}
