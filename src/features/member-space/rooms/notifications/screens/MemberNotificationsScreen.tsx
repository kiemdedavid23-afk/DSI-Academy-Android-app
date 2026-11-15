/**
 * Boîte de notifications In-App (L3d).
 */

import React, {useCallback, useEffect, useSyncExternalStore} from 'react';
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  AppState,
} from 'react-native';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {
  notificationsStore,
  connectivityStore,
  type AppNotification,
} from '@shared/store';
import type {ColorTokens} from '@shared/designsystem';

function formatNotifDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function badgeMeta(
  n: AppNotification,
  colors: ColorTokens,
): {labelKey: string; bg: string; fg: string} {
  const type = (n.type || '').toLowerCase();
  if (type === 'maintenance') {
    return {
      labelKey: 'notifications.badge.maintenance',
      bg: colors.warningBg,
      fg: colors.warningText,
    };
  }
  if (type === 'urgent' || type === 'alerte') {
    return {
      labelKey: 'notifications.badge.urgent',
      bg: colors.errorBg,
      fg: colors.errorTitle,
    };
  }
  if (n.origin === 'admin') {
    return {
      labelKey: 'notifications.badge.announce',
      bg: colors.infoBg,
      fg: colors.info,
    };
  }
  if (n.origin === 'event') {
    return {
      labelKey: 'notifications.badge.activity',
      bg: colors.infoBg,
      fg: colors.info,
    };
  }
  return {
    labelKey: 'notifications.badge.default',
    bg: colors.bgSurfaceAlt,
    fg: colors.textSecondary,
  };
}

export function MemberNotificationsScreen() {
  const {t, i18n} = useTranslation();
  const {colors, glass} = useTheme();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';
  const online = useSyncExternalStore(
    connectivityStore.subscribe,
    () => connectivityStore.isOnline(),
    () => true,
  );
  const st = useSyncExternalStore(
    notificationsStore.subscribe,
    () => notificationsStore.getState(),
  );

  const refresh = useCallback(() => {
    void notificationsStore.refresh();
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const renderItem = ({item}: {item: AppNotification}) => {
    const unread = item.status !== 'read';
    const badge = badgeMeta(item, colors);
    return (
      <Pressable
        onPress={() => {
          if (unread && online) void notificationsStore.markRead(item.id);
        }}
        disabled={!unread || !online}
        style={{
          backgroundColor: glass.bg,
          borderWidth: 1,
          borderColor: colors.borderLight,
          borderLeftWidth: 4,
          borderLeftColor: unread ? colors.goldPrestige : colors.notifBlue,
          borderRadius: 12,
          paddingVertical: 20,
          paddingHorizontal: 24,
          gap: 12,
          shadowColor: '#000000',
          shadowOpacity: 0.05,
          shadowRadius: 3,
          shadowOffset: {width: 0, height: 1},
          elevation: 1,
        }}
        testID={`notif-${item.id}`}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
          <View
            style={{
              paddingVertical: 4,
              paddingHorizontal: 10,
              borderRadius: 6,
              backgroundColor: badge.bg,
            }}>
            <Text
              style={{
                color: badge.fg,
                fontSize: 12,
                fontWeight: '700',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              }}>
              {t(badge.labelKey)}
            </Text>
          </View>
          <Text style={{fontSize: 12, fontWeight: '500', color: colors.textSlate500}}>
            {formatNotifDate(item.createdAt, locale)}
          </Text>
          {unread ? (
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: colors.goldPrestige,
                marginLeft: 'auto',
              }}
            />
          ) : null}
        </View>
        <Text style={{fontSize: 18, fontWeight: '700', color: colors.textPrimary}}>
          {item.title}
        </Text>
        {item.body ? (
          <Text
            style={{
              fontSize: 14,
              color: colors.textSlate700,
              lineHeight: 22.4,
            }}>
            {item.body}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  if (st.status === 'loading' && st.items.length === 0) {
    return (
      <View style={[styles.center, {padding: 40}]} testID="notifications-loading">
        <ActivityIndicator size="large" color={colors.notifBlue} />
        <Text style={{marginTop: 12, color: colors.textSecondary}}>
          {t('notifications.loading')}
        </Text>
      </View>
    );
  }

  if (
    (st.status === 'error' || st.status === 'unavailable') &&
    st.items.length === 0
  ) {
    return (
      <View
        style={{
          margin: 24,
          paddingVertical: 40,
          paddingHorizontal: 20,
          borderRadius: 12,
          backgroundColor: colors.errorBg,
          borderWidth: 1,
          borderColor: colors.errorBorder,
          alignItems: 'center',
          gap: 12,
        }}
        testID="notifications-error">
        <Text style={{fontSize: 18, fontWeight: '700', color: colors.errorTitle}}>
          {t('notifications.errorTitle')}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: colors.dangerPanelText,
            lineHeight: 21,
            textAlign: 'center',
            maxWidth: 500,
          }}>
          {st.errorMessage ? t(st.errorMessage) : t('notifications.emptyMessage')}
        </Text>
        <Pressable
          onPress={refresh}
          style={{
            marginTop: 8,
            backgroundColor: colors.notifBlue,
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 8,
          }}>
          <Text style={{color: colors.textOnPrimary, fontWeight: '600', fontSize: 14}}>
            {t('common.retry')}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      testID="screen-notifications"
      data={st.items}
      keyExtractor={i => i.id}
      contentContainerStyle={{padding: 24, gap: 16, paddingBottom: 40}}
      ItemSeparatorComponent={() => <View style={{height: 16}} />}
      ListHeaderComponent={
        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
            paddingBottom: 16,
            marginBottom: 8,
          }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: '700',
              color: colors.textPrimary,
              marginBottom: 8,
            }}>
            {t('notifications.title')}
          </Text>
          <Text style={{fontSize: 14, color: colors.textSlate500, marginTop: 0}}>
            {t('notifications.subtitle')}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View
          style={{
            paddingVertical: 40,
            paddingHorizontal: 20,
            borderRadius: 12,
            backgroundColor: glass.bg,
            borderWidth: 1,
            borderColor: glass.border,
            alignItems: 'center',
            gap: 12,
          }}>
          <Text style={{fontSize: 18, fontWeight: '700', color: colors.textPrimary}}>
            {t('notifications.emptyTitle')}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              textAlign: 'center',
              lineHeight: 21,
            }}>
            {t('notifications.emptyMessage')}
          </Text>
        </View>
      }
      ListFooterComponent={
        st.hasMore ? (
          <Pressable
            onPress={() => void notificationsStore.loadMore()}
            style={{padding: 16, alignItems: 'center'}}>
            <Text style={{color: colors.bluePrimary, fontWeight: '600'}}>
              {t('notifications.loadMore', {defaultValue: 'Charger plus'})}
            </Text>
          </Pressable>
        ) : undefined
      }
      refreshControl={
        <RefreshControl refreshing={st.status === 'loading'} onRefresh={refresh} />
      }
      renderItem={renderItem}
    />
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
});
