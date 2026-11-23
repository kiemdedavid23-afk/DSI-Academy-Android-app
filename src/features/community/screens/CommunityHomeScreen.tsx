/**
 * Accueil de la Communauté : les entrées livrées (discussions, espaces,
 * activité, trouver un membre, contacts, notifications, Support DSI,
 * réglages). Les appels s'ajoutent au lot C7.
 */

import React, {useEffect, useSyncExternalStore} from 'react';
import {Pressable, ScrollView, View} from 'react-native';
import {Icon, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {CommunityGate} from '../components/CommunityGate';
import {useVisiblePolling} from '../hooks/useVisiblePolling';
import {
  communityNotificationsStore,
  refreshNotifications,
  unreadOf,
} from '../store/communityNotificationsStore';
import {contactsStore} from '../store/contactsStore';

const NOTIFICATIONS_POLL_MS = 30_000;

type Props = {
  onOpenChats: () => void;
  onOpenSpaces: () => void;
  onOpenActivity: () => void;
  onOpenNotifications: () => void;
  onOpenSupport: () => void;
  onOpenSettings: () => void;
  onOpenFind: () => void;
  onOpenContacts: () => void;
  onOpenProfile: () => void;
  onOpenSubscription: () => void;
};

function Entry({
  label,
  badge,
  onPress,
  testID,
}: {
  label: string;
  badge?: number;
  onPress: () => void;
  testID: string;
}) {
  const {colors, radii, spacing} = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: colors.bgSurfaceAlt,
      }}>
      <Text style={{flex: 1, fontSize: 16, fontWeight: '600', color: colors.textPrimary}}>
        {label}
      </Text>
      {badge ? (
        <View
          style={{
            minWidth: 24,
            paddingHorizontal: spacing.sm,
            borderRadius: radii.pill,
            backgroundColor: colors.bluePrimary,
            alignItems: 'center',
          }}>
          <Text style={{fontSize: 12, fontWeight: '700', color: colors.textOnPrimary}}>
            {badge}
          </Text>
        </View>
      ) : null}
      <Icon name="ChevronRightIcon" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export function CommunityHomeScreen({
  onOpenChats,
  onOpenSpaces,
  onOpenActivity,
  onOpenNotifications,
  onOpenSupport,
  onOpenSettings,
  onOpenFind,
  onOpenContacts,
  onOpenProfile,
  onOpenSubscription,
}: Props) {
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();
  const contacts = useSyncExternalStore(
    cb => contactsStore.subscribe(() => cb()),
    () => contactsStore.getState(),
  );
  const notifications = useSyncExternalStore(
    cb => communityNotificationsStore.subscribe(() => cb()),
    () => communityNotificationsStore.getState(),
  );
  useEffect(() => {
    void contactsStore.load();
    void communityNotificationsStore.load();
  }, []);
  // Le Worker n'a pas de compteur de non lus : relecture lente au premier plan.
  useVisiblePolling(refreshNotifications, NOTIFICATIONS_POLL_MS);

  return (
    <CommunityGate onOpenProfile={onOpenProfile} onOpenSubscription={onOpenSubscription}>
      <ScrollView
        contentContainerStyle={{padding: spacing.lg, gap: spacing.md}}
        testID="screen-community-home">
        <Text style={{fontSize: 13, color: colors.textMuted}}>{t('communityApp.banner')}</Text>
        <Entry
          label={t('communityApp.titles.chats')}
          onPress={onOpenChats}
          testID="community-entry-chats"
        />
        <Entry
          label={t('communityApp.titles.spaces')}
          onPress={onOpenSpaces}
          testID="community-entry-spaces"
        />
        <Entry
          label={t('communityApp.titles.activity')}
          onPress={onOpenActivity}
          testID="community-entry-activity"
        />
        <Entry
          label={t('communityApp.titles.notifications')}
          badge={unreadOf(notifications.data).length}
          onPress={onOpenNotifications}
          testID="community-entry-notifications"
        />
        <Entry
          label={t('communityApp.titles.support')}
          onPress={onOpenSupport}
          testID="community-entry-support"
        />
        <Entry
          label={t('communityApp.titles.find')}
          onPress={onOpenFind}
          testID="community-entry-find"
        />
        <Entry
          label={t('communityApp.titles.contacts')}
          badge={contacts.data?.incoming.length ?? 0}
          onPress={onOpenContacts}
          testID="community-entry-contacts"
        />
        <Entry
          label={t('communityApp.titles.settings')}
          onPress={onOpenSettings}
          testID="community-entry-settings"
        />
      </ScrollView>
    </CommunityGate>
  );
}
