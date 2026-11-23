import {safeEnvelope} from '@core/network';
import {community, noProof} from './common.api';
import {mapMemberCard, mapMemberSearch} from './directory.mapper';

/**
 * Annuaire (rapport §11.3) : abonnement actif requis, seau de débit `search`.
 * La recherche est une correspondance exacte (pseudonyme ou identifiant DSI) :
 * jamais le nom affiché.
 */

const AUTH = {auth: 'accessProof'} as const;

export async function searchMembers(query: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  const env = await safeEnvelope(
    community().get('/api/community/members/search', {
      ...AUTH,
      query: {q: query},
    }),
  );
  return mapMemberSearch(env);
}

/** `ref` : identifiant DSI ou pseudonyme ; le « @ » est encodé (%40). */
export async function fetchMemberCard(ref: string) {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  const env = await safeEnvelope(
    community().get(
      `/api/community/members/${encodeURIComponent(ref)}`,
      AUTH,
    ),
  );
  return mapMemberCard(env);
}
