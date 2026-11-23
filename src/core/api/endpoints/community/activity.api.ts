import {safeEnvelope} from '@core/network';
import {mapActivity} from './activity.mapper';
import {community, noProof} from './common.api';

/** Fil global, identique pour tous : 50 derniers événements, sans paramètre (rapport §11.7). */
export async function fetchActivity() {
  const missing = noProof();
  if (missing) {
    return missing;
  }
  return mapActivity(
    await safeEnvelope(
      community().get('/api/community/activity', {auth: 'accessProof'}),
    ),
  );
}
