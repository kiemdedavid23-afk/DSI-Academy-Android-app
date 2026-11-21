/**
 * Section « Vendeur » de la Marketplace : porte d'entrée selon le statut de la
 * candidature (lot S3). Le statut est relu à chaque ouverture. Aucune
 * notification n'est envoyée par le Worker : c'est cette relecture qui
 * annonce l'approbation.
 */

import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {View} from 'react-native';
import {ErrorState, LoadingState, Text, Button, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {commerceErrorKey} from '../logic/errorKey';
import {sellerApplicationStore} from '../store/sellerApplicationStore';
import {SellerApplyScreen} from './SellerApplyScreen';
import {SellerIntroScreen} from './SellerIntroScreen';
import {SellerStatusScreen} from './SellerStatusScreen';

export type SellerGateScreenProps = {
  shellHeader: React.ReactNode;
  /** Ouvre l'espace vendeur (lot S4). */
  onOpenSpace?: () => void;
  /** Session expirée : retour à la connexion. */
  onSignIn?: () => void;
};

export function SellerGateScreen({
  shellHeader,
  onOpenSpace,
  onSignIn,
}: SellerGateScreenProps) {
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();
  const store = sellerApplicationStore;
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const [applying, setApplying] = useState(false);
  const [step, setStep] = useState(1);
  const [justSent, setJustSent] = useState(false);

  useEffect(() => {
    void store.load();
  }, [store]);

  if (applying) {
    return (
      <SellerApplyScreen
        step={step}
        onStepChange={setStep}
        onClose={() => {
          setApplying(false);
          setStep(1);
        }}
        onSubmitted={() => {
          setApplying(false);
          setStep(1);
          setJustSent(true);
        }}
      />
    );
  }

  const restart = () => {
    setStep(1);
    setApplying(true);
  };

  if (state.status === 'error' || (state.status === 'idle' && state.errorKind)) {
    const session =
      state.errorKind === 'noProof' || state.errorKind === 'unauthorized';
    return (
      <View style={{flex: 1, backgroundColor: colors.bgApp}} testID="screen-seller-gate-error">
        {shellHeader}
        {session ? (
          <View style={{gap: spacing.md, padding: spacing.xl}}>
            <Text variant="subtitle">{t('mp.apply.session.title')}</Text>
            <Text variant="body" color="secondary">
              {t('mp.apply.session.body')}
            </Text>
            {onSignIn ? (
              <Button label={t('mp.apply.session.signIn')} onPress={onSignIn} />
            ) : null}
          </View>
        ) : (
          <ErrorState
            message={t(commerceErrorKey(state.errorKind))}
            retryLabel={t('common.retry')}
            onRetry={() => void store.load()}
          />
        )}
      </View>
    );
  }

  const application = state.application;
  if (!application) {
    return (
      <View style={{flex: 1, backgroundColor: colors.bgApp}} testID="screen-seller-gate-loading">
        {shellHeader}
        <LoadingState accessibilityLabel={t('content.loading')} />
      </View>
    );
  }

  if (application.status === 'none') {
    return <SellerIntroScreen shellHeader={shellHeader} onStart={restart} />;
  }

  return (
    <SellerStatusScreen
      shellHeader={shellHeader}
      application={application}
      onRestart={restart}
      onOpenSpace={onOpenSpace}
      justSent={justSent && application.status === 'PENDING'}
    />
  );
}
