/**
 * Porte d'entrée de la Communauté (rapport §10.1, §3.3) : le périmètre social
 * n'est ouvert qu'à un membre avec profil ET abonnement actif. La création du
 * profil se fait dans la page Profil de l'espace membre, pas ici.
 */

import React, {useEffect, useSyncExternalStore} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {sessionStore} from '@core/session';
import {EmptyState, ErrorState, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {communityProfileView} from '@shared/community';
import {communityMeStore, reconnectMember} from '@shared/store';

type Props = {
  children: React.ReactNode;
  onOpenProfile: () => void;
  onOpenSubscription: () => void;
};

export function CommunityGate({children, onOpenProfile, onOpenSubscription}: Props) {
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();
  const state = useSyncExternalStore(
    cb => communityMeStore.subscribe(() => cb()),
    () => communityMeStore.getState(),
  );
  const subscriptionActive = sessionStore.getSession()?.subscriptionActive ?? null;
  const view = communityProfileView(state, subscriptionActive);

  useEffect(() => {
    void communityMeStore.load();
  }, []);

  if (view === 'loading') {
    return (
      <View
        style={{flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl}}
        testID="community-gate-loading">
        <ActivityIndicator color={colors.bluePrimary} />
      </View>
    );
  }
  if (view === 'session') {
    return (
      <EmptyState
        title={t('communityProfile.sessionTitle')}
        message={t('communityProfile.sessionText')}
        actionLabel={t('communityProfile.sessionAction')}
        onAction={reconnectMember}
        testID="community-gate-session"
      />
    );
  }
  if (view === 'subscription' || (view === 'ready' && subscriptionActive === false)) {
    return (
      <EmptyState
        title={t('communityProfile.subscriptionTitle')}
        message={t('communityApp.errors.subscriptionInactive')}
        actionLabel={t('communityApp.errors.viewSubscription')}
        onAction={onOpenSubscription}
        testID="community-gate-subscription"
      />
    );
  }
  if (view === 'needsProfile') {
    return (
      <EmptyState
        title={t('communityApp.onboarding.title')}
        message={t('communityApp.onboarding.body')}
        actionLabel={t('communityProfile.create')}
        onAction={onOpenProfile}
        testID="community-gate-needs-profile"
      />
    );
  }
  if (view === 'error') {
    return (
      <ErrorState
        title={t('communityApp.errors.title')}
        message={t('communityApp.errors.generic')}
        retryLabel={t('common.retry')}
        onRetry={() => void communityMeStore.load({force: true})}
        testID="community-gate-error"
      />
    );
  }
  return <>{children}</>;
}
