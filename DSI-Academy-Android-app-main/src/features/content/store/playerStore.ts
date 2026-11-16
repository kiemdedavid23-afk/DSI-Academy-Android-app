/**
 * Lecteur audio / vidéo : lien du moteur (L4b) → Media3 lit directement chez la
 * source (Range natif), sans fichier ni redirection. Lien expiré en cours de
 * lecture : nouvelle demande au Worker, reprise à la même seconde (2 fois max).
 */

import {openMedia} from '@core/media/engine';
import {
  classifyPlayerError,
  getPlayerState,
  loadMedia,
  nextSpeed,
  playerControls,
  SEEK_STEP_MS,
} from '@core/media/playerNative';
import type {MediaErrorKind} from '@core/media/types';
import {isAllowedYoutubeNavigation, YOUTUBE_BASE_URL, YOUTUBE_ORIGIN_WHITELIST, youtubeEmbedHtml} from '@core/config/youtube';
import {continueStore, progressStore, storeRegistry} from '@shared/store';
import {createSimpleStore} from './simpleStore';

export {isAllowedYoutubeNavigation, YOUTUBE_BASE_URL, YOUTUBE_ORIGIN_WHITELIST};

export const POLL_MS = 500;
export const SAVE_EVERY_MS = 5000;
export const MAX_RE_RESOLVES = 2;
const VIDEO_FORMATS = ['mp4', 'webm'];

export type PlayerKind = 'audio' | 'video' | 'youtube';

export type PlayerStoreState = {
  contentId: number | null;
  title: string;
  artwork: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  kind: PlayerKind | null;
  youtubeHtml: string | null;
  playing: boolean;
  buffering: boolean;
  ended: boolean;
  positionMs: number;
  durationMs: number;
  speed: number;
  fullscreen: boolean;
  /** Lecture en boucle. */
  loop: boolean;
  /** Volume de 0 à 1 (conservé pendant le mode muet). */
  volume: number;
  muted: boolean;
  /** Minuteur de sommeil armé, en minutes, ou null. */
  sleepMinutes: number | null;
  /** Image dans l'image demandée. */
  pip: boolean;
  errorKind: MediaErrorKind | null;
  retryable: boolean;
};

const INITIAL: PlayerStoreState = {
  contentId: null,
  title: '',
  artwork: null,
  status: 'idle',
  kind: null,
  youtubeHtml: null,
  playing: false,
  buffering: false,
  ended: false,
  positionMs: 0,
  durationMs: 0,
  speed: 1,
  fullscreen: false,
  loop: false,
  volume: 1,
  muted: false,
  sleepMinutes: null,
  pip: false,
  errorKind: null,
  retryable: false,
};

