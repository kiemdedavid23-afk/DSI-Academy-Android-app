import {useEffect, useRef, useState} from 'react';

/**
 * Évite le clignotement du loader (useSkeletonGate.js du site) :
 * rien n'est affiché pendant `delay` ms ; une fois affiché, le loader reste
 * au moins `minVisible` ms.
 *
 * showLoader : afficher le loader de marque.
 * ready : les données sont là ET le loader est terminé (afficher le contenu).
 * showLoader faux et ready faux = courte attente initiale : n'afficher rien.
 */
export function useLoadingGate(
  loading: boolean,
  delay = 150,
  minVisible = 450,
): {showLoader: boolean; ready: boolean} {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (loading) {
      if (!visible) {
        timer = setTimeout(() => {
          shownAt.current = Date.now();
          setVisible(true);
        }, delay);
      }
    } else if (visible) {
      const remaining = Math.max(0, minVisible - (Date.now() - shownAt.current));
      timer = setTimeout(() => setVisible(false), remaining);
    }
    return () => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    };
  }, [loading, visible, delay, minVisible]);

  return {showLoader: visible, ready: !loading && !visible};
}
