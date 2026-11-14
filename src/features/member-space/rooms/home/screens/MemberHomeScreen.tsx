/**
 * Accueil membre — fidélité MemberHomeScreen.css + DashboardCards + JSX site.
 * Carte verre (glass), Bonjour + prénom séparés, solde Fraunces, badge abonnement,
 * total gagné, hero, 3 actions rapides, feuille Continuer / Activité / Favoris.
 * Boutons Continuer vides naviguent vers piles Academy (placeholders).
 */

import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Text, useTheme, Icon} from '@shared/designsystem';
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

type Nav = NativeStackNavigationProp<MemberSpaceStackParamList>;

type QuickRoom = 'MemberWithdrawals' | 'MemberReferral' | 'MemberDsiHoldings';

const QUICK: {screen: QuickRoom; labelKey: string; icon: 'WithdrawalsIcon' | 'ReferralIcon' | 'DsiIcon'}[] = [
  {screen: 'MemberWithdrawals', labelKey: 'rooms.withdrawals', icon: 'WithdrawalsIcon'},
  {screen: 'MemberReferral', labelKey: 'rooms.referral', icon: 'ReferralIcon'},
  {screen: 'MemberDsiHoldings', labelKey: 'rooms.dsiHoldings', icon: 'DsiIcon'},
];

function HomeSkeleton({colors, glass}: {colors: any; glass: any}) {
  const block = (w: number | string, h: number, r = 6) => (
    <View
      style={{
        width: w as any,
        height: h,
        borderRadius: r,
        backgroundColor: colors.skeletonBase,
      }}
    />
  );
  return (
    <View style={{padding: 16, gap: 16}} testID="home-skeleton">
      <View style={[styles.glassCard, {backgroundColor: glass.bg, borderColor: glass.border, padding: 16, gap: 12}]}>
        {block(64, 12)}
        {block(140, 24)}
        {block(110, 11)}
        {block(160, 40)}
        {block(210, 26, 999)}
        {block('100%', 12)}
      </View>
      <View style={{flexDirection: 'row', gap: 10}}>
        {[0, 1, 2].map(i => (
          <View
            key={i}
            style={[
              styles.glassCard,
              {
                flex: 1,
                backgroundColor: glass.bg,
                borderColor: glass.border,
                alignItems: 'center',
                padding: 12,
                gap: 8,
              },
            ]}>
            {block(24, 24, 12)}
            {block(56, 11)}
          </View>
        ))}
      </View>
      {[0, 1].map(i => (
        <View
          key={i}
          style={[
            styles.glassCard,
            {backgroundColor: glass.bg, borderColor: glass.border, padding: 16, gap: 12},
          ]}>
          {block(90, 14)}
          {block('100%', 44)}
        </View>
      ))}
    </View>
  );
}

