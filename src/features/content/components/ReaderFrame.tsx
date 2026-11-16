/**
 * Cadre commun des lecteurs (PDF, texte, EPUB/DOCX) : barre du haut avec retour rond,
 * titre, menu « ⋮ » (Partager ; Télécharger affiché mais verrouillé).
 */

import React, {useState} from 'react';
import {Platform, Pressable, Share, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Circle, Path} from 'react-native-svg';
import {Icon, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';

const BTN = 44;

type Props = {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
};

export function ReaderFrame({title, onBack, children}: Props) {
  const {t} = useTranslation();
  const {colors, elevation} = useTheme();
  const insets = useSafeAreaInsets();
  const [menu, setMenu] = useState(false);

  const round = {
    backgroundColor: colors.bgSurface,
    borderColor: colors.borderLight,
    ...Platform.select({
      android: {elevation: elevation.small},
      default: {},
    }),
  };

  return (
    <View style={{flex: 1, backgroundColor: colors.bgApp}}>
      <View style={[styles.bar, {paddingTop: insets.top + 8}]}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t('app.reader.back', {defaultValue: 'Retour'})}
          style={[styles.round, round]}
          testID="reader-back">
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path
              d="M19 12H5M11 6l-6 6 6 6"
              stroke={colors.textPrimary}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
        <Text variant="bodyStrong" numberOfLines={1} style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Pressable
          onPress={() => setMenu(v => !v)}
          accessibilityRole="button"
          accessibilityLabel={t('app.reader.moreOptions', {defaultValue: "Plus d'options"})}
          style={[styles.round, round]}
          testID="reader-menu">
          <Svg width={22} height={22} viewBox="0 0 24 24" fill={colors.textPrimary}>
            <Circle cx={12} cy={5} r={1.8} />
            <Circle cx={12} cy={12} r={1.8} />
            <Circle cx={12} cy={19} r={1.8} />
          </Svg>
        </Pressable>
      </View>

      <View style={{flex: 1}}>{children}</View>

      {menu ? (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu(false)} accessible={false} />
          <View
            style={[
              styles.menu,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderLight,
                top: insets.top + 8 + BTN + 6,
              },
            ]}
            testID="reader-menu-card">
            <Pressable
              onPress={() => {
                setMenu(false);
                void Share.share({title, message: title}).catch(() => undefined);
              }}
              accessibilityRole="menuitem"
              style={styles.item}
              testID="reader-share">
              <Icon name="ShareIcon" size={22} color={colors.textPrimary} />
              <Text variant="bodyStrong">{t('app.reader.share', {defaultValue: 'Partager'})}</Text>
            </Pressable>
            <View
              accessibilityRole="menuitem"
              accessibilityState={{disabled: true}}
              style={[styles.item, {opacity: 0.45}]}
              testID="reader-download-locked">
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 4v11M7 11l5 5 5-5M5 20h14"
                  stroke={colors.textPrimary}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <View style={{flex: 1}}>
                <Text variant="bodyStrong">{t('app.reader.download', {defaultValue: 'Télécharger'})}</Text>
              </View>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z"
                  stroke={colors.textPrimary}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {alignItems: 'center', flexDirection: 'row', gap: 12, paddingBottom: 8, paddingHorizontal: 12},
  round: {alignItems: 'center', borderRadius: BTN / 2, borderWidth: 1, height: BTN, justifyContent: 'center', width: BTN},
  title: {flex: 1, fontSize: 17},
  menu: {
    borderRadius: 22,
    borderWidth: 1,
    elevation: 8,
    minWidth: 220,
    paddingVertical: 6,
    position: 'absolute',
    right: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  item: {alignItems: 'center', flexDirection: 'row', gap: 16, minHeight: 52, paddingHorizontal: 20},
});
