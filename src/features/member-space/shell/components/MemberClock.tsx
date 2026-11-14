/**
 * Horloge HH:MM — tick 15 s, stop en arrière-plan.
 */

import React, {useEffect, useState} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import {Text} from '@shared/designsystem';

function formatClock(now = new Date()): string {
  return now.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}

export function MemberClock() {
  const [time, setTime] = useState(formatClock);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) {
        return;
      }
      setTime(formatClock());
      timer = setInterval(() => setTime(formatClock()), 15_000);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onApp = (next: AppStateStatus) => {
      if (next === 'active') {
        start();
      } else {
        stop();
      }
    };
    start();
    const sub = AppState.addEventListener('change', onApp);
    return () => {
      stop();
      sub.remove();
    };
  }, []);

  return (
    <Text variant="caption" color="secondary" accessibilityLabel={time}>
      {time}
    </Text>
  );
}
