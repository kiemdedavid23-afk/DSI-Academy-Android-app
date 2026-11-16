/**
 * Réglages de lecture (site : ReaderChrome.jsx) : thème clair / sépia / nuit,
 * police, taille de 80 % à 200 %. Mémorisés sur l'appareil.
 */

import React, {useState, useSyncExternalStore} from 'react';
import {View} from 'react-native';
import {Button, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {
  FONT_MAX,
  FONT_MIN,
  FONT_STEP,
  READING_FAMILIES,
  READING_THEMES,
  readerLookStore,
} from '../store/readerLookStore';
import {ReaderChip} from './ReaderChip';

const THEME_KEYS = {light: 'app.reader.themeLight', sepia: 'app.reader.themeSepia', night: 'app.reader.themeNight'} as const;
const FAMILY_KEYS = {serif: 'app.reader.fontSerif', sans: 'app.reader.fontSans'} as const;

export function ReadingSettings() {
  const {t} = useTranslation();
  const {spacing, radii, glass} = useTheme();
  const look = useSyncExternalStore(readerLookStore.subscribe, readerLookStore.getState);
  const [open, setOpen] = useState(false);

  return (
    <View style={{gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm}}>
      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.sm}}>
        <Button
          label="A−"
          accessibilityLabel={t('app.reader.smaller')}
          variant="secondary"
          disabled={look.fontPercent <= FONT_MIN}
          onPress={() => readerLookStore.set({fontPercent: look.fontPercent - FONT_STEP})}
          testID="reader-smaller"
        />
        <Button
          label="A+"
          accessibilityLabel={t('app.reader.larger')}
          variant="secondary"
          disabled={look.fontPercent >= FONT_MAX}
          onPress={() => readerLookStore.set({fontPercent: look.fontPercent + FONT_STEP})}
          testID="reader-larger"
        />
        <Button
          label="Aa"
          accessibilityLabel={t('app.reader.settings')}
          variant={open ? 'primary' : 'secondary'}
          onPress={() => setOpen(v => !v)}
          testID="reader-settings"
        />
      </View>
      {open ? (
        <View
          style={{
            backgroundColor: glass.bg,
            borderColor: glass.border,
            borderRadius: radii.lg,
            borderWidth: 1,
            gap: spacing.md,
            padding: spacing.lg,
          }}>
          <Text variant="subtitle" accessibilityRole="header">
            {t('app.reader.settings')}
          </Text>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm}}>
            {READING_THEMES.map(id => (
              <ReaderChip
                key={id}
                label={t(THEME_KEYS[id])}
                active={look.theme === id}
                onPress={() => readerLookStore.set({theme: id})}
                testID={`reader-theme-${id}`}
              />
            ))}
          </View>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm}}>
            {READING_FAMILIES.map(id => (
              <ReaderChip
                key={id}
                label={t(FAMILY_KEYS[id])}
                active={look.family === id}
                onPress={() => readerLookStore.set({family: id})}
                testID={`reader-family-${id}`}
              />
            ))}
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md}}>
            <Text variant="bodySmallStrong" color="secondary">
              {t('app.reader.fontSize')} : {look.fontPercent} %
            </Text>
            <Button
              label={t('app.reader.fontReset')}
              variant="ghost"
              onPress={() => readerLookStore.reset()}
              testID="reader-look-reset"
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}
