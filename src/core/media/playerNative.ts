import {NativeModules} from 'react-native';
import {classifyPdfError} from './pdfNative';

/** Pont vers le module Kotlin DsiPlayer (Media3). Aucune adresse n'est journalisée. */

export type PlayerState = {
  playing: boolean;
  state: 'idle' | 'buffering' | 'ready' | 'ended';
  positionMs: number;
  durationMs: number;
  speed: number;
  error: string | null;
};

type NativeDsiPlayer = {
  load(url: string, title: string, artist: string | null, artwork: string | null, startMs: number, audioService: boolean): Promise<void>;
  play(): void;
  pause(): void;
  seekTo(ms: number): void;
  setSpeed(speed: number): void;
  getState(): Promise<PlayerState>;
  setFullscreen(enabled: boolean): void;
  release(): void;
};

export const SPEEDS = [1, 1.25, 1.5, 2, 0.75] as const;
export const SEEK_STEP_MS = 15_000;

function native(): NativeDsiPlayer | null {
  return (NativeModules as {DsiPlayer?: NativeDsiPlayer}).DsiPlayer ?? null;
}

export function isPlayerAvailable(): boolean {
  return native() !== null;
}

export function classifyPlayerError(code: string) {
  if (code === 'UNSUPPORTED') {
    return {errorKind: 'unsupportedFormat' as const, retryable: false, reResolve: false};
  }
  if (code === 'PLAYER') {
    return {errorKind: 'server' as const, retryable: true, reResolve: false};
  }
  return classifyPdfError(code);
}

export function nextSpeed(current: number): number {
  const i = (SPEEDS as readonly number[]).indexOf(current);
  return SPEEDS[(i + 1) % SPEEDS.length];
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

export async function loadMedia(o: {
  url: string;
  title: string;
  artwork: string | null;
  startMs: number;
  audio: boolean;
}): Promise<boolean> {
  const mod = native();
  if (!mod) {
    return false;
  }
  await mod.load(o.url, o.title, null, o.artwork, o.startMs, o.audio);
  return true;
}

export async function getPlayerState(): Promise<PlayerState | null> {
  return native()?.getState() ?? null;
}

export const playerControls = {
  play: () => native()?.play(),
  pause: () => native()?.pause(),
  seekTo: (ms: number) => native()?.seekTo(ms),
  setSpeed: (s: number) => native()?.setSpeed(s),
  setFullscreen: (on: boolean) => native()?.setFullscreen(on),
  release: () => native()?.release(),
};