export function createPlayerStore() {
  const store = createSimpleStore<PlayerStoreState>(INITIAL);
  let generation = 0;
  let poll: ReturnType<typeof setInterval> | null = null;
  let lastSave = 0;
  let sleepTimer: ReturnType<typeof setTimeout> | null = null;

  function clearSleep(): void {
    if (sleepTimer) {
      clearTimeout(sleepTimer);
      sleepTimer = null;
    }
  }
  let resumePercent: number | null = null;
  let reResolves = 0;
  let busy = false;

  function stopPoll() {
    if (poll) {
      clearInterval(poll);
      poll = null;
    }
  }

  async function persist(force: boolean): Promise<void> {
    const s = store.getState();
    if (s.contentId === null || s.kind === 'youtube' || s.durationMs <= 0) {
      return;
    }
    const now = Date.now();
    if (!force && now - lastSave < SAVE_EVERY_MS) {
      return;
    }
    lastSave = now;
    const percent = Math.max(0, Math.min(100, (s.positionMs / s.durationMs) * 100));
    await progressStore.save(s.contentId, percent);
    await continueStore.set({
      id: String(s.contentId),
      house: s.kind === 'video' ? 'videos' : 'audio',
      title: s.title,
      path: '',
      progress: percent,
    });
  }

  /** Demande un lien et le confie au lecteur natif. Renvoie false en cas d'échec (état d'erreur posé). */
  async function start(mine: number, startMs: number): Promise<boolean> {
    const opened = await openMedia(store.getState().contentId as number);
    if (mine !== generation) {
      return false;
    }
    if (opened.kind === 'failure') {
      store.setState({status: 'error', errorKind: opened.errorKind, retryable: opened.retryable});
      return false;
    }
    const s = opened.media.strategy;
    if (s.kind === 'embeddedYoutube') {
      store.setState({status: 'ready', kind: 'youtube', youtubeHtml: youtubeEmbedHtml(s.videoId)});
      return true;
    }
    if (s.kind !== 'nativeStream') {
      store.setState({status: 'error', errorKind: 'unsupportedFormat', retryable: false});
      return false;
    }
    const kind: PlayerKind = VIDEO_FORMATS.includes(s.format.toLowerCase()) ? 'video' : 'audio';
    const ok = await loadMedia({
      url: s.url,
      title: store.getState().title,
      artwork: store.getState().artwork,
      startMs,
      audio: kind === 'audio',
    });
    if (mine !== generation) {
      return false;
    }
    if (!ok) {
      store.setState({status: 'error', errorKind: 'unsupportedFormat', retryable: false});
      return false;
    }
    store.setState({status: 'ready', kind});
    return true;
  }

  async function tick(mine: number) {
    if (busy || mine !== generation) {
      return;
    }
    busy = true;
    try {
      const st = await getPlayerState();
      if (!st || mine !== generation) {
        return;
      }
      if (st.error) {
        const c = classifyPlayerError(st.error);
        if (c.reResolve && reResolves < MAX_RE_RESOLVES) {
          reResolves += 1;
          const at = store.getState().positionMs;
          await start(mine, at);
          return;
        }
        stopPoll();
        const kind = c.errorKind === 'pdfProtected' || c.errorKind === 'pdfInvalid' ? 'server' : c.errorKind;
        store.setState({status: 'error', errorKind: kind, retryable: c.retryable, playing: false});
        return;
      }
      const prev = store.getState();
      store.setState({
        playing: st.playing,
        buffering: st.state === 'buffering',
        ended: st.state === 'ended',
        positionMs: st.positionMs,
        durationMs: st.durationMs,
        speed: st.speed,
      });
      if (resumePercent !== null && st.durationMs > 0 && prev.status === 'ready') {
        const target = (resumePercent / 100) * st.durationMs;
        resumePercent = null;
        playerControls.seekTo(target);
      }
      if (st.playing || st.state === 'ended') {
        await persist(false);
      }
    } finally {
      busy = false;
    }
  }

  async function open(contentId: number, title: string, artwork: string | null): Promise<void> {
    generation += 1;
    const mine = generation;
    stopPoll();
    clearSleep();
    playerControls.release();
    reResolves = 0;
    lastSave = 0;
    store.replace({...INITIAL, contentId, title, artwork, status: 'loading'});
    const saved = await progressStore.get(contentId);
    if (mine !== generation) {
      return;
    }
    resumePercent = saved !== null && saved > 3 && saved < 97 ? saved : null;
    const ok = await start(mine, 0);
    if (ok && store.getState().kind !== 'youtube' && mine === generation) {
      poll = setInterval(() => void tick(mine), POLL_MS);
    }
  }

  const api = {
    getState: store.getState,
    subscribe: store.subscribe,
    open,
    togglePlay: () => {
      const s = store.getState();
      if (s.ended) {
        playerControls.seekTo(0);
      }
      s.playing ? playerControls.pause() : playerControls.play();
    },
    pause: () => playerControls.pause(),
    seekBy: (deltaMs: number) => {
      const {positionMs, durationMs} = store.getState();
      const max = durationMs > 0 ? durationMs : Number.MAX_SAFE_INTEGER;
      playerControls.seekTo(Math.max(0, Math.min(max, positionMs + deltaMs)));
    },
    seekBack: () => api.seekBy(-SEEK_STEP_MS),
    seekForward: () => api.seekBy(SEEK_STEP_MS),
    seekToFraction: (f: number) => {
      const {durationMs} = store.getState();
      if (durationMs > 0) {
        playerControls.seekTo(Math.max(0, Math.min(1, f)) * durationMs);
      }
    },
    cycleSpeed: () => {
      const next = nextSpeed(store.getState().speed);
      playerControls.setSpeed(next);
      store.setState({speed: next});
    },
    setSpeed: (speed: number) => {
      playerControls.setSpeed(speed);
      store.setState({speed});
    },
    toggleLoop: () => {
      const loop = !store.getState().loop;
      playerControls.setLoop(loop);
      store.setState({loop});
    },
    setVolume: (v: number) => {
      const volume = Math.max(0, Math.min(1, v));
      playerControls.setVolume(volume);
      store.setState({volume, muted: volume === 0});
    },
    toggleMute: () => {
      const s = store.getState();
      const muted = !s.muted;
      playerControls.setVolume(muted ? 0 : s.volume > 0 ? s.volume : 1);
      store.setState({muted});
    },
    /** Arme (ou coupe, avec null) l'arrêt automatique après N minutes. */
    setSleep: (minutes: number | null) => {
      clearSleep();
      store.setState({sleepMinutes: minutes});
      if (minutes !== null) {
        sleepTimer = setTimeout(() => {
          sleepTimer = null;
          playerControls.pause();
          store.setState({sleepMinutes: null});
        }, minutes * 60_000);
      }
    },
    enterPip: () => {
      store.setState({pip: true});
      playerControls.enterPip();
    },
    setPip: (on: boolean) => store.setState({pip: on}),
    setFullscreen: (on: boolean) => {
      playerControls.setFullscreen(on);
      store.setState({fullscreen: on});
    },
    close: async () => {
      generation += 1;
      stopPoll();
      clearSleep();
      if (store.getState().fullscreen) {
        playerControls.setFullscreen(false);
      }
      await persist(true);
      playerControls.release();
      store.replace(INITIAL);
    },
    reset: () => {
      generation += 1;
      stopPoll();
      clearSleep();
      playerControls.release();
      store.replace(INITIAL);
    },
    purge: () => api.reset(),
  };
  storeRegistry.register(api);
  return api;
}

export const playerStore = createPlayerStore();
