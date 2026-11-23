import React from 'react';
import {Pressable, View} from 'react-native';
import type {CommunityPeer} from '@core/api/endpoints/community/common.types';
import {MemberAvatar, Text, useTheme} from '@shared/designsystem';
import {initialsOf} from '@shared/community';
import {refreshAfterImageError} from '@shared/store';

type Props = {
  peer: CommunityPeer;
  subtitle?: string | null;
  onPress?: () => void;
  /** Boutons d'action à droite (Accepter, Refuser, Retirer…). */
  actions?: React.ReactNode;
  testID?: string;
};

/** Ligne de membre : photo (miniature en liste), nom, pseudonyme. */
export function PersonRow({peer, subtitle, onPress, actions, testID}: Props) {
  const {colors, spacing, radii} = useTheme();
  return (
    <View
      testID={testID}
      style={{
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: colors.bgSurfaceAlt,
        borderRadius: radii.md,
        padding: spacing.md,
        gap: spacing.sm,
      }}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${peer.displayName} ${peer.publicPseudonym}`}
        style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
        <MemberAvatar
          initials={initialsOf(peer.displayName)}
          size="sm"
          src={peer.avatarThumbUrl ?? peer.avatarUrl}
          onImageError={refreshAfterImageError}
        />
        <View style={{flex: 1}}>
          <Text style={{fontSize: 15.2, fontWeight: '700', color: colors.textPrimary}}>
            {peer.displayName}
          </Text>
          <Text style={{fontSize: 13, color: colors.textSecondary}}>
            {peer.publicPseudonym}
          </Text>
          {subtitle ? (
            <Text style={{fontSize: 12, color: colors.textMuted}}>{subtitle}</Text>
          ) : null}
        </View>
      </Pressable>
      {actions ? (
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm}}>
          {actions}
        </View>
      ) : null}
    </View>
  );
}
