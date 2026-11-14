/**
 * Cloche — ouvre Notifications (placeholder). Badge = unread (0 pour l'instant).
 */

import React from 'react';
import {Pressable, View, StyleSheet} from 'react-native';
import {Icon, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {useUnreadNotifications} from '@shared/store';

type Props = {
  onPress: () => void;
};

export function MemberBell({onPress}: Props) {
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const unread = useUnreadNotifications();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('rooms.notifications')}
      hitSlop={8}
      style={styles.wrap}
      testID="member-bell">
      <Icon name="BellIcon" size={22} color={colors.textPrimary} />
      {unread > 0 ? (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: colors.error,
              borderRadius: radii.round,
              minWidth: 16,
              paddingHorizontal: spacing.xs,
            },
          ]}>
          <Text variant="caption" color="onDark">
            {unread > 9 ? '9+' : String(unread)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {padding: 4},
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
