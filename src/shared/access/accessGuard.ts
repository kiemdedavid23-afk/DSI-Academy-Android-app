/**
 * Garde d'accès — portage exact de src/shared/access/accessGuard.js (site).
 * Pure logique, aucun appel réseau.
 */

export type AccessGuardOptions = {
  subscriptionActive?: boolean;
  accessProof?: string | null;
  requireSubscription?: boolean;
  requireProof?: boolean;
};

export type AccessGuardResult = {
  ok: boolean;
  reason: 'subscription_required' | 'proof_required' | null;
};

export function canAccessResource({
  subscriptionActive = false,
  accessProof = null,
  requireSubscription = true,
  requireProof = false,
}: AccessGuardOptions = {}): AccessGuardResult {
  if (requireSubscription && !subscriptionActive) {
    return {ok: false, reason: 'subscription_required'};
  }
  if (requireProof && !accessProof) {
    return {ok: false, reason: 'proof_required'};
  }
  return {ok: true, reason: null};
}
