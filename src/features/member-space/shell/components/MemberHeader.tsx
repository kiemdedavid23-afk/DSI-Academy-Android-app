/**
 * En-tête Espace membre : marque, welcome, hamburger, cloche, horloge.
 */

import React from 'react';
import {View, Pressable, Image, StyleSheet} from 'react-native';
import {Text, Icon, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {MemberClock} from './MemberClock';
import {MemberBell} from './MemberBell';

const LOGO = require('@assets/images/logo/logo-d.png');

type Props = {
  showMenu: boolean;
  onOpenDrawer: () => void;
  onOpenNotifications: () => void;
  welcomeKey?: string;
};

export function MemberHeader({
  showMenu,
  onOpenDrawer,
  onOpenNotifications,
  welcomeKey = 'houses.welcome.memberSpace',
}: Props) {
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.bgSurface,
          borderBottomColor: colors.borderLight,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
      ]}
      testID="member-header">
      <View style={styles.brand}>
        {showMenu ? (
          <Pressable
            onPress={onOpenDrawer}
            accessibilityRole="button"
            accessibilityLabel={t('houses.menuButton')}
            hitSlop={8}
            testID="member-menu">
            <Icon name="HomeIcon" size={22} color={colors.textPrimary} />
          </Pressable>
        ) : null}
        <Image
          source={LOGO}
          style={styles.logo}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <View style={{marginLeft: spacing.sm, flexShrink: 1}}>
          <Text variant="label" color="primary" numberOfLines={1}>
            DSI Academy
          </Text>
          <Text variant="caption" color="secondary" numberOfLines={1}>
            {t(welcomeKey)}
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        <MemberClock />
        <View style={{width: spacing.md}} />
        <MemberBell onPress={onOpenNotifications} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  brand: {flexDirection: 'row', alignItems: 'center', flex: 1},
  logo: {width: 28, height: 28, marginLeft: 8},
  right: {flexDirection: 'row', alignItems: 'center'},
});
