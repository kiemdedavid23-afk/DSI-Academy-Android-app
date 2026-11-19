import React, {useSyncExternalStore} from 'react';
import {View, Pressable} from 'react-native';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {preferencesStore} from '@shared/preferences';
import type {ThemePreference} from '@shared/designsystem/theme/themePreferences';
import {
  SettingsScaffold,
  SettingsGroup,
  SettingsRow,
  SettingsLabel,
} from '../components/SettingsKit';

export function SettingsPreferencesView({onBack}: {onBack: () => void}) {
  const {t, i18n} = useTranslation();
  const {colors, radii} = useTheme();
  const prefs = useSyncExternalStore(
    preferencesStore.subscribe,
    () => preferencesStore.get(),
  );

  const setLang = (language: 'fr' | 'en') => {
    preferencesStore.set({language});
    void i18n.changeLanguage(language);
  };
  const setTheme = (theme: ThemePreference) => preferencesStore.set({theme});
  const toggleMotion = () =>
    preferencesStore.set({reduceMotion: !prefs.reduceMotion});

  const Segment = ({
    options,
    value,
    onChange,
  }: {
    options: {id: string; label: string}[];
    value: string;
    onChange: (id: string) => void;
  }) => (
    <View
      style={{
        flexDirection: 'row',
        gap: 4,
        padding: 4,
        borderRadius: radii.md + 4,
        backgroundColor: colors.bgSurfaceAlt,
        margin: 14,
      }}>
      {options.map(o => {
        const active = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            accessibilityRole="button"
            accessibilityState={{selected: active}}
            style={{
              flex: 1,
              minHeight: 44,
              justifyContent: 'center',
              borderRadius: radii.md,
              backgroundColor: active ? colors.bgSurface : 'transparent',
              borderWidth: active ? 1 : 0,
              borderColor: active ? colors.goldBorder : 'transparent',
              alignItems: 'center',
            }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: active ? '700' : '500',
                color: active ? colors.textPrimary : colors.textSecondary,
              }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <SettingsScaffold
      title={t('settings.preferences.title')}
      onBack={onBack}
      backLabel={t('settings.back')}
      testID="screen-settings-preferences">
      <SettingsLabel>{t('settings.language', {defaultValue: 'Langue'})}</SettingsLabel>
      <SettingsGroup>
        <Segment
          value={prefs.language}
          onChange={id => setLang(id as 'fr' | 'en')}
          options={[
            {id: 'fr', label: 'Français'},
            {id: 'en', label: 'English'},
          ]}
        />
      </SettingsGroup>

      <SettingsLabel>{t('settings.theme', {defaultValue: 'Thème'})}</SettingsLabel>
      <SettingsGroup>
        <Segment
          value={prefs.theme}
          onChange={id => setTheme(id as ThemePreference)}
          options={[
            {id: 'light', label: t('settings.themeLight', {defaultValue: 'Clair'})},
            {id: 'dark', label: t('settings.themeDark', {defaultValue: 'Sombre'})},
            {id: 'system', label: t('settings.themeSystem', {defaultValue: 'Système'})},
          ]}
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          title={t('settings.reduceMotion', {defaultValue: 'Réduire les animations'})}
          onPress={toggleMotion}
          right={
            <View
              style={{
                width: 50,
                height: 30,
                borderRadius: 15,
                backgroundColor: prefs.reduceMotion ? colors.bluePrimary : colors.borderLight,
                justifyContent: 'center',
                paddingHorizontal: 3,
              }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: colors.switchKnob,
                  alignSelf: prefs.reduceMotion ? 'flex-end' : 'flex-start',
                }}
              />
            </View>
          }
        />
      </SettingsGroup>
    </SettingsScaffold>
  );
}
