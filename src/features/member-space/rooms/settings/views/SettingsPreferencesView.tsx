import React, {useSyncExternalStore} from 'react';
import {View, ScrollView, Pressable} from 'react-native';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {preferencesStore} from '@shared/preferences';
import type {ThemePreference} from '@shared/designsystem/theme/themePreferences';

export function SettingsPreferencesView({onBack}: {onBack: () => void}) {
  const {t, i18n} = useTranslation();
  const {colors, radii, glass} = useTheme();
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
        borderRadius: radii.md,
        backgroundColor: colors.bgSurfaceAlt,
        borderWidth: 1,
        borderColor: colors.borderLight,
      }}>
      {options.map(o => {
        const active = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            style={{
              flex: 1,
              paddingVertical: 8.8,
              paddingHorizontal: 8,
              borderRadius: Math.max(radii.md - 2, 4),
              backgroundColor: active ? colors.goldHalo18 : 'transparent',
              borderWidth: active ? 1 : 0,
              borderColor: colors.goldBorder,
              alignItems: 'center',
            }}>
            <Text
              style={{
                fontSize: 14.1,
                fontWeight: '600',
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
    <ScrollView contentContainerStyle={{padding: 16, gap: 16}}>
      <Pressable
        onPress={onBack}
        style={{
          alignSelf: 'flex-start',
          paddingVertical: 7.2,
          paddingHorizontal: 12,
          borderRadius: radii.md,
          backgroundColor: glass.bg,
          borderWidth: 1,
          borderColor: glass.border,
        }}>
        <Text style={{fontWeight: '600'}}>← {t('settings.back')}</Text>
      </Pressable>
      <Text style={{fontSize: 19.2, fontWeight: '800'}}>{t('settings.preferences.title')}</Text>

      <Text style={{fontSize: 12.5, fontWeight: '700', letterSpacing: 0.4, color: colors.textSecondary}}>
        {t('settings.language', {defaultValue: 'LANGUE'})}
      </Text>
      <Segment
        value={prefs.language}
        onChange={id => setLang(id as 'fr' | 'en')}
        options={[
          {id: 'fr', label: 'FR'},
          {id: 'en', label: 'EN'},
        ]}
      />

      <Text style={{fontSize: 12.5, fontWeight: '700', letterSpacing: 0.4, color: colors.textSecondary}}>
        {t('settings.theme', {defaultValue: 'THÈME'})}
      </Text>
      <Segment
        value={prefs.theme}
        onChange={id => setTheme(id as ThemePreference)}
        options={[
          {id: 'light', label: t('settings.themeLight', {defaultValue: 'Clair'})},
          {id: 'dark', label: t('settings.themeDark', {defaultValue: 'Sombre'})},
          {id: 'system', label: t('settings.themeSystem', {defaultValue: 'Système'})},
        ]}
      />

      <Pressable
        onPress={toggleMotion}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 14,
          borderRadius: radii.md,
          backgroundColor: glass.bg,
          borderWidth: 1,
          borderColor: glass.border,
          minHeight: 44,
        }}>
        <Text style={{fontSize: 15.2, fontWeight: '600', color: colors.textPrimary}}>
          {t('settings.reduceMotion', {defaultValue: 'Réduire les animations'})}
        </Text>
        <View
          style={{
            width: 46,
            height: 26,
            borderRadius: 13,
            borderWidth: 1,
            borderColor: prefs.reduceMotion ? colors.bluePrimary : colors.borderLight,
            backgroundColor: prefs.reduceMotion ? colors.bluePrimary : colors.bgSurfaceAlt,
            justifyContent: 'center',
            paddingHorizontal: 2,
          }}>
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: colors.switchKnob,
              alignSelf: prefs.reduceMotion ? 'flex-end' : 'flex-start',
            }}
          />
        </View>
      </Pressable>
    </ScrollView>
  );
}
