import {useEffect, useRef} from 'react';
import {AppState} from 'react-native';

/**
 * Appelle `callback` toutes les `delayMs` tant que l'application est au premier
 * plan ; s'arrête en arrière-plan et reprend (avec un appel immédiat) au retour
 * (rapport §11.5 : le Worker n'envoie aucun push). La pause pendant une
 * limitation de débit est gérée par les stores, qui consultent isRateLimited.
 */
export function useVisiblePolling(callback: () => void, delayMs: number, enabled = true) {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  });

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    let timer: ReturnType<typeof setInterval> | null = null;
    const stop = () => {
      if (timer) {
        clearInterval(timer);
      }
      timer = null;
    };
    const start = () => {
      stop();
      timer = setInterval(() => saved.current(), delayMs);
    };
    if (AppState.currentState === 'active') {
      start();
    }
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') {
        saved.current();
        start();
      } else {
        stop();
      }
    });
    return () => {
      sub.remove();
      stop();
    };
  }, [delayMs, enabled]);
}
