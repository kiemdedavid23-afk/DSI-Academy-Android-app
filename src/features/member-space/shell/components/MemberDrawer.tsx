/**
 * Tiroir Espace membre — fidélité MemberDrawer.css (519 lignes) + MemberDrawer.jsx.
 * Panneau 300 / max 86 %, fond bg-surface (clair en thème clair), ombre, padding 16/14.4,
 * gap 16, animations 200/250 ms (désactivées si reduceMotion).
 */

import React, {useEffect, useRef, useCallback} from 'react';
import {
  Modal,
  View,
  Pressable,
  ScrollView,
  Animated,
  StyleSheet,
  Linking,
  BackHandler,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import {Text, Icon, useTheme, type IconName} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {preferencesStore} from '@shared/preferences';
import {
  memberProfileStore,
  memberSubscriptionStore,
} from '@shared/store';
import {sessionStore} from '@core/session';
import {computeSubscription} from '@core/utils/subscription';
import {socialLinksStore} from '../store/socialLinksStore';
import {useSyncExternalStore} from 'react';

const APP_ICON = require('@assets/images/app-icon.png');

export type MemberRoomId =
  | 'home'
  | 'subscription'
  | 'dsi-holdings'
  | 'withdrawals'
  | 'payments'
  | 'referral'
  | 'notifications'
  | 'profile'
  | 'settings';

const ROOMS: {id: MemberRoomId; labelKey: string; icon: IconName}[] = [
  {id: 'home', labelKey: 'rooms.home', icon: 'HomeIcon'},
  {id: 'subscription', labelKey: 'rooms.subscription', icon: 'SubscriptionIcon'},
  {id: 'dsi-holdings', labelKey: 'rooms.dsiHoldings', icon: 'DsiIcon'},
  {id: 'withdrawals', labelKey: 'rooms.withdrawals', icon: 'WithdrawalsIcon'},
  {id: 'payments', labelKey: 'rooms.payments', icon: 'PaymentsIcon'},
  {id: 'referral', labelKey: 'rooms.referral', icon: 'ReferralIcon'},
  {id: 'notifications', labelKey: 'rooms.notifications', icon: 'BellIcon'},
  {id: 'profile', labelKey: 'rooms.profile', icon: 'UserIcon'},
  {id: 'settings', labelKey: 'rooms.settings', icon: 'SettingsIcon'},
];

type Props = {
  open: boolean;
  onClose: () => void;
  activeRoom: MemberRoomId;
  onNavigateRoom: (room: MemberRoomId) => void;
};

function initials(prenom: string, nom: string): string {
  const a = (prenom || '').trim().charAt(0);
  const b = (nom || '').trim().charAt(0);
  return `${a}${b}`.toUpperCase() || '?';
}

export function MemberDrawer({open, onClose, activeRoom, onNavigateRoom}: Props) {
  const {t, i18n} = useTranslation();
  const {colors, elevation, isDark: isDarkMode} = useTheme();
  const {width: screenW} = useWindowDimensions();
  const panelW = Math.min(300, Math.round(screenW * 0.86));

  const reduceMotion = useSyncExternalStore(
    preferencesStore.subscribe,
    () => preferencesStore.get().reduceMotion,
    () => preferencesStore.get().reduceMotion,
  );

  const profileState = useSyncExternalStore(
    cb => memberProfileStore.subscribe(() => cb()),
    () => memberProfileStore.getState(),
    () => memberProfileStore.getState(),
  );
  const subState = useSyncExternalStore(
    cb => memberSubscriptionStore.subscribe(() => cb()),
    () => memberSubscriptionStore.getState(),
    () => memberSubscriptionStore.getState(),
  );

  const slide = useRef(new Animated.Value(-panelW)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      if (reduceMotion) {
        slide.setValue(0);
        fade.setValue(1);
      } else {
        Animated.parallel([
          Animated.timing(fade, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(slide, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } else {
      if (reduceMotion) {
        slide.setValue(-panelW);
        fade.setValue(0);
      } else {
        Animated.parallel([
          Animated.timing(fade, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(slide, {
            toValue: -panelW,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [open, reduceMotion, slide, fade, panelW]);

  // Retour Android ferme d'abord le tiroir
  useEffect(() => {
    if (!open) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);

  const profile = profileState.data;
  const prenom = profile?.prenom ?? '';
  const nom = profile?.nom ?? '';
  const fullName = `${prenom} ${nom}`.trim() || t('drawer.member');

  const sub = computeSubscription(subState.data);
  const subViewState: 'active' | 'expired' | 'none' | 'loading' =
    subState.status === 'loading' && !subState.data
      ? 'loading'
      : sub.state;
  const subPercent = sub.state === 'active' ? sub.percent : 0;
  const subDays = sub.state === 'active' ? sub.days : null;
  const subEndIso =
    sub.state === 'active' || sub.state === 'expired'
      ? sub.fin.toISOString()
      : null;

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

  const onItem = useCallback(
    (id: MemberRoomId) => {
      onNavigateRoom(id);
      onClose();
    },
    [onNavigateRoom, onClose],
  );

  const onLogout = useCallback(async () => {
    onClose();
    await sessionStore.clearSessionAsync();
  }, [onClose]);

  const toggleTheme = useCallback(() => {
    const next = isDarkMode ? 'light' : 'dark';
    preferencesStore.setTheme(next);
  }, [isDarkMode]);

  const openSocial = (href: string) => {
    Linking.openURL(href).catch(() => {});
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={styles.overlay} testID="member-drawer">
        <Animated.View
          style={[
            styles.backdrop,
            {backgroundColor: colors.overlay, opacity: fade},
          ]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('drawer.close')}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.panel,
            {
              width: panelW,
              backgroundColor: colors.bgSurface,
              transform: [{translateX: slide}],
              ...Platform.select({
                android: {elevation: elevation.raised},
                default: {
                  shadowColor: elevation.shadowColor,
                  shadowOffset: {width: 4, height: 0},
                  shadowOpacity: 0.12,
                  shadowRadius: 12,
                },
              }),
            },
          ]}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            bounces={false}>
            {/* En-tête */}
            <View style={styles.head}>
              <Image
                source={APP_ICON}
                style={[
                  styles.headIcon,
                  {borderColor: colors.goldBorder},
                ]}
              />
              <View style={styles.headText}>
                <Text
                  style={[
                    styles.headTitle,
                    {
                      color: isDarkMode
                        ? colors.titleOnDark
                        : colors.royalStart,
                      fontFamily: 'Fraunces-Bold',
                    },
                  ]}
                  numberOfLines={1}>
                  DSI Academy
                </Text>
                <Text
                  style={[
                    styles.headSub,
                    {
                      color: colors.goldText,
                      fontFamily: 'Fraunces-MediumItalic',
                    },
                  ]}
                  numberOfLines={1}>
                  {t('houses.welcome.memberSpace')}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                style={[
                  styles.closeBtn,
                  {backgroundColor: colors.bgSurfaceAlt},
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('drawer.close')}
                testID="drawer-close"
                android_ripple={{color: colors.borderLight}}>
                <Icon name="XIcon" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Carte utilisateur */}
            <Pressable
              onPress={() => onItem('profile')}
              style={[
                styles.userCard,
                {backgroundColor: colors.bgSurfaceAlt},
              ]}
              accessibilityRole="button"
              accessibilityLabel={fullName}>
              <View
                style={[
                  styles.avatar,
                  {
                    borderColor: colors.goldBorder,
                  },
                ]}>
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: 14.4,
                    fontFamily: 'Manrope-Bold',
                  }}>
                  {initials(prenom, nom)}
                </Text>
              </View>
              <View style={styles.userText}>
                <Text
                  style={{
                    color: colors.goldText,
                    fontFamily: 'Fraunces-MediumItalic',
                    fontSize: 12.8,
                    fontWeight: '500',
                  }}>
                  {t('drawer.hello')}
                </Text>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontFamily: 'Fraunces-Bold',
                    fontSize: 15.7,
                    fontWeight: '700',
                  }}
                  numberOfLines={1}>
                  {fullName}
                </Text>
              </View>
            </Pressable>

            {/* Liste des pièces */}
            <View style={styles.menu}>
              {ROOMS.map(room => {
                const active = activeRoom === room.id;
                const iconColor = active
                  ? '#FFFFFF'
                  : colors.textSecondary;
                const labelColor = active
                  ? isDarkMode
                    ? colors.blueActive
                    : colors.bluePrimary
                  : colors.textSecondary;
                return (
                  <Pressable
                    key={room.id}
                    onPress={() => onItem(room.id)}
                    style={[
                      styles.item,
                      active && {
                        backgroundColor: colors.blueLight,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{selected: active}}
                    testID={`drawer-room-${room.id}`}
                    android_ripple={{color: colors.blueLight}}>
                    <View
                      style={[
                        styles.ico,
                        active && {
                          backgroundColor: isDarkMode
                            ? '#2563eb'
                            : colors.bluePrimary,
                        },
                      ]}>
                      <Icon
                        name={room.icon}
                        size={19}
                        color={iconColor}
                      />
                    </View>
                    <Text
                      style={[
                        styles.label,
                        {
                          color: labelColor,
                          fontWeight: active ? '700' : '500',
                        },
                      ]}
                      numberOfLines={1}>
                      {t(room.labelKey)}
                    </Text>
                    {active ? (
                      <View
                        style={[
                          styles.mark,
                          {backgroundColor: colors.goldPrestige},
                        ]}
                      />
                    ) : null}
                  </Pressable>
                );
              })}

              {/* Déconnexion */}
              <Pressable
                onPress={onLogout}
                style={[styles.item, {marginTop: 4.8}]}
                accessibilityRole="button"
                accessibilityLabel={t('drawer.logout')}
                testID="drawer-logout"
                android_ripple={{color: 'rgba(220,38,38,0.08)'}}>
                <View style={styles.ico}>
                  <Icon
                    name="LogoutIcon"
                    size={19}
                    color={isDarkMode ? '#f87171' : '#dc2626'}
                  />
                </View>
                <Text
                  style={[
                    styles.label,
                    {
                      color: isDarkMode ? '#f87171' : '#dc2626',
                      fontWeight: '500',
                    },
                  ]}>
                  {t('drawer.logout')}
                </Text>
              </Pressable>
            </View>

            {/* Carte abonnement */}
            <View style={styles.subCard}>
              <View style={styles.subTop}>
                <Text style={styles.subTitle}>{t('drawer.subscription')}</Text>
                {subViewState !== 'loading' && subViewState !== 'none' ? (
                  <View
                    style={[
                      styles.subBadge,
                      subViewState === 'active'
                        ? {backgroundColor: 'rgba(212,175,55,0.22)'}
                        : {backgroundColor: 'rgba(248,113,113,0.22)'},
                    ]}>
                    <Text
                      style={{
                        color:
                          subViewState === 'active' ? '#f5d778' : '#fca5a5',
                        fontSize: 10.6,
                        fontWeight: '700',
                      }}>
                      {subViewState === 'active'
                        ? t('drawer.badgeActive')
                        : t('drawer.badgeExpired')}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.subLine}>
                {subViewState === 'loading'
                  ? '…'
                  : subViewState === 'none'
                    ? t('drawer.noSubscription')
                    : subEndIso
                      ? t('home.subscriptionEnd', {
                          date: formatDate(subEndIso) ?? '',
                        })
                      : t('drawer.subscription')}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.min(100, Math.max(0, subPercent))}%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.subFoot}>
                <Text style={styles.subFootText}>
                  {subDays != null
                    ? t('drawer.daysLeft', {count: subDays})
                    : ''}
                </Text>
                <Pressable
                  onPress={() => onItem('subscription')}
                  style={styles.subBtn}
                  accessibilityRole="button">
                  <Text
                    style={{
                      color: '#0f172a',
                      fontSize: 11.5,
                      fontWeight: '700',
                    }}>
                    {subViewState === 'none'
                      ? t('drawer.subscribe')
                      : t('drawer.manage')}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Réseaux sociaux */}
            <View
              style={styles.social}
              accessibilityLabel={t('drawer.follow')}>
              {socialLinksStore.list().map(s =>
                s.href ? (
                  <Pressable
                    key={s.id}
                    onPress={() => openSocial(s.href!)}
                    accessibilityRole="link"
                    accessibilityLabel={s.label}
                    style={[
                      styles.socialBtn,
                      {backgroundColor: colors.bgSurfaceAlt},
                    ]}>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 12,
                        fontWeight: '600',
                      }}>
                      {s.label.slice(0, 2).toUpperCase()}
                    </Text>
                  </Pressable>
                ) : (
                  <View
                    key={s.id}
                    style={[
                      styles.socialBtn,
                      {
                        backgroundColor: colors.bgSurfaceAlt,
                        opacity: 0.45,
                      },
                    ]}>
                    <Text
                      style={{
                        color: colors.textMuted,
                        fontSize: 12,
                      }}>
                      {s.label.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                ),
              )}
            </View>

            {/* Interrupteur thème */}
            <View style={styles.themeRow}>
              <View
                style={{
                  opacity: isDarkMode ? 0.4 : 1,
                }}>
                <Icon
                  name="SunIcon"
                  size={18}
                  color={
                    !isDarkMode ? colors.blueActive : colors.textMuted
                  }
                />
              </View>
              <Pressable
                onPress={toggleTheme}
                style={[
                  styles.switch,
                  {
                    borderColor: colors.borderLight,
                    backgroundColor: colors.bgSurfaceAlt,
                  },
                  isDarkMode && styles.switchDark,
                ]}
                accessibilityRole="switch"
                accessibilityState={{checked: isDarkMode}}
                accessibilityLabel={t('drawer.darkTheme')}
                testID="drawer-theme-switch">
                <View
                  style={[
                    styles.knob,
                    {
                      backgroundColor: isDarkMode
                        ? colors.blueActive
                        : colors.bluePrimary,
                    },
                    isDarkMode && {transform: [{translateX: 20}]},
                  ]}
                />
              </Pressable>
              <View style={{opacity: isDarkMode ? 1 : 0.4}}>
                <Icon
                  name="MoonIcon"
                  size={18}
                  color={
                    isDarkMode ? colors.blueActive : colors.textMuted
                  }
                />
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    height: '100%',
    maxWidth: '86%',
  },
  scroll: {
    paddingTop: 16,
    paddingHorizontal: 14.4,
    paddingBottom: 18,
    gap: 16,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10.4,
  },
  headIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
  },
  headText: {
    flex: 1,
    minWidth: 0,
  },
  headTitle: {
    fontSize: 17.6,
    fontWeight: '700',
    letterSpacing: 0.09,
    lineHeight: 20.24,
  },
  headSub: {
    fontSize: 12.5,
    fontWeight: '500',
    fontStyle: 'italic',
    lineHeight: 16.2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11.2,
    paddingVertical: 10.4,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    // gradient fallback = blue-primary solid
    backgroundColor: '#1E40AF',
    borderWidth: 2,
  },
  userText: {
    flex: 1,
    minWidth: 0,
  },
  menu: {
    gap: 2.4,
  },
  item: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11.2,
    width: '100%',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  ico: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    minWidth: 0,
    fontSize: 14.1, // 0.88rem
  },
  mark: {
    position: 'absolute',
    right: 8,
    width: 4,
    height: 18,
    borderRadius: 4,
  },
  subCard: {
    padding: 14.4,
    borderRadius: 16,
    backgroundColor: '#1E40AF', // gradient fallback
  },
  subTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  subTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  subBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 9999,
  },
  subLine: {
    marginTop: 8,
    marginBottom: 8.8,
    fontSize: 15.2,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  barTrack: {
    height: 8,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 9999,
    backgroundColor: '#D4AF37',
  },
  subFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10.4,
  },
  subFootText: {
    fontSize: 11.2,
    color: 'rgba(255,255,255,0.78)',
    flex: 1,
  },
  subBtn: {
    flexShrink: 0,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    backgroundColor: '#D4AF37',
  },
  social: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 9.6,
  },
  socialBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9.6,
  },
  switch: {
    width: 44,
    height: 24,
    borderWidth: 1,
    borderRadius: 9999,
    justifyContent: 'center',
  },
  switchDark: {},
  knob: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
  },
});
