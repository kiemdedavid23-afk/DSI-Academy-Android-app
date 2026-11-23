/**
 * Section « Profil communautaire » de la page Profil de l'espace membre
 * (reprend site : member-space/components/CommunityProfileCard.jsx).
 * C'est l'unique endroit où se crée et se modifie ce profil, photo comprise.
 * Indépendante du profil Paiement : nom réel, e-mail et WhatsApp n'y figurent
 * jamais. Si le Worker Communauté est indisponible ou refuse l'accès, seule
 * cette carte change d'état.
 * États : loading · ready · needsProfile · subscription · session · error
 */

import React, {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, View} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useNavigation} from '@react-navigation/native';
import {sessionStore} from '@core/session';
import {
  Button,
  Icon,
  MemberAvatar,
  Text,
  useTheme,
} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {communityProfileView, initialsOf} from '@shared/community';
import {
  communityMeStore,
  reconnectMember,
  refreshAfterImageError,
} from '@shared/store';
import {CommunityAvatarPicker} from './CommunityAvatarPicker';
import {CommunityProfileForm} from './CommunityProfileForm';

type Props = {suggestedDisplayName?: string};

export function CommunityProfileCard({suggestedDisplayName = ''}: Props) {
  const {t} = useTranslation();
  const {colors, radii, glass, spacing} = useTheme();
  const navigation = useNavigation<any>();

  const state = useSyncExternalStore(
    cb => communityMeStore.subscribe(() => cb()),
    () => communityMeStore.getState(),
  );
  const subscriptionActive = sessionStore.getSession()?.subscriptionActive ?? null;
  const view = communityProfileView(state, subscriptionActive);

  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    void communityMeStore.load();
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const profile = state.data?.profile ?? null;

  const handleSaved = (opts?: {keepOpen?: boolean}) => {
    if (!opts?.keepOpen) {
      setEditing(false);
      setNotice(t('communityProfile.saved'));
      later(() => setNotice(''), 4000);
    }
  };

  const copyPseudonym = () => {
    const value = profile?.publicPseudonym || `@${profile?.pseudonym ?? ''}`;
    try {
      Clipboard.setString(value);
      setCopyError(false);
      setCopied(true);
      later(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
      later(() => setCopyError(false), 4000);
    }
  };

  const stateBlock = (
    title: string,
    text: string,
    actionLabel: string,
    onAction: () => void,
    testID: string,
  ) => (
    <View style={{gap: spacing.sm}} testID={testID}>
      <Text style={{fontSize: 15.2, fontWeight: '700', color: colors.textPrimary}}>
        {title}
      </Text>
      <Text style={{fontSize: 13.5, color: colors.textSecondary}}>{text}</Text>
      <View style={{flexDirection: 'row'}}>
        <Button label={actionLabel} onPress={onAction} />
      </View>
    </View>
  );

  const renderBody = () => {
    switch (view) {
      case 'loading':
        return (
          <View
            style={{alignItems: 'center', paddingVertical: spacing.lg}}
            testID="community-profile-skeleton">
            <ActivityIndicator color={colors.bluePrimary} />
          </View>
        );
      case 'subscription':
        return stateBlock(
          t('communityProfile.subscriptionTitle'),
          t('communityProfile.subscriptionText'),
          t('communityProfile.subscriptionAction'),
          () => navigation.navigate('MemberSubscription'),
          'community-profile-subscription',
        );
      case 'session':
        return stateBlock(
          t('communityProfile.sessionTitle'),
          t('communityProfile.sessionText'),
          t('communityProfile.sessionAction'),
          reconnectMember,
          'community-profile-session',
        );
      case 'error':
        return stateBlock(
          t('communityProfile.errorTitle'),
          t('communityProfile.errors.generic'),
          t('common.retry'),
          () => void communityMeStore.load({force: true}),
          'community-profile-error',
        );
      case 'needsProfile':
        return editing ? (
          <CommunityProfileForm
            profile={null}
            suggestedDisplayName={suggestedDisplayName}
            onSaved={handleSaved}
            onCancel={() => setEditing(false)}
          />
        ) : (
          stateBlock(
            t('communityProfile.needsTitle'),
            t('communityProfile.needsText'),
            t('communityProfile.create'),
            () => setEditing(true),
            'community-profile-needs',
          )
        );
      default:
        break;
    }

    if (!profile) {
      return null;
    }
    if (editing) {
      return (
        <CommunityProfileForm
          profile={profile}
          onSaved={handleSaved}
          onCancel={() => setEditing(false)}
        />
      );
    }
    const visible = profile.discoverable !== false;
    return (
      <View style={{gap: spacing.md}} testID="community-profile-ready">
        <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
          <MemberAvatar
            src={profile.avatarUrl}
            initials={initialsOf(profile.displayName)}
            size="md"
            onImageError={refreshAfterImageError}
          />
          <View style={{flex: 1}}>
            <Text
              style={{fontSize: 16, fontWeight: '700', color: colors.textPrimary}}
              accessibilityLabel={t('communityProfile.photo.alt', {
                name: profile.displayName,
              })}>
              {profile.displayName}
            </Text>
            <Text style={{fontSize: 14, color: colors.textSecondary}}>
              {profile.publicPseudonym || `@${profile.pseudonym}`}
            </Text>
          </View>
          <Pressable
            onPress={copyPseudonym}
            accessibilityRole="button"
            accessibilityLabel={
              copied
                ? t('communityProfile.copied')
                : t('communityProfile.copyPseudonym')
            }
            style={{
              width: 38,
              height: 38,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: colors.borderLight,
              backgroundColor: colors.bgSurfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon
              name={copied ? 'CheckIcon' : 'CopyIcon'}
              size={18}
              color={copied ? colors.success : colors.textSecondary}
            />
          </Pressable>
        </View>
        <Text
          style={{
            fontSize: 12.5,
            color: visible ? colors.success : colors.textMuted,
          }}>
          {visible
            ? t('communityProfile.visibleInSearch')
            : t('communityProfile.hiddenFromSearch')}
        </Text>
        <CommunityAvatarPicker hasPhoto={Boolean(profile.avatarUrl)} />
        {copyError ? (
          <Text accessibilityRole="alert" style={{fontSize: 12.5, color: colors.error}}>
            {t('profile.copyError')}
          </Text>
        ) : null}
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm}}>
          <Button
            label={t('communityProfile.edit')}
            onPress={() => setEditing(true)}
            testID="community-profile-edit"
          />
          <Button
            variant="secondary"
            label={t('communityProfile.open')}
            onPress={() => navigation.getParent()?.navigate('Community')}
            testID="community-profile-open"
          />
        </View>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: glass.bg,
          borderColor: colors.goldBorder,
          borderRadius: radii.lg,
          padding: spacing.lg,
          gap: spacing.sm,
        },
      ]}
      testID="community-profile-card">
      <Text style={{fontSize: 16, fontWeight: '700', color: colors.textPrimary}}>
        {t('communityProfile.title')}
      </Text>
      <Text style={{fontSize: 12.5, color: colors.textMuted}}>
        {t('communityProfile.subtitle')}
      </Text>
      {notice ? (
        <Text
          accessibilityRole="alert"
          style={{fontSize: 13, color: colors.success}}>
          {notice}
        </Text>
      ) : null}
      {renderBody()}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {borderWidth: 1},
});
