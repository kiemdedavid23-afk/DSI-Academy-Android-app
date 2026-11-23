/**
 * Espaces (reprend site : CommunitySpacesPage.jsx) : recherche (300 ms), liste
 * des espaces publics, rejoindre, quitter, création. Le propriétaire voit un
 * badge à la place du bouton : il ne peut pas quitter son espace.
 */

import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {ActivityIndicator, ImageBackground, Pressable, ScrollView, View} from 'react-native';
import type {SpaceSummary} from '@core/api/endpoints/community/spaces.types';
import {Button, EmptyState, ErrorState, Scrim, Text, TextField, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {communityMeStore} from '@shared/store';
import {CommunityGate} from '../components/CommunityGate';
import {SPACE_IMAGES} from '../spaceImages';
import {joinSpaceAction, leaveSpaceAction} from '../store/spaceActions';
import {spacesStore} from '../store/spacesStore';

const SEARCH_DELAY_MS = 300;

type Props = {
  onOpenSpace: (id: string) => void;
  onCreateSpace: () => void;
  onOpenProfile: () => void;
  onOpenSubscription: () => void;
};

export function CommunitySpacesScreen({
  onOpenSpace,
  onCreateSpace,
  onOpenProfile,
  onOpenSubscription,
}: Props) {
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const state = useSyncExternalStore(
    cb => spacesStore.subscribe(cb),
    () => spacesStore.getState(),
  );
  const me = useSyncExternalStore(
    cb => communityMeStore.subscribe(() => cb()),
    () => communityMeStore.getState(),
  );
  const myId = me.data?.userId ?? '';
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedbackKey, setFeedbackKey] = useState('');

  useEffect(() => {
    const timer = setTimeout(
      () => void spacesStore.load(query),
      query.trim() ? SEARCH_DELAY_MS : 0,
    );
    return () => clearTimeout(timer);
  }, [query]);

  const toggle = async (space: SpaceSummary) => {
    if (busyId) {
      return;
    }
    setBusyId(space.id);
    setFeedbackKey('');
    const res = space.joined
      ? await leaveSpaceAction(space.id)
      : await joinSpaceAction(space.id);
    setBusyId(null);
    if (!res.ok) {
      setFeedbackKey(res.errorKey);
    }
  };

  const items = state.data ?? [];

  const renderBody = () => {
    if (!state.data) {
      if (state.status === 'error' && state.error) {
        return (
          <ErrorState
            message={t(state.error)}
            retryLabel={t('common.retry')}
            onRetry={() => void spacesStore.load(query)}
            testID="community-spaces-error"
          />
        );
      }
      return (
        <View style={{padding: spacing.xl, alignItems: 'center'}} testID="community-spaces-loading">
          <ActivityIndicator color={colors.bluePrimary} />
        </View>
      );
    }
    if (items.length === 0) {
      return state.query ? (
        <Text style={{fontSize: 13.5, color: colors.textMuted}} testID="community-spaces-nomatch">
          {t('communityApp.spaces.noResults')}
        </Text>
      ) : (
        <EmptyState
          title={t('communityApp.spaces.emptyTitle')}
          message={t('communityApp.spaces.emptyText')}
          actionLabel={t('communityApp.spaces.create')}
          onAction={onCreateSpace}
          testID="community-spaces-empty"
        />
      );
    }
    return (
      <View style={{gap: spacing.md}}>
        {items.map((space, i) => {
          const mine = space.ownerId !== '' && space.ownerId === myId;
          return (
            <ImageBackground
              key={space.id}
              source={SPACE_IMAGES[i % SPACE_IMAGES.length]}
              style={{borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.bgSurfaceAlt}}
              testID={`community-space-card-${space.id}`}>
              <Scrim from={0.15} to={0.92} />
              <Pressable
                onPress={() => onOpenSpace(space.id)}
                accessibilityRole="button"
                accessibilityLabel={space.name}
                style={{padding: spacing.lg, paddingTop: spacing.xxl, gap: spacing.xs}}>
                <Text style={{fontSize: 17, fontWeight: '700', color: colors.textOnPrimary}}>
                  {space.name}
                </Text>
                {space.description ? (
                  <Text numberOfLines={2} style={{fontSize: 13.5, color: colors.textOnPrimary}}>
                    {space.description}
                  </Text>
                ) : null}
                <Text style={{fontSize: 12.5, color: colors.textOnPrimary}}>
                  {t(
                    space.memberCount === 1
                      ? 'communityApp.home.memberOne'
                      : 'communityApp.home.memberMany',
                    {count: space.memberCount},
                  )}
                </Text>
              </Pressable>
              <View style={{paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, flexDirection: 'row'}}>
                {mine ? (
                  <Text style={{fontSize: 12.5, fontWeight: '700', color: colors.textOnPrimary}}>
                    {t('communityApp.spaces.owner')}
                  </Text>
                ) : (
                  <Button
                    variant={space.joined ? 'secondary' : 'primary'}
                    label={space.joined ? t('communityApp.spaces.leave') : t('communityApp.spaces.join')}
                    onPress={() => void toggle(space)}
                    loading={busyId === space.id}
                    disabled={busyId !== null}
                    testID={`community-space-toggle-${space.id}`}
                  />
                )}
              </View>
            </ImageBackground>
          );
        })}
      </View>
    );
  };

  return (
    <CommunityGate onOpenProfile={onOpenProfile} onOpenSubscription={onOpenSubscription}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{padding: spacing.lg, gap: spacing.md}}
        testID="screen-community-spaces">
        <TextField
          label={t('communityApp.spaces.searchPlaceholder')}
          value={query}
          onChangeText={setQuery}
          placeholder={t('communityApp.spaces.searchPlaceholder')}
          autoCapitalize="none"
          testID="community-spaces-search"
        />
        <View style={{flexDirection: 'row'}}>
          <Button
            label={t('communityApp.spaces.create')}
            onPress={onCreateSpace}
            testID="community-spaces-create"
          />
        </View>
        {feedbackKey ? (
          <Text accessibilityRole="alert" style={{fontSize: 13.5, color: colors.error}}>
            {t(feedbackKey)}
          </Text>
        ) : null}
        {renderBody()}
      </ScrollView>
    </CommunityGate>
  );
}