export function MemberHomeScreen() {
  const {t, i18n} = useTranslation();
  const {colors, spacing, radii, glass, elevation} = useTheme();
  const navigation = useNavigation<Nav>();
  const {height: screenH} = useWindowDimensions();
  const [continueEntry, setContinueEntry] = useState<ContinueEntry | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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

  const load = useCallback(async () => {
    await loadHomeDashboard();
    try {
      const entry = await continueStore.get();
      setContinueEntry(entry);
    } catch {
      setContinueEntry(null);
    }
    try {
      const favs =
        typeof (favoritesStore as any).list === 'function'
          ? (favoritesStore as any).list()
          : (favoritesStore as any).getState?.()?.data ?? [];
      setFavorites(Array.isArray(favs) ? favs.slice(0, 5) : []);
    } catch {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const loading =
    (profile.status === 'loading' || balance.status === 'loading') &&
    !profile.data &&
    !balance.data;
  const error =
    profile.status === 'error' || balance.status === 'error'
      ? profile.error ?? balance.error ?? t('common.error')
      : null;

  // Offline banner: si les stores ont des données en cache et un statut error réseau
  // (pas de NetInfo dans ce lot — détection via statut d'erreur + données présentes)
  const showOfflineBanner =
    !!error &&
    !!(profile.data || balance.data) &&
    typeof error === 'string' &&
    /réseau|network|offline|connexion/i.test(String(error));

  const prenom =
    profile.data?.prenom ||
    profile.data?.nom ||
    t('dashboard.welcomeDefault');

  const sub = computeSubscription(subscription.data);
  const subState: 'active' | 'expired' | 'none' = sub.state;
  const subEndIso =
    sub.state === 'active' || sub.state === 'expired'
      ? sub.fin.toISOString()
      : null;
  const subPercent = sub.state === 'active' ? sub.percent : 0;

  const formatDate = (iso?: string | null) => {
    if (!iso) {
      return null;
    }
    try {
      const locale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';
      return new Date(iso).toLocaleDateString(locale);
    } catch {
      return null;
    }
  };

  const soldeValue = balance.data?.soldeDsiActuel ?? 0;
  const totalValue = balance.data?.totalDsiGagnes ?? 0;

  const badgeLabel = {
    active: t('drawer.badgeActive'),
    expired: t('drawer.badgeExpired'),
    none: t('drawer.badgeNone'),
  }[subState];

  const finTexte =
    subEndIso && subState !== 'none'
      ? t('home.subscriptionEnd', {date: formatDate(subEndIso) ?? ''})
      : null;

  const heroMinH = Math.max(416, screenH - 64 - 72 - 24 - 48);

  const go = (screen: QuickRoom) => {
    navigation.navigate(screen);
  };

  // Continuer vide → piles Academy (placeholders tant que les maisons ne sont pas branchées)
  const goLibrary = () => {
    // navigation vers tab Academy si possible
    const parent = navigation.getParent?.();
    if (parent) {
      parent.navigate('Academy' as never);
    }
  };
  const goFormations = () => {
    const parent = navigation.getParent?.();
    if (parent) {
      parent.navigate('Academy' as never);
    }
  };

  const recent = (withdrawals.data ?? []).slice(0, 5);

  if (loading) {
    return <HomeSkeleton colors={colors} glass={glass} />;
  }

  return (
    <View style={styles.fill} testID="member-home">
      {showOfflineBanner ? (
        <View
          style={[
            styles.offlineBanner,
            {backgroundColor: colors.warningBg, borderBottomColor: colors.warningBorder},
          ]}
          testID="offline-banner">
          <Text style={{color: colors.warning, fontSize: 13, fontWeight: '600'}}>
            {t('home.offlineBanner', {
              defaultValue: 'Hors ligne — dernières données en cache',
            })}
          </Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={{paddingBottom: 24}}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {error && !showOfflineBanner ? (
          <View
            style={[
              styles.glassCard,
              {
                margin: 16,
                padding: 24,
                backgroundColor: glass.bg,
                borderColor: glass.border,
                alignItems: 'center',
              },
            ]}>
            <Text style={{color: colors.textSecondary, textAlign: 'center'}}>
              {String(error)}
            </Text>
            <Pressable
              onPress={load}
              style={[
                styles.retryBtn,
                {
                  backgroundColor: colors.bgDarkPremium,
                  borderColor: colors.goldBorder,
                },
              ]}
              accessibilityRole="button">
              <Text style={{color: colors.goldPrestige, fontWeight: '600'}}>
                {t('common.retry')}
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Hero */}
            <View style={[styles.hero, {minHeight: heroMinH, paddingHorizontal: 16, paddingTop: 16}]}>
              {/* Carte verre greeting */}
              <View
                style={[
                  styles.glassCard,
                  {
                    backgroundColor: glass.bg,
                    borderColor: glass.border,
                    borderRadius: radii.lg,
                    paddingVertical: 16,
                    paddingHorizontal: 17.6,
                    // glass shadow
                    shadowColor: glass.shadowColor,
                    shadowOffset: {width: 0, height: 8},
                    shadowOpacity: 0.25,
                    shadowRadius: 12,
                    elevation: elevation.card,
                  },
                ]}>
                <View style={{marginBottom: 14.4, gap: 2}}>
                  <Text
                    style={{
                      fontFamily: 'Fraunces-MediumItalic',
                      fontSize: 15.2,
                      fontWeight: '500',
                      fontStyle: 'italic',
                      color: colors.homeGold,
                    }}>
                    {t('drawer.hello')}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Fraunces-Bold',
                      fontSize: 24,
                      fontWeight: '700',
                      lineHeight: 28.8,
                      color: colors.textPrimary,
                    }}>
                    {prenom}
                  </Text>
                </View>

                <View style={{gap: 2}}>
                  <Text
                    style={{
                      fontSize: 12.48,
                      fontWeight: '600',
                      color: colors.textSecondary,
                    }}>
                    {t('home.balanceTitle')}
                  </Text>
                  <View style={{flexDirection: 'row', alignItems: 'baseline', gap: 6.4}}>
                    <Text
                      style={{
                        fontFamily: 'Fraunces-Bold',
                        fontSize: 38.4,
                        fontWeight: '700',
                        lineHeight: 42,
                        color: colors.textPrimary,
                        fontVariant: ['lining-nums'],
                      }}>
                      {soldeValue}
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'Fraunces-MediumItalic',
                        fontSize: 16.8,
                        fontWeight: '500',
                        fontStyle: 'italic',
                        color: colors.homeGold,
                      }}>
                      DSI
                    </Text>
                  </View>
                </View>

                <View style={{marginTop: 12.8, gap: 8.8}}>
                  <View
                    style={[
                      styles.badge,
                      subState === 'active' && {
                        backgroundColor: colors.goldLight,
                        borderWidth: 1,
                        borderColor: colors.goldBorder,
                      },
                      subState === 'expired' && {
                        backgroundColor: colors.badgeExpiredBg,
                      },
                      subState === 'none' && {
                        backgroundColor: colors.badgeNoneBg,
                      },
                    ]}>
                    <Text
                      style={{
                        fontSize: 12.48,
                        fontWeight: '600',
                        color:
                          subState === 'active'
                            ? colors.badgeActiveText
                            : subState === 'expired'
                              ? colors.badgeExpiredText
                              : colors.badgeNoneText,
                      }}>
                      {badgeLabel}
                      {finTexte ? ` · ${finTexte}` : ''}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      width: '100%',
                    }}>
                    <Text style={{fontSize: 13.12, color: colors.textSecondary}}>
                      {t('home.totalEarnedTitle')}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13.12,
                        fontWeight: '700',
                        color: colors.textPrimary,
                      }}>
                      {totalValue} DSI
                    </Text>
                  </View>
                </View>
              </View>

              {/* 3 actions rapides en bas du hero */}
              <View style={[styles.actions, {marginTop: 'auto'}]}>
                {QUICK.map(q => (
                  <Pressable
                    key={q.screen}
                    onPress={() => go(q.screen)}
                    style={[
                      styles.action,
                      {
                        backgroundColor: glass.bg,
                        borderColor: glass.border,
                        borderRadius: radii.lg,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={t(q.labelKey)}
                    android_ripple={{color: colors.blueLight}}
                    testID={`home-quick-${q.screen}`}>
                    <View style={{width: 24, height: 24}}>
                      <Icon name={q.icon} size={24} color={colors.textPrimary} />
                    </View>
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: '600',
                        textAlign: 'center',
                        lineHeight: 15,
                        color: colors.textPrimary,
                      }}
                      numberOfLines={2}>
                      {t(q.labelKey)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Feuille de cartes */}
            <View style={{paddingHorizontal: 16, gap: 16, marginTop: 16}}>
              {/* Continuer */}
              <View
                style={[
                  styles.glassCard,
                  {
                    backgroundColor: glass.bg,
                    borderColor: glass.border,
                    borderRadius: radii.lg,
                    padding: 16,
                  },
                ]}>
                <Text
                  style={{
                    fontFamily: 'Fraunces-Bold',
                    fontSize: 16.8,
                    fontWeight: '700',
                    color: colors.textPrimary,
                    marginBottom: 12,
                  }}>
                  {t('premium.continueTitle')}
                </Text>
                {!continueEntry ? (
                  <>
                    <Text style={{color: colors.textSecondary, fontSize: 14}}>
                      {t('premium.continueEmpty')}
                    </Text>
                    <View style={{flexDirection: 'row', gap: 8, marginTop: 12}}>
                      <Pressable
                        onPress={goLibrary}
                        style={[
                          styles.btnAction,
                          {
                            backgroundColor: colors.bgSurfaceAlt,
                            borderColor: colors.borderLight,
                            flex: 1,
                          },
                        ]}
                        accessibilityRole="button"
                        testID="continue-library">
                        <Text
                          style={{
                            color: colors.textPrimary,
                            fontWeight: '600',
                            fontSize: 13.6,
                          }}>
                          {t('houses.library')}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={goFormations}
                        style={[
                          styles.btnAction,
                          {
                            backgroundColor: colors.bgDarkPremium,
                            borderColor: colors.goldBorder,
                            flex: 1,
                          },
                        ]}
                        accessibilityRole="button"
                        testID="continue-formations">
                        <Text
                          style={{
                            color: colors.goldPrestige,
                            fontWeight: '600',
                            fontSize: 13.6,
                          }}>
                          {t('houses.formations')}
                        </Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <View style={{gap: 8}}>
                    <Text style={{color: colors.textPrimary, fontWeight: '600'}}>
                      {continueEntry.title}
                    </Text>
                    {continueEntry.house ? (
                      <Text style={{color: colors.textSecondary, fontSize: 13}}>
                        {continueEntry.house}
                      </Text>
                    ) : null}
                    {typeof continueEntry.progress === 'number' ? (
                      <View
                        style={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: colors.bgSurfaceAlt,
                          overflow: 'hidden',
                        }}>
                        <View
                          style={{
                            width: `${Math.min(100, continueEntry.progress)}%`,
                            height: '100%',
                            backgroundColor: colors.goldPrestige,
                          }}
                        />
                      </View>
                    ) : null}
                    <Pressable
                      onPress={() => {
                        /* placeholder: ouvrir le contenu */
                      }}
                      style={[
                        styles.btnAction,
                        {
                          backgroundColor: colors.bgDarkPremium,
                          borderColor: colors.goldBorder,
                          alignSelf: 'flex-start',
                          marginTop: 4,
                        },
                      ]}
                      accessibilityRole="button">
                      <Text
                        style={{
                          color: colors.goldPrestige,
                          fontWeight: '600',
                          fontSize: 13.6,
                        }}>
                        {t('premium.continueCta')}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Activité récente */}
              <View
                style={[
                  styles.glassCard,
                  {
                    backgroundColor: glass.bg,
                    borderColor: glass.border,
                    borderRadius: radii.lg,
                    padding: 16,
                  },
                ]}>
                <Text
                  style={{
                    fontFamily: 'Fraunces-Bold',
                    fontSize: 16.8,
                    fontWeight: '700',
                    color: colors.textPrimary,
                    marginBottom: 12,
                  }}>
                  {t('home.recentActivity', {defaultValue: 'Activité récente'})}
                </Text>
                {recent.length === 0 ? (
                  <Text style={{color: colors.textSecondary, fontSize: 13.6}}>
                    {t('home.activityEmpty', {
                      defaultValue: 'Aucune activité récente',
                    })}
                  </Text>
                ) : (
                  recent.map((w: any, idx: number) => (
                    <View
                      key={w.id ?? idx}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        marginBottom: 10,
                      }}>
                      <Text
                        style={{flex: 1, color: colors.textPrimary, fontSize: 13.6}}
                        numberOfLines={1}>
                        {w.libelle || w.label || t('rooms.withdrawals')}
                      </Text>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 12,
                        }}>
                        {formatDate(w.date || w.createdAt) ?? ''}
                      </Text>
                      <Text
                        style={{
                          fontWeight: '700',
                          color:
                            w.statut === 'traite' || w.status === 'processed'
                              ? colors.success
                              : colors.textPrimary,
                          fontSize: 13.6,
                        }}>
                        {w.montant ?? w.amount ?? ''}{' '}
                        {w.statut === 'traite' || w.status === 'processed'
                          ? '✓'
                          : ''}
                      </Text>
                    </View>
                  ))
                )}
              </View>

              {/* Favoris */}
              <View
                style={[
                  styles.glassCard,
                  {
                    backgroundColor: glass.bg,
                    borderColor: glass.border,
                    borderRadius: radii.lg,
                    padding: 16,
                  },
                ]}>
                <Text
                  style={{
                    fontFamily: 'Fraunces-Bold',
                    fontSize: 16.8,
                    fontWeight: '700',
                    color: colors.textPrimary,
                    marginBottom: 12,
                  }}>
                  {t('home.favorites', {defaultValue: 'Favoris'})}
                </Text>
                {favorites.length === 0 ? (
                  <Text style={{color: colors.textSecondary, fontSize: 13.6}}>
                    {t('home.favoritesEmpty', {
                      defaultValue: 'Aucun favori pour le moment',
                    })}
                  </Text>
                ) : (
                  favorites.map((f, idx) => (
                    <View
                      key={f.id ?? idx}
                      style={{
                        paddingVertical: 8,
                        borderBottomWidth: idx < favorites.length - 1 ? StyleSheet.hairlineWidth : 0,
                        borderBottomColor: colors.borderLight,
                      }}>
                      <Text
                        style={{
                          color: colors.textPrimary,
                          fontWeight: '600',
                          fontSize: 14,
                        }}
                        numberOfLines={1}>
                        {f.title}
                      </Text>
                      {f.subtitle ? (
                        <Text
                          style={{color: colors.textSecondary, fontSize: 12.5}}
                          numberOfLines={1}>
                          {f.subtitle}
                        </Text>
                      ) : null}
                    </View>
                  ))
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1, backgroundColor: 'transparent'},
  offlineBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  hero: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 16,
  },
  glassCard: {
    borderWidth: 1,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 9999,
  },
  actions: {
    flexDirection: 'row',
    gap: 9.6,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderWidth: 1,
  },
  btnAction: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
  },
});
