/**
 * Tiroir Espace membre — Modal + Animated, sans dépendance drawer.
 */

import React, {useEffect, useRef} from 'react';
import {
  Modal,
  View,
  Pressable,
  ScrollView,
  Animated,
  StyleSheet,
  Linking,
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
  const {colors, spacing, radii} = useTheme();
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
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      void memberProfileStore.load();
      void memberSubscriptionStore.load();
    }
  }, [open]);

  useEffect(() => {
    if (reduceMotion) {
      slide.setValue(open ? 1 : 0);
      return;
    }
    Animated.timing(slide, {
      toValue: open ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [open, reduceMotion, slide]);

  const profile = profileState.data;
  const sub = computeSubscription(subState.data);
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';
  const formatDate = (d: Date) =>
    d.toLocaleDateString(locale, {day: 'numeric', month: 'short', year: 'numeric'});

  let subLine = t('drawer.noSubscription');
  let subBadge = t('drawer.badgeNone');
  let percent = 0;
  let subFoot = '';
  let subBtn = t('drawer.subscribe');
  let subStateKey: 'loading' | 'active' | 'expired' | 'none' | 'error' = 'none';

  if (subState.status === 'loading' && !subState.data) {
    subStateKey = 'loading';
    subLine = t('drawer.loading');
  } else if (subState.status === 'error' && !subState.data) {
    subStateKey = 'error';
    subLine = t('drawer.unavailable');
    subBtn = t('drawer.view');
  } else if (sub.state === 'active') {
    subStateKey = 'active';
    subBadge = t('drawer.badgeActive');
    subLine =
      sub.days === 1
        ? t('drawer.daysLeftOne')
        : t('drawer.daysLeftMany', {days: sub.days});
    subFoot = t('drawer.expiresOn', {date: formatDate(sub.fin)});
    percent = sub.percent;
    subBtn = t('drawer.renew');
  } else if (sub.state === 'expired') {
    subStateKey = 'expired';
    subBadge = t('drawer.badgeExpired');
    subLine = t('drawer.expired');
    subFoot = t('drawer.expiredOn', {date: formatDate(sub.fin)});
    subBtn = t('drawer.renew');
  }

  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [-320, 0],
  });

  const openSocial = (href: string) => {
    // href déjà validé https dans core/config/socialLinks
    void Linking.openURL(href).catch(() => {});
  };

  const onLogout = () => {
    onClose();
    void sessionStore.expireSession('loggedOut');
  };

  const toggleTheme = () => {
    const current = preferencesStore.get().theme;
    const next = current === 'dark' ? 'light' : 'dark';
    void preferencesStore.setTheme(next);
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      onRequestClose={onClose}
      testID="member-drawer-modal">
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('drawer.close')}
        />
        <Animated.View
          style={[
            styles.panel,
            {
              backgroundColor: colors.bgDarkPremium ?? colors.bgApp,
              paddingTop: spacing.xl,
              transform: [{translateX}],
            },
          ]}
          accessibilityViewIsModal>
          <View style={[styles.top, {paddingHorizontal: spacing.lg}]}>
            <Text variant="title" color="onDark">
              {t('houses.memberSpace')}
            </Text>
            <Pressable onPress={onClose} accessibilityLabel={t('drawer.close')}>
              <Icon name="XIcon" size={22} color={colors.textOnDark} />
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              onNavigateRoom('profile');
              onClose();
            }}
            style={[styles.userCard, {margin: spacing.lg, borderRadius: radii.md}]}
            accessibilityRole="button">
            <View
              style={[
                styles.avatar,
                {backgroundColor: colors.goldPrestige, borderRadius: radii.round},
              ]}>
              <Text variant="label" color="onDark">
                {profile
                  ? initials(profile.prenom, profile.nom)
                  : '?'}
              </Text>
            </View>
            <View style={{marginLeft: spacing.md, flex: 1}}>
              <Text variant="caption" color="muted">
                {t('drawer.hello')}
              </Text>
              <Text variant="body" color="onDark" numberOfLines={1}>
                {profile
                  ? `${profile.prenom} ${profile.nom}`.trim()
                  : '—'}
              </Text>
            </View>
          </Pressable>

          <ScrollView style={{flex: 1}} contentContainerStyle={{paddingBottom: spacing.xxl}}>
            <View accessibilityRole="menu">
              {ROOMS.map(room => {
                const active = room.id === activeRoom;
                return (
                  <Pressable
                    key={room.id}
                    onPress={() => {
                      onNavigateRoom(room.id);
                      onClose();
                    }}
                    accessibilityRole="menuitem"
                    accessibilityState={{selected: active}}
                    style={[
                      styles.item,
                      {
                        paddingHorizontal: spacing.lg,
                        paddingVertical: spacing.md,
                        backgroundColor: active ? colors.bgDarkCard : 'transparent',
                      },
                    ]}
                    testID={`drawer-room-${room.id}`}>
                    <Icon name={room.icon} size={20} color={colors.textOnDark} />
                    <Text
                      variant="body"
                      color="onDark"
                      style={{marginLeft: spacing.md, flex: 1}}>
                      {t(room.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={onLogout}
                accessibilityRole="button"
                style={[styles.item, {paddingHorizontal: spacing.lg, paddingVertical: spacing.md}]}
                testID="drawer-logout">
                <Icon name="XIcon" size={20} color={colors.textOnDark} />
                <Text variant="body" color="onDark" style={{marginLeft: spacing.md}}>
                  {t('drawer.logout')}
                </Text>
              </Pressable>
            </View>

            <View
              style={[
                styles.subCard,
                {
                  margin: spacing.lg,
                  padding: spacing.md,
                  borderRadius: radii.md,
                  backgroundColor: colors.bgDarkCard,
                },
              ]}
              accessibilityLabel={t('drawer.subscription')}>
              <View style={styles.subTop}>
                <Text variant="label" color="onDark">
                  {t('drawer.subscription')}
                </Text>
                {subStateKey !== 'loading' && subStateKey !== 'error' ? (
                  <Text variant="caption" color="muted">
                    {subBadge}
                  </Text>
                ) : null}
              </View>
              <Text variant="body" color="onDark" style={{marginTop: spacing.xs}}>
                {subLine}
              </Text>
              <View
                style={[
                  styles.barTrack,
                  {backgroundColor: colors.borderLight, marginTop: spacing.sm},
                ]}
                accessibilityRole="progressbar"
                accessibilityValue={{min: 0, max: 100, now: percent}}>
                <View
                  style={{
                    width: `${percent}%`,
                    height: 6,
                    backgroundColor: colors.goldPrestige,
                    borderRadius: 3,
                  }}
                />
              </View>
              <View style={[styles.subFoot, {marginTop: spacing.sm}]}>
                <Text variant="caption" color="muted">
                  {subFoot || ' '}
                </Text>
                <Pressable
                  onPress={() => {
                    onNavigateRoom('subscription');
                    onClose();
                  }}>
                  <Text variant="label" color="link">
                    {subBtn}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View
              style={[styles.social, {paddingHorizontal: spacing.lg, gap: spacing.md}]}
              accessibilityLabel={t('drawer.follow')}>
              {socialLinksStore.list().map(s =>
                s.href ? (
                  <Pressable
                    key={s.id}
                    onPress={() => openSocial(s.href!)}
                    accessibilityRole="link"
                    accessibilityLabel={s.label}
                    style={styles.socialBtn}>
                    <Text variant="caption" color="onDark">
                      {s.label}
                    </Text>
                  </Pressable>
                ) : (
                  <View
                    key={s.id}
                    accessibilityState={{disabled: true}}
                    style={[styles.socialBtn, {opacity: 0.4}]}>
                    <Text variant="caption" color="muted">
                      {s.label}
                    </Text>
                  </View>
                ),
              )}
            </View>

            <Pressable
              onPress={toggleTheme}
              style={[styles.item, {paddingHorizontal: spacing.lg, marginTop: spacing.md}]}
              accessibilityRole="switch"
              accessibilityLabel={t('drawer.darkTheme')}>
              <Icon name="EyeIcon" size={20} color={colors.textOnDark} />
              <Text variant="body" color="onDark" style={{marginLeft: spacing.md}}>
                {t('drawer.darkTheme')}
              </Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, flexDirection: 'row'},
  backdrop: {flex: 1, backgroundColor: colors.bgDarkPremium, opacity: 0.7},
  panel: {width: 300, maxWidth: '86%', height: '100%'},
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userCard: {flexDirection: 'row', alignItems: 'center'},
  avatar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {flexDirection: 'row', alignItems: 'center', minHeight: 48},
  subCard: {},
  subTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barTrack: {height: 6, borderRadius: 3, overflow: 'hidden'},
  subFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  social: {flexDirection: 'row', flexWrap: 'wrap'},
  socialBtn: {minHeight: 44, justifyContent: 'center', paddingHorizontal: 4},
});
