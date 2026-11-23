/**
 * Notifications (reprend site : CommunityNotificationsPage.jsx). Chaque ligne
 * mène à la discussion ou au Support et passe en « lue ». Relecture toutes les
 * 30 s au premier plan, ou en tirant vers le bas. Les appels entrants relèvent
 * du lot C7 : la ligne s'affiche, sans destination.
 */

import React, {useEffect, useSyncExternalStore} from 'react';
import {ActivityIndicator, Pressable, RefreshControl, ScrollView, View} from 'react-native';
import type {CommunityNotification} from '@core/api/endpoints/community/notifications.types';
import {Button, EmptyState, ErrorState, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {CommunityGate} from '../components/CommunityGate';
import {formatListTime} from '../format';
import {useVisiblePolling} from '../hooks/useVisiblePolling';
import {conversationsStore} from '../store/conversationsStore';
import {
  communityNotificationsStore,
  markNotificationsRead,
  refreshNotifications,
  unreadOf,
} from '../store/communityNotificationsStore';

const POLL_MS = 30_000;

type Props = {
  onOpenChat: (id: string, title: string, type: 'direct' | 'group' | 'space') => void;
  onOpenSupport: () => void;
  onOpenProfile: () => void;
  onOpenSubscription: () => void;
};

export function CommunityNotificationsScreen({
  onOpenChat,
  onOpenSupport,
  onOpenProfile,
  onOpenSubscription,
}: Props) {
  const {t, i18n} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const state = useSyncExternalStore(
    cb => communityNotificationsStore.subscribe(() => cb()),
    () => communityNotificationsStore.getState(),
  );

  useEffect(() => {
    void communityNotificationsStore.load({force: true});
    // Titre et type de la discussion : repris de la liste des discussions.
    void conversationsStore.load();
  }, []);
  useVisiblePolling(refreshNotifications, POLL_MS);

  const unread = unreadOf(state.data);

  const labelOf = (n: CommunityNotification): string => {
    const name = n.fromDisplayName || n.fromPseudonym || t('communityApp.notifications.someone');
    if (n.type === 'message.created') {
      return t('communityApp.notifications.message', {name});
    }
    if (n.type === 'support.message') {
      return t('communityApp.notifications.support');
    }
    return t('communityApp.notifications.call', {name});
  };

  const open = (n: CommunityNotification) => {
    if (!n.read) {
      void markNotificationsRead([n.id]);
    }
    if (n.type === 'support.message') {
      onOpenSupport();
      return;
    }
    const conversationId = n.payload.conversationId;
    if (n.type === 'message.created' && conversationId) {
      const known = conversationsStore.getState().data?.find(c => c.id === conversationId);
      const type = known && known.type !== 'official' ? known.type : 'direct';
      onOpenChat(
        conversationId,
        known?.title || n.fromDisplayName || t('communityApp.notifications.someone'),
        type,
      );
    }
  };

  const renderBody = () => {
    if (!state.data) {
      if (state.status === 'error' && state.error) {
        return (
          <ErrorState
            message={t(state.error)}
            retryLabel={t('common.retry')}
            onRetry={() => void communityNotificationsStore.load({force: true})}
            testID="community-notifications-error"
          />
        );
      }
      return (
        <View style={{padding: spacing.xl, alignItems: 'center'}} testID="community-notifications-loading">
          <ActivityIndicator color={colors.bluePrimary} />
        </View>
      );
    }
    if (state.data.length === 0) {
      return (
        <EmptyState
          title={t('communityApp.notifications.empty')}
          message={t('communityApp.notifications.emptyText')}
          testID="community-notifications-empty"
        />
      );
    }
    return (
      <View style={{gap: spacing.sm}}>
        {unread.length > 0 ? (
          <Button
            variant="secondary"
            label={t('communityApp.notifications.markAllRead')}
            onPress={() => void markNotificationsRead(unread.map(n => n.id))}
            testID="community-notifications-mark-all"
          />
        ) : null}
        {state.data.map(n => (
          <Pressable
            key={n.id}
            onPress={() => open(n)}
            accessibilityRole="button"
            accessibilityLabel={`${labelOf(n)}${n.read ? '' : `, ${t('communityApp.notifications.unread')}`}`}
            testID={`community-notification-${n.id}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              padding: spacing.md,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: colors.borderLight,
              backgroundColor: colors.bgSurfaceAlt,
            }}>
            <View style={{flex: 1, gap: spacing.xs}}>
              <Text
                style={{
                  fontSize: 14.5,
                  fontWeight: n.read ? '400' : '700',
                  color: colors.textPrimary,
                }}>
                {labelOf(n)}
              </Text>
              {n.type === 'message.created' && n.fromPseudonym ? (
                <Text style={{fontSize: 12, color: colors.textMuted}}>@{n.fromPseudonym}</Text>
              ) : null}
              <Text style={{fontSize: 12, color: colors.textMuted}}>
                {formatListTime(n.createdAt, i18n.language)}
              </Text>
            </View>
            {!n.read ? (
              <View
                style={{width: 10, height: 10, borderRadius: radii.round, backgroundColor: colors.bluePrimary}}
                testID={`community-notification-unread-${n.id}`}
              />
            ) : null}
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <CommunityGate onOpenProfile={onOpenProfile} onOpenSubscription={onOpenSubscription}>
      <ScrollView
        contentContainerStyle={{padding: spacing.lg, gap: spacing.md}}
        refreshControl={
          <RefreshControl
            refreshing={state.status === 'loading' && state.data !== null}
            onRefresh={() => void communityNotificationsStore.load({force: true})}
          />
        }
        testID="screen-community-notifications">
        {renderBody()}
      </ScrollView>
    </CommunityGate>
  );
}
