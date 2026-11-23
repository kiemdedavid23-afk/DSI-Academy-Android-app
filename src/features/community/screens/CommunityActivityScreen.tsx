/**
 * Fil d'activité global (rapport §11.7). La phrase est fabriquée ici à partir
 * du type et de l'acteur : le texte français du serveur n'est jamais affiché.
 * Tirer vers le bas relit le fil.
 */

import React, {useEffect, useSyncExternalStore} from 'react';
import {ActivityIndicator, RefreshControl, ScrollView, View} from 'react-native';
import {EmptyState, ErrorState, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {CommunityGate} from '../components/CommunityGate';
import {formatListTime} from '../format';
import {activityStore} from '../store/activityStore';

type Props = {
  onOpenProfile: () => void;
  onOpenSubscription: () => void;
};

export function CommunityActivityScreen({onOpenProfile, onOpenSubscription}: Props) {
  const {t, i18n} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const state = useSyncExternalStore(
    cb => activityStore.subscribe(() => cb()),
    () => activityStore.getState(),
  );

  useEffect(() => {
    void activityStore.load({force: true});
  }, []);

  const renderBody = () => {
    if (!state.data) {
      if (state.status === 'error' && state.error) {
        return (
          <ErrorState
            message={t(state.error)}
            retryLabel={t('common.retry')}
            onRetry={() => void activityStore.load({force: true})}
            testID="community-activity-error"
          />
        );
      }
      return (
        <View style={{padding: spacing.xl, alignItems: 'center'}} testID="community-activity-loading">
          <ActivityIndicator color={colors.bluePrimary} />
        </View>
      );
    }
    if (state.data.length === 0) {
      return (
        <EmptyState
          title={t('communityApp.activity.emptyTitle')}
          message={t('communityApp.activity.emptyText')}
          testID="community-activity-empty"
        />
      );
    }
    return (
      <View style={{gap: spacing.sm}}>
        {state.data.map(event => {
          const who =
            event.actorDisplayName ||
            event.actorPseudonym ||
            t('communityApp.activity.someone');
          return (
            <View
              key={event.id}
              testID={`community-activity-${event.id}`}
              style={{
                padding: spacing.md,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.borderLight,
                backgroundColor: colors.bgSurfaceAlt,
                gap: spacing.xs,
              }}>
              <Text style={{fontSize: 14.5, fontWeight: '600', color: colors.textPrimary}}>
                {t(
                  event.type === 'space.created'
                    ? 'communityApp.activity.created'
                    : 'communityApp.activity.joined',
                  {name: who},
                )}
              </Text>
              <Text style={{fontSize: 12, color: colors.textMuted}}>
                {formatListTime(event.createdAt, i18n.language)}
              </Text>
            </View>
          );
        })}
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
            onRefresh={() => void activityStore.load({force: true})}
          />
        }
        testID="screen-community-activity">
        {renderBody()}
      </ScrollView>
    </CommunityGate>
  );
}
