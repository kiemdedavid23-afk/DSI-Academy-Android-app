/**
 * Pièce Abonnement — consultation + renouvellement DSI / FCFA (L3a).
 * Écran → store uniquement (R-LAY).
 */

import React, {useCallback, useEffect, useSyncExternalStore} from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {Text, useTheme} from '@shared/designsystem';
import {PageHeader} from '../../../components/PageHeader';
import {useTranslation} from '@shared/i18n';
import {
  bannerStore,
  memberSubscriptionStore,
  connectivityStore,
  getDisplayPricing,
} from '@shared/store';
import {computeSubscription} from '@core/utils/subscription';
import {planLabel, statusLabel} from '@core/utils/displayLabels';
import {validerChampPaiement} from '@core/utils/paymentFieldValidation';
import {subscriptionRenewalStore} from '../store/subscriptionRenewalStore';

function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) {
    return '—';
  }
  try {
    return new Date(iso).toLocaleDateString(locale);
  } catch {
    return '—';
  }
}

function modeLabel(
  mode: string | null | undefined,
  t: (k: string) => string,
): string {
  if (!mode) {
    return '—';
  }
  const m = mode.toLowerCase();
  if (m === 'dsi') {
    return 'DSI';
  }
  if (m === 'fcfa') {
    return 'FCFA';
  }
  if (m === 'fondateur' || m === 'founder') {
    return t('subscription.modeFounder');
  }
  return mode;
}

