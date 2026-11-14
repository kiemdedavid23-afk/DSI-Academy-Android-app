/**
 * Accueil membre — hero, actions, continuer, activité, favoris.
 */

import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  ImageBackground,
  StyleSheet,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Text, useTheme, ErrorState, LoadingState} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {
  memberProfileStore,
  memberSubscriptionStore,
  continueStore,
  favoritesStore,
  type ContinueEntry,
  type FavoriteItem,
} from '@shared/store';
import {computeSubscription} from '@core/utils/subscription';
import {useSyncExternalStore} from 'react';
import {
  loadHomeDashboard,
  memberBalanceStore,
  memberWithdrawalsStore,
} from '../store/homeDashboardStore';
import type {MemberSpaceStackParamList} from '@app/navigation/house-stacks/MemberSpaceStack';
import {MemberHeader} from '@features/member-space/shell/components/MemberHeader';
import {
  MemberDrawer,
  type MemberRoomId,
} from '@features/member-space/shell/components/MemberDrawer';

const BG = require('@assets/images/member-bg.webp');

type Nav = NativeStackNavigationProp<MemberSpaceStackParamList>;

export function MemberHomeScreen() {
  const {t, i18n} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const navigation = useNavigation<Nav>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [continueEntry, setContinueEntry] = useState<ContinueEntry | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  const profile = useSyncExternalStore(
    cb => memberProfileStore.subscribe(() => cb()),
    () => memberProfileStore.getState(),
    () => memberProfileStore.getState(),
  );
  const balance = useSyncExternalStore(
    cb => memberBalanceStore.subscribe(() => cb()),
    () => memberBalanceStore.getState(),
    () => memberBalanceStore.getState(),
  );
  const subscription = useSyncExternalStore(
    cb => memberSubscriptionStore.subscribe(() => cb()),
    () => memberSubscriptionStore.getState(),
    () => memberSubscriptionStore.getState(),
  );
  const withdrawals = useSyncExternalStore(
    cb => memberWithdrawalsStore.subscribe(() => cb()),
    () => memberWithdrawalsStore.getState(),
    () => memberWithdrawalsStore.getState(),
  );

  const reloadLocal = useCallback(async () => {
    setContinueEntry(await continueStore.get());
    setFavorites((await favoritesStore.list()).slice(0, 5));
  }, []);

  useEffect(() => {
    void loadHomeDashboard();
    void reloadLocal();
  }, [reloadLocal]);

  const onRefresh = useCallback(async () => {
    await loadHomeDashboard({force: true});
    await reloadLocal();
  }, [reloadLocal]);

  const navigateRoom = useCallback(
    (room: MemberRoomId) => {
      const map: Record<MemberRoomId, keyof MemberSpaceStackParamList> = {
        home: 'MemberHome',
        subscription: 'MemberSubscription',
        'dsi-holdings': 'MemberDsiHoldings',
        withdrawals: 'MemberWithdrawals',
        payments: 'MemberPayments',
        referral: 'MemberReferral',
        notifications: 'MemberNotifications',
        profile: 'MemberProfile',
        settings: 'MemberSettings',
      };
      const target = map[room];
      if (target === 'MemberHome') {
        return;
      }
      navigation.navigate(target);
    },
    [navigation],
  );

  const profileEssentialFailed =
    profile.status === 'error' && profile.data == null;

  if (profile.status === 'loading' && profile.data == null) {
    return (
      <View style={[styles.fill, {backgroundColor: colors.bgApp}]}>
        <MemberHeader
          showMenu
          onOpenDrawer={() => setDrawerOpen(true)}
          onOpenNotifications={() => navigateRoom('notifications')}
        />
        <LoadingState accessibilityLabel={t('common.loading')} fill />
        <MemberDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          activeRoom="home"
          onNavigateRoom={navigateRoom}
        />
      </View>
    );
  }

  if (profileEssentialFailed) {
    return (
      <View style={[styles.fill, {backgroundColor: colors.bgApp}]}>
        <MemberHeader
          showMenu
          onOpenDrawer={() => setDrawerOpen(true)}
          onOpenNotifications={() => navigateRoom('notifications')}
        />
        <ErrorState
          title={t('profile.errorTitle')}
          message={profile.error ?? t('common.retry')}
          onRetry={() => void loadHomeDashboard({force: true})}
          retryLabel={t('common.retry')}
        />
        <MemberDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          activeRoom="home"
          onNavigateRoom={navigateRoom}
        />
      </View>
    );
  }

  const prenom = profile.data?.prenom?.trim();
  const hello = prenom
    ? t('dashboard.welcome', {name: prenom})
    : t('dashboard.welcomeDefault');
  const solde = balance.data?.soldeDsiActuel ?? 0;
  const totalGagnes = balance.data?.totalDsiGagnes ?? 0;
  const sub = computeSubscription(subscription.data);
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';

  let badge = t('drawer.badgeNone');
  if (sub.state === 'active') {
    badge = `${t('drawer.badgeActive')} · ${t('drawer.expiresOn', {
      date: sub.fin.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    })}`;
  } else if (sub.state === 'expired') {
    badge = t('drawer.badgeExpired');
  }

  const retraits = (withdrawals.data?.retraits ?? []).slice(0, 5);
  const refreshing =
    profile.status === 'loading' ||
    balance.status === 'loading' ||
    subscription.status === 'loading';

  return (
    <View style={[styles.fill, {backgroundColor: colors.bgApp}]}>
      <MemberHeader
        showMenu
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenNotifications={() => navigateRoom('notifications')}
      />
      <ImageBackground
        source={BG}
        style={styles.fill}
        imageStyle={{opacity: 0.35}}
        accessibilityElementsHidden
        importantForAccessibility="no">
        <ScrollView
          testID="screen-member-home"
          contentContainerStyle={{padding: spacing.lg, paddingBottom: spacing.xxxl}}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
          }>
          <View style={{marginBottom: spacing.xl}}>
            <Text variant="caption" color="secondary">
              {t('drawer.hello')}
            </Text>
            <Text variant="display" color="primary">
              {hello}
            </Text>
            <Text variant="caption" color="secondary" style={{marginTop: spacing.sm}}>
              {t('dashboard.matricule')}
            </Text>
            <Text variant="display" color="primary" style={{fontFamily: undefined}}>
              {solde.toLocaleString(locale)} DSI
            </Text>
            <Text variant="caption" color="secondary" style={{marginTop: spacing.xs}}>
              {badge}
            </Text>
            <Text variant="body" color="secondary" style={{marginTop: spacing.sm}}>
              {t('dashboard.subtitle')} · {totalGagnes.toLocaleString(locale)} DSI
            </Text>
          </View>

          <View style={[styles.row, {gap: spacing.sm, marginBottom: spacing.lg}]}>
            {(
              [
                ['withdrawals', 'rooms.withdrawals'],
                ['referral', 'rooms.referral'],
                ['dsi-holdings', 'rooms.dsiHoldings'],
              ] as const
            ).map(([room, key]) => (
              <Pressable
                key={room}
                onPress={() => navigateRoom(room)}
                style={[
                  styles.quick,
                  {
                    backgroundColor: colors.bgSurface,
                    borderRadius: radii.md,
                    padding: spacing.md,
                    flex: 1,
                    minHeight: 48,
                  },
                ]}
                accessibilityRole="button">
                <Text variant="label" color="primary" numberOfLines={2}>
                  {t(key)}
                </Text>
              </Pressable>
            ))}
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.lg,
                padding: spacing.lg,
                marginBottom: spacing.lg,
              },
            ]}>
            <Text variant="title" color="primary">
              {t('premium.continueTitle')}
            </Text>
            {!continueEntry ? (
              <>
                <Text variant="body" color="secondary" style={{marginTop: spacing.sm}}>
                  {t('premium.continueEmpty')}
                </Text>
                <View style={[styles.row, {gap: spacing.sm, marginTop: spacing.md}]}>
                  <Pressable
                    onPress={() => {}}
                    style={[styles.chip, {backgroundColor: colors.blueLight, borderRadius: radii.md}]}>
                    <Text variant="label" color="link">
                      {t('houses.library')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {}}
                    style={[styles.chip, {backgroundColor: colors.goldLight, borderRadius: radii.md}]}>
                    <Text variant="label" color="primary">
                      {t('houses.formations')}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={{marginTop: spacing.sm}}>
                <Text variant="body" color="primary">
                  {continueEntry.title}
                </Text>
                <Text variant="caption" color="secondary">
                  {t(`houses.${continueEntry.house}`, {
                    defaultValue: continueEntry.house,
                  })}
                </Text>
              </View>
            )}
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.lg,
                padding: spacing.lg,
                marginBottom: spacing.lg,
              },
            ]}>
            <Text variant="title" color="primary">
              {t('dashboard.recentActivity')}
            </Text>
            {retraits.length === 0 ? (
              <Text variant="body" color="secondary" style={{marginTop: spacing.sm}}>
                {t('dashboard.noActivity')}
              </Text>
            ) : (
              retraits.map(r => {
                const statusLabel =
                  r.statut === 'en_attente'
                    ? t('dashboard.withdrawalStatus.en_attente')
                    : r.statut === 'traite'
                      ? t('dashboard.withdrawalStatus.traite')
                      : r.statut;
                return (
                  <View
                    key={r.idRetrait}
                    style={[styles.actRow, {marginTop: spacing.md}]}>
                    <View style={{flex: 1}}>
                      <Text variant="body" color="primary">
                        {r.montantDsiNet} DSI
                      </Text>
                      <Text variant="caption" color="secondary">
                        {r.dateDemande
                          ? new Date(r.dateDemande).toLocaleDateString(locale)
                          : ''}
                      </Text>
                    </View>
                    <Text variant="caption" color="secondary">
                      {statusLabel}
                    </Text>
                  </View>
                );
              })
            )}
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.lg,
                padding: spacing.lg,
              },
            ]}>
            <Text variant="title" color="primary">
              {t('premium.favoritesTitle')}
            </Text>
            {favorites.length === 0 ? (
              <Text variant="body" color="secondary" style={{marginTop: spacing.sm}}>
                {t('premium.favoritesEmpty')}
              </Text>
            ) : (
              favorites.map(f => (
                <Text
                  key={f.id}
                  variant="body"
                  color="primary"
                  style={{marginTop: spacing.sm}}>
                  {f.title}
                </Text>
              ))
            )}
          </View>
        </ScrollView>
      </ImageBackground>
      <MemberDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeRoom="home"
        onNavigateRoom={navigateRoom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1},
  row: {flexDirection: 'row', alignItems: 'stretch'},
  quick: {justifyContent: 'center'},
  card: {},
  chip: {paddingHorizontal: 12, paddingVertical: 10, minHeight: 44},
  actRow: {flexDirection: 'row', alignItems: 'center'},
});
