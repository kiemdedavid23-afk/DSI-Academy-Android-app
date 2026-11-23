import {safeEnvelope} from '@core/network';
import {community, noProof} from './common.api';
import {mapCommunityMe} from './me.mapper';

/** État du membre au démarrage (rapport §10). */
export async function fetchCommunityMe() {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  const env = await safeEnvelope(community().get('/api/community/me', {auth: 'accessProof'}));
  return mapCommunityMe(env);
}