export function MemberSubscriptionScreen() {
  const {t, i18n} = useTranslation();
  const {colors, radii, glass} = useTheme();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';
  const amountDsi = new Intl.NumberFormat(locale).format(getDisplayPricing().renewalPriceDsi);

  const subState = useSyncExternalStore(
    cb => memberSubscriptionStore.subscribe(() => cb()),
    () => memberSubscriptionStore.getState(),
    () => memberSubscriptionStore.getState(),
  );
  const renewal = useSyncExternalStore(
    subscriptionRenewalStore.subscribe,
    () => subscriptionRenewalStore.getState(),
    () => subscriptionRenewalStore.getState(),
  );
  const online = useSyncExternalStore(
    connectivityStore.subscribe,
    () => connectivityStore.isOnline(),
    () => true,
  );

  useEffect(() => {
    void memberSubscriptionStore.load();
    return () => {
      subscriptionRenewalStore.leaveScreen();
    };
  }, []);

  const onRefresh = useCallback(() => {
    void memberSubscriptionStore.load();
  }, []);

  const loading = subState.status === 'loading' && !subState.data;
  const error = subState.status === 'error' ? subState.error : null;
  const abonnement = subState.data;
  const computed = computeSubscription(abonnement);
  const etat = computed.state; // active | expired | none

  // Résultat du renouvellement (message du Worker ou clé i18n) : bannière.
  useEffect(() => {
    const m = renewal.message;
    if (!m || (renewal.phase !== 'success' && renewal.phase !== 'error')) {
      return;
    }
    bannerStore.notify({
      tone: renewal.phase === 'success' ? 'success' : 'error',
      type: 'renewal-result',
      message: m.includes('.') ? t(m) : m,
    });
  }, [renewal.phase, renewal.message, t]);

  if (loading) {
    return (
      <View style={[styles.center, {padding: 24}]} testID="subscription-skeleton">
        <ActivityIndicator color={colors.bluePrimary} />
        <Text style={{marginTop: 12, color: colors.textSecondary}}>
          {t('subscription.loading')}
        </Text>
      </View>
    );
  }

  if (error && !abonnement) {
    return (
      <View style={[styles.center, {padding: 24}]} testID="subscription-error">
        <Text style={{color: colors.textSecondary, textAlign: 'center'}}>
          {String(error)}
        </Text>
        <Pressable
          onPress={() => void memberSubscriptionStore.load()}
          style={[styles.btn, {backgroundColor: colors.bgDarkPremium, marginTop: 16}]}>
          <Text style={{color: colors.goldPrestige, fontWeight: '600'}}>
            {t('common.retry')}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!abonnement?.formule) {
    return (
      <View style={[styles.center, {padding: 24}]} testID="subscription-empty">
        <Text style={{color: colors.textSecondary}}>{t('subscription.empty')}</Text>
      </View>
    );
  }

  const pillBg =
    etat === 'active'
      ? colors.successBg
      : etat === 'expired'
        ? colors.warningBg
        : colors.bgSurfaceAlt;
  const pillFg =
    etat === 'active'
      ? colors.success
      : etat === 'expired'
        ? colors.warning
        : colors.textSecondary;

  const renewDisabled =
    !online || renewal.paymentInProgress || renewal.submitting;

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: 'transparent'}}
      contentContainerStyle={{padding: 16, paddingBottom: 32, gap: 16}}
      refreshControl={
        <RefreshControl refreshing={subState.status === 'loading'} onRefresh={onRefresh} />
      }
      testID="screen-subscription">
      <PageHeader
        title={t('subscription.title')}
        subtitle={t('subscription.subtitle')}
        icon="SubscriptionIcon"
      />

      {/* Héros */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: glass.bg,
            borderColor: glass.border,
            borderRadius: radii.lg,
            padding: 16,
          },
        ]}>
        <Text style={{fontSize: 11, fontWeight: '700', color: colors.textMuted}}>
          {t('subscription.currentAccess')}
        </Text>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8}}>
          <Text
            style={{
              fontFamily: 'Fraunces-Bold',
              fontSize: 20,
              color: colors.textPrimary,
              flex: 1,
            }}>
            {planLabel(t, abonnement.formule)}
          </Text>
          {abonnement.statut ? (
            <View style={[styles.pill, {backgroundColor: pillBg}]}>
              <Text style={{color: pillFg, fontWeight: '700', fontSize: 12}}>
                {statusLabel(t, abonnement.statut)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* 3 chiffres */}
      <View style={{flexDirection: 'row', gap: 8}}>
        {[
          {
            label: t('subscription.startDate'),
            value: formatDate(abonnement.dateDebut, locale),
            gold: false,
          },
          {
            label: t('subscription.endDate'),
            value: formatDate(abonnement.dateFin, locale),
            gold: true,
          },
          {
            label: t('subscription.paymentMode'),
            value: modeLabel(abonnement.modePaiement, t),
            gold: false,
          },
        ].map(c => (
          <View
            key={c.label}
            style={[
              styles.card,
              {
                flex: 1,
                backgroundColor: glass.bg,
                borderColor: glass.border,
                borderRadius: radii.md,
                padding: 12,
                justifyContent: 'space-between',
              },
            ]}>
            <Text numberOfLines={2} style={{fontSize: 11, color: colors.textSecondary}}>{c.label}</Text>
            <Text
              style={{
                marginTop: 4,
                fontWeight: '700',
                fontSize: 13,
                color: c.gold ? colors.homeGold : colors.textPrimary,
              }}>
              {c.value}
            </Text>
          </View>
        ))}
      </View>

      {/* Action renouveler */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: glass.bg,
            borderColor: glass.border,
            borderRadius: radii.lg,
            padding: 16,
            gap: 12,
          },
        ]}>
        {renewal.paymentInProgress ? (
          <Text style={{color: colors.warning, fontWeight: '600'}}>
            {t('subscription.paymentInProgress', {
              defaultValue: 'Paiement en cours…',
            })}
          </Text>
        ) : null}

        {renewal.phase === 'idle' || renewal.phase === 'success' || renewal.phase === 'error' ? (
          <Pressable
            onPress={() => subscriptionRenewalStore.openPanel()}
            disabled={renewDisabled}
            style={[
              styles.btn,
              {
                backgroundColor: colors.bgDarkPremium,
                opacity: renewDisabled ? 0.5 : 1,
              },
            ]}
            accessibilityRole="button"
            testID="renew-open">
            <Text style={{color: colors.goldPrestige, fontWeight: '700'}}>
              {t('subscription.renewButton')}
            </Text>
          </Pressable>
        ) : null}

        {!online ? (
          <Text style={{color: colors.warning, fontSize: 13}}>
            {t('app.connectivity.offlineMessage')}
          </Text>
        ) : null}

        {/* Panneau choix mode */}
        {renewal.phase === 'choose_mode' ? (
          <View style={{gap: 8}}>
            <Text style={{fontWeight: '600', color: colors.textPrimary}}>
              {t('subscription.chooseMode')}
            </Text>
            <Pressable
              onPress={() => void subscriptionRenewalStore.chooseFcfa()}
              style={[styles.btn, {backgroundColor: colors.blueLight}]}
              testID="renew-fcfa">
              <Text style={{color: colors.bluePrimary, fontWeight: '600'}}>
                {t('subscription.payFcfa')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => subscriptionRenewalStore.chooseDsi()}
              style={[styles.btn, {backgroundColor: colors.goldLight}]}
              testID="renew-dsi">
              <Text style={{color: colors.badgeActiveText, fontWeight: '600'}}>
                {t('subscription.payDsi')}
              </Text>
            </Pressable>
            <Text style={{fontSize: 12, color: colors.textMuted}}>
              {t('subscription.actionNote')}
            </Text>
            <Pressable onPress={() => subscriptionRenewalStore.closePanel()}>
              <Text style={{color: colors.textSecondary}}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Confirmation DSI */}
        {renewal.phase === 'dsi_confirm' ? (
          <View style={{gap: 10}}>
            <Text style={{color: colors.textPrimary}}>
              {t('subscription.confirmWarning', {amount: amountDsi}).replace(
                /<\/?strong>/g,
                '',
              )}
            </Text>
            <Pressable
              onPress={() => void subscriptionRenewalStore.submitDsi()}
              disabled={renewal.submitting}
              style={[
                styles.btn,
                {backgroundColor: colors.bgDarkPremium, opacity: renewal.submitting ? 0.6 : 1},
              ]}
              testID="renew-dsi-confirm">
              <Text style={{color: colors.goldPrestige, fontWeight: '700'}}>
                {renewal.submitting
                  ? t('subscription.processing')
                  : t('subscription.confirmDebit', {amount: amountDsi})}
              </Text>
            </Pressable>
            <Pressable onPress={() => subscriptionRenewalStore.back()}>
              <Text style={{color: colors.textSecondary}}>{t('common.back')}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* FCFA loading */}
        {renewal.phase === 'fcfa_loading_networks' || renewal.phase === 'submitting' ? (
          <View style={{alignItems: 'center', padding: 12}}>
            <ActivityIndicator color={colors.bluePrimary} />
            <Text style={{marginTop: 8, color: colors.textSecondary}}>
              {t('subscription.processing')}
            </Text>
          </View>
        ) : null}

        {/* Hosted confirm */}
        {renewal.phase === 'fcfa_hosted_confirm' ? (
          <View style={{gap: 10}}>
            <Text style={{color: colors.textPrimary}}>
              {t('subscription.continuePayment')}
              {renewal.catalogue
                ? ` — ${renewal.catalogue.montant} ${renewal.catalogue.devise ?? 'XOF'}`
                : ''}
            </Text>
            <Pressable
              onPress={() => void subscriptionRenewalStore.submitFcfaHosted()}
              disabled={renewal.submitting}
              style={[styles.btn, {backgroundColor: colors.bgDarkPremium}]}>
              <Text style={{color: colors.goldPrestige, fontWeight: '700'}}>
                {t('subscription.continuePayment')}
              </Text>
            </Pressable>
            <Pressable onPress={() => subscriptionRenewalStore.back()}>
              <Text style={{color: colors.textSecondary}}>{t('common.back')}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Pick network */}
        {renewal.phase === 'fcfa_pick_network' && renewal.catalogue ? (
          <View style={{gap: 8}}>
            <Text style={{fontWeight: '600'}}>
              {t('inscription.direct.network.title', {
                defaultValue: 'Choisissez un réseau',
              })}
            </Text>
            <Text style={{color: colors.textSecondary, fontSize: 13}}>
              {t('inscription.direct.launch', {
                amount: renewal.catalogue.montant,
                defaultValue: `Total : ${renewal.catalogue.montant}`,
              })}
            </Text>
            {renewal.catalogue.reseaux.map(n => (
              <Pressable
                key={n.code}
                onPress={() => subscriptionRenewalStore.selectNetwork(n)}
                style={[
                  styles.btn,
                  {backgroundColor: colors.bgSurfaceAlt, borderWidth: 1, borderColor: colors.borderLight},
                ]}>
                <Text style={{color: colors.textPrimary, fontWeight: '600'}}>
                  {n.libelle}
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={() => subscriptionRenewalStore.back()}>
              <Text style={{color: colors.textSecondary}}>{t('common.back')}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Formulaire direct */}
        {renewal.phase === 'fcfa_form' && renewal.selectedNetwork && renewal.catalogue ? (
          <View style={{gap: 10}}>
            <Text style={{fontWeight: '600'}}>
              {renewal.selectedNetwork.libelle}
            </Text>
            {renewal.selectedNetwork.otpRequis &&
            renewal.selectedNetwork.instructionsOtp ? (
              <Text style={{fontSize: 12, color: colors.textSecondary}}>
                {renewal.selectedNetwork.instructionsOtp}
              </Text>
            ) : null}
            <Text style={{fontSize: 12, color: colors.textMuted}}>
              {t('inscription.fields.numeroPaiement.label', {
                defaultValue: 'Numéro de paiement',
              })}
            </Text>
            <TextInput
              value={renewal.numeroPaiement}
              onChangeText={v => subscriptionRenewalStore.setField('numeroPaiement', v)}
              keyboardType="phone-pad"
              autoComplete="tel"
              style={[styles.input, {borderColor: colors.borderLight, color: colors.textPrimary}]}
              testID="renew-numero"
            />
            {renewal.fieldErrors.numeroPaiement ? (
              <Text style={{color: colors.error, fontSize: 12}}>
                {t(renewal.fieldErrors.numeroPaiement)}
              </Text>
            ) : null}
            {renewal.selectedNetwork.otpRequis ? (
              <>
                <Text style={{fontSize: 12, color: colors.textMuted}}>
                  {t('inscription.fields.otp.label', {defaultValue: 'Code OTP'})}
                </Text>
                <TextInput
                  value={renewal.otp}
                  onChangeText={v => subscriptionRenewalStore.setField('otp', v)}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  style={[styles.input, {borderColor: colors.borderLight, color: colors.textPrimary}]}
                  testID="renew-otp"
                />
              </>
            ) : null}
            <Pressable
              onPress={() => {
                const e1 = validerChampPaiement('numeroPaiement', renewal.numeroPaiement);
                const e2 = renewal.selectedNetwork?.otpRequis
                  ? validerChampPaiement('otp', renewal.otp)
                  : null;
                if (e1 || e2) {
                  subscriptionRenewalStore.setField('numeroPaiement', renewal.numeroPaiement);
                  // set errors via direct state is limited; submit validates again
                  void subscriptionRenewalStore.submitFcfaDirect();
                  return;
                }
                void subscriptionRenewalStore.submitFcfaDirect();
              }}
              disabled={renewal.submitting}
              style={[styles.btn, {backgroundColor: colors.bgDarkPremium}]}
              testID="renew-submit-fcfa">
              <Text style={{color: colors.goldPrestige, fontWeight: '700'}}>
                {t('inscription.direct.launch', {
                  amount: renewal.catalogue.montant,
                })}
              </Text>
            </Pressable>
            <Pressable onPress={() => subscriptionRenewalStore.back()}>
              <Text style={{color: colors.textSecondary}}>{t('common.back')}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Suivi */}
        {renewal.phase === 'tracking' ? (
          <View style={{gap: 10, alignItems: 'center'}}>
            <ActivityIndicator color={colors.bluePrimary} />
            <Text style={{color: colors.textSecondary}}>
              {t('subscription.processing')}
            </Text>
            {renewal.paymentUrl ? (
              <Pressable
                onPress={() => void subscriptionRenewalStore.reopenHostedPayment()}
                style={[styles.btn, {backgroundColor: colors.blueLight}]}>
                <Text style={{color: colors.bluePrimary, fontWeight: '600'}}>
                  {t('subscription.reopenPayment', {
                    defaultValue: 'Rouvrir la page de paiement',
                  })}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {renewal.phase === 'tracking_timeout' ? (
          <View style={{gap: 10}}>
            <Text style={{color: colors.warning}}>
              {t('subscription.stillPending', {
                defaultValue:
                  'Paiement toujours en attente. Vous pouvez vérifier ou recommencer.',
              })}
            </Text>
            <Pressable
              onPress={() => void subscriptionRenewalStore.verifyNow()}
              style={[styles.btn, {backgroundColor: colors.blueLight}]}>
              <Text style={{color: colors.bluePrimary, fontWeight: '600'}}>
                {t('subscription.verifyNow', {defaultValue: 'Vérifier maintenant'})}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => subscriptionRenewalStore.restartAfterTimeout()}
              style={[styles.btn, {backgroundColor: colors.bgSurfaceAlt}]}>
              <Text style={{color: colors.textPrimary, fontWeight: '600'}}>
                {t('subscription.restart', {defaultValue: 'Recommencer'})}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Historique */}
      <View
        style={[
          styles.card,
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
            fontSize: 16,
            color: colors.textPrimary,
            marginBottom: 12,
          }}>
          {t('subscription.historyTitle')}
        </Text>
        {abonnement.renouvellements.length === 0 ? (
          <Text style={{color: colors.textSecondary, fontSize: 13}}>
            {t('subscription.historyEmpty')}
          </Text>
        ) : (
          abonnement.renouvellements.map((item, idx) => (
            <View
              key={`${item.date}-${idx}`}
              style={{
                paddingVertical: 10,
                borderBottomWidth: idx < abonnement.renouvellements.length - 1 ? StyleSheet.hairlineWidth : 0,
                borderBottomColor: colors.borderLight,
              }}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                <Text style={{color: colors.textPrimary, fontWeight: '600'}}>
                  {formatDate(item.date, locale)}
                </Text>
                <Text style={{color: colors.textSecondary}}>
                  {statusLabel(t, item.statut)}
                </Text>
              </View>
              <Text style={{color: colors.textSecondary, fontSize: 12, marginTop: 2}}>
                {t('subscription.modeLabel')} {modeLabel(item.modePaiement, t)}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  card: {borderWidth: 1},
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});
