/**
 * Détail d'un espace (reprend site : CommunitySpacePage.jsx) : rejoindre,
 * quitter (sauf propriétaire), ouvrir la discussion pour y écrire. Espace privé
 * non rejoint : message dédié ; espace inconnu : message dédié.
 */

import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {ActivityIndicator, ImageBackground, ScrollView, View} from 'react-native';
import {Button, EmptyState, ErrorState, Scrim, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {communityMeStore} from '@shared/store';
import {CommunityGate} from '../components/CommunityGate';
import {spaceImageFor} from '../spaceImages';
import {joinSpaceAction, leaveSpaceAction} from '../store/spaceActions';
import {spaceStore} from '../store/spaceStore';

type Props = {
  spaceId: string;
  onOpenChat: (conversationId: string, title: string) => void;
  onOpenProfile: () => void;
  onOpenSubscription: () => void;
};

export function CommunitySpaceScreen({
  spaceId,
  onOpenChat,
  onOpenProfile,
  onOpenSubscription,
}: Props) {
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const entry = useSyncExternalStore(
    cb => spaceStore.subscribe(cb),
    () => spaceStore.getState().spaces[spaceId],
  );
  const me = useSyncExternalStore(
    cb => communityMeStore.subscribe(() => cb()),
    () => communityMeStore.getState(),
  );
  const myId = me.data?.userId ?? '';
  const [busy, setBusy] = useState(false);
  const [feedbackKey, setFeedbackKey] = useState('');
  const [infoKey, setInfoKey] = useState('');

  useEffect(() => {
    void spaceStore.open(spaceId);
  }, [spaceId]);

  const renderBody = () => {
    if (!entry || entry.status === 'loading') {
      return (
        <View style={{padding: spacing.xl, alignItems: 'center'}} testID="community-space-loading">
          <ActivityIndicator color={colors.bluePrimary} />
        </View>
      );
    }
    if (entry.status === 'notFound') {
      return (
        <EmptyState message={t('communityApp.spaces.notFound')} testID="community-space-notfound" />
      );
    }
    if (entry.status === 'private') {
      return (
        <EmptyState message={t('communityApp.spaces.private')} testID="community-space-private" />
      );
    }
    if (entry.status === 'error' || !entry.space) {
      return (
        <ErrorState
          message={t(entry.errorKey ?? 'communityApp.errors.generic')}
          retryLabel={t('common.retry')}
          onRetry={() => void spaceStore.open(spaceId)}
          testID="community-space-error"
        />
      );
    }
    const space = entry.space;
    const mine = space.ownerId !== '' && space.ownerId === myId;

    const toggle = async () => {
      if (busy) {
        return;
      }
      setBusy(true);
      setFeedbackKey('');
      setInfoKey('');
      const wasJoined = space.joined;
      const res = wasJoined ? await leaveSpaceAction(space.id) : await joinSpaceAction(space.id);
      setBusy(false);
      if (!res.ok) {
        setFeedbackKey(res.errorKey);
        return;
      }
      if (!wasJoined) {
        setInfoKey('communityApp.spaces.joinedInfo');
      }
    };

    return (
      <View style={{gap: spacing.md}}>
        <ImageBackground
          source={spaceImageFor(space.id)}
          style={{borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.bgSurfaceAlt}}>
          <Scrim from={0.2} to={0.92} />
          <View style={{padding: spacing.lg, paddingTop: spacing.xxl, gap: spacing.xs}}>
            {mine ? (
              <Text style={{fontSize: 12.5, fontWeight: '700', color: colors.textOnPrimary}}>
                {t('communityApp.spaces.youOwn')}
              </Text>
            ) : null}
            <Text
              accessibilityRole="header"
              style={{fontSize: 20, fontWeight: '700', color: colors.textOnPrimary}}>
              {space.name}
            </Text>
            <Text style={{fontSize: 12.5, color: colors.textOnPrimary}}>
              {t(
                space.memberCount === 1
                  ? 'communityApp.home.memberOne'
                  : 'communityApp.home.memberMany',
                {count: space.memberCount},
              )}
            </Text>
          </View>
        </ImageBackground>

        {space.description ? (
          <Text style={{fontSize: 14.5, color: colors.textSecondary}}>{space.description}</Text>
        ) : null}

        <View style={{gap: spacing.sm}}>
          {space.joined && space.conversationId ? (
            <View style={{flexDirection: 'row'}}>
              <Button
                label={t('communityApp.spaces.openChat')}
                onPress={() => onOpenChat(space.conversationId as string, space.name)}
                testID="community-space-open-chat"
              />
            </View>
          ) : (
            <Text style={{fontSize: 13.5, color: colors.textMuted}}>
              {t('communityApp.spaces.joinToWrite')}
            </Text>
          )}
          {mine ? (
            <Text style={{fontSize: 13.5, color: colors.textMuted}}>
              {t('communityApp.spaces.ownerCannotLeave')}
            </Text>
          ) : (
            <View style={{flexDirection: 'row'}}>
              <Button
                variant={space.joined ? 'secondary' : 'primary'}
                label={space.joined ? t('communityApp.spaces.leave') : t('communityApp.spaces.join')}
                onPress={() => void toggle()}
                loading={busy}
                testID="community-space-toggle"
              />
            </View>
          )}
        </View>

        {infoKey ? (
          <Text accessibilityRole="alert" style={{fontSize: 13.5, color: colors.success}}>
            {t(infoKey)}
          </Text>
        ) : null}
        {feedbackKey ? (
          <Text accessibilityRole="alert" style={{fontSize: 13.5, color: colors.error}}>
            {t(feedbackKey)}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <CommunityGate onOpenProfile={onOpenProfile} onOpenSubscription={onOpenSubscription}>
      <ScrollView
        contentContainerStyle={{padding: spacing.lg, gap: spacing.md}}
        testID="screen-community-space">
        {renderBody()}
      </ScrollView>
    </CommunityGate>
  );
}
