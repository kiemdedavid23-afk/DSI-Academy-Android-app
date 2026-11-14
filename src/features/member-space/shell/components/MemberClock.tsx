/**
 * Horloge HH:MM — 0.82rem / 600 / tabular-nums / text-secondary.
 * Tick 15 s, arrêt en arrière-plan.
 */

import React, {useEffect, useState} from 'react';
import {AppState, type AppStateStatus, StyleSheet} from 'react-native';
import {Text, useTheme} from '@shared/designsystem';

function formatClock(now = new Date()): string {
  return now.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}

export function MemberClock() {
  const {colors} = useTheme();
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
    <Text
      style={[
        styles.clock,
        {
          color: colors.textSecondary,
          fontFamily: 'Manrope-SemiBold',
        },
      ]}
      accessibilityLabel={time}>
      {time}
    </Text>
  );
}

const styles = StyleSheet.create({
  clock: {
    fontSize: 13.12, // 0.82rem
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
