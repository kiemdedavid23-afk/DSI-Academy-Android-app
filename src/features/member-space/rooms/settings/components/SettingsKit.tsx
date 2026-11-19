/**
 * Kit visuel des Paramètres : fond uni (jamais la photo), barre du haut avec
 * bouton retour rond + titre centré, groupes de lignes arrondis.
 * Utilisé par le hub et par toutes les sous-pages.
 */

import React from 'react';
import {View, ScrollView, Pressable, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Text, Icon, useTheme} from '@shared/designsystem';

type IconName = React.ComponentProps<typeof Icon>['name'];

function RoundButton({
  icon,
  onPress,
  label,
  testID,
}: {
  icon?: IconName;
  onPress?: () => void;
  label: string;
  testID?: string;
}) {
  const {colors, elevation} = useTheme();
  if (!icon || !onPress) {
    return <View style={styles.round} />;
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={[
        styles.round,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderLight,
          borderWidth: StyleSheet.hairlineWidth,
          elevation: elevation.small,
          shadowColor: elevation.shadowColor,
          shadowOpacity: 0.12,
          shadowRadius: 4,
          shadowOffset: {width: 0, height: 1},
        },
      ]}>
      <Icon name={icon} size={22} color={colors.textPrimary} />
    </Pressable>
  );
}

export function SettingsScaffold({
  title,
  onBack,
  onInfo,
  backLabel,
  infoLabel,
  children,
  testID,
}: {
  title: string;
  onBack: () => void;
  onInfo?: () => void;
  backLabel: string;
  infoLabel?: string;
  children: React.ReactNode;
  testID?: string;
}) {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{flex: 1, backgroundColor: colors.bgApp, paddingTop: insets.top}}
      testID={testID}>
      <View style={styles.topBar}>
        <RoundButton icon="ChevronLeftIcon" onPress={onBack} label={backLabel} testID="settings-back" />
        <Text
          numberOfLines={1}
          style={[styles.topTitle, {color: colors.textPrimary}]}
          accessibilityRole="header">
          {title}
        </Text>
        <RoundButton icon="HelpIcon" onPress={onInfo} label={infoLabel ?? ''} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

export function SettingsLabel({children}: {children: string}) {
  const {colors} = useTheme();
  return (
    <Text style={[styles.label, {color: colors.textSecondary}]}>{children}</Text>
  );
}

export function SettingsGroup({children}: {children: React.ReactNode}) {
  const {colors, radii} = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View
      style={[
        styles.group,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderLight,
          borderRadius: radii.lg + 6,
        },
      ]}>
      {items.map((child, i) => (
        <View key={i}>
          {child}
          {i < items.length - 1 ? (
            <View style={[styles.divider, {backgroundColor: colors.borderLight}]} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function SettingsRow({
  icon,
  title,
  desc,
  onPress,
  right,
  chevron,
  danger,
  disabled,
  testID,
}: {
  icon?: IconName;
  title: string;
  desc?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  chevron?: boolean;
  danger?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  const {colors} = useTheme();
  const tint = danger ? colors.dangerText : colors.textPrimary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      testID={testID}
      style={[styles.row, {opacity: disabled ? 0.55 : 1}]}>
      {icon ? <Icon name={icon} size={24} color={tint} /> : null}
      <View style={styles.rowTexts}>
        <Text style={[styles.rowTitle, {color: tint}]}>{title}</Text>
        {desc ? (
          <Text style={[styles.rowDesc, {color: colors.textSecondary}]}>{desc}</Text>
        ) : null}
      </View>
      {right}
      {chevron ? <Icon name="ChevronRightIcon" size={20} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

/** Ligne d'information en lecture seule : petit libellé + valeur. */
export function SettingsInfoRow({label, value}: {label: string; value: string}) {
  const {colors} = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.rowTexts}>
        <Text style={[styles.rowDesc, {color: colors.textSecondary}]}>{label}</Text>
        <Text style={[styles.rowTitle, {color: colors.textPrimary}]}>{value}</Text>
      </View>
    </View>
  );
}

export function SettingsBadge({text}: {text: string}) {
  const {colors} = useTheme();
  return (
    <View
      style={[
        styles.badge,
        {backgroundColor: colors.bgSurfaceAlt, borderColor: colors.borderLight},
      ]}>
      <Text style={{fontSize: 12.5, fontWeight: '600', color: colors.textSecondary}}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700'},
  content: {padding: 16, paddingBottom: 40, gap: 18},
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: -8,
    marginLeft: 6,
  },
  group: {borderWidth: 1, overflow: 'hidden'},
  divider: {height: StyleSheet.hairlineWidth, marginLeft: 54},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    minHeight: 56,
  },
  rowTexts: {flex: 1, gap: 2},
  rowTitle: {fontSize: 17, lineHeight: 23},
  rowDesc: {fontSize: 13.5, lineHeight: 19},
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
});
