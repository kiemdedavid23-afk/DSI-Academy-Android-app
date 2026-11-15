/**
 * Pièce Retraits (L3c).
 */

import React, {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import type {ComponentRef} from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import {Text, useTheme, Icon} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {bannerStore} from '@shared/store';
import {
  withdrawalsStore,
  memberProfileStore,
  connectivityStore,
  getDisplayPricing,
} from '@shared/store';
import {memberBalanceStore} from '../../home/store/homeDashboardStore';
import {withdrawalRequestStore} from '../store/withdrawalRequestStore';
import {withdrawalNet} from '@core/utils/dsi';
import {withdrawalStatusMeta} from '@core/utils/withdrawalStatusMeta';
import {
  COUNTRIES,
  countryLabel,
  isKnownCountry,
} from '@core/data/countries';

function fmt(n: number, locale: string) {
  return new Intl.NumberFormat(locale).format(n);
}
function fmtDate(iso: string | null | undefined, locale: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(locale);
  } catch {
    return '—';
  }
}

function detectMoyenKind(name: string): 'phone' | 'bank' | 'card' | 'other' {
  const s = name.toLowerCase();
  if (/orange|moov|mtn|wave|mobile|money|airtel/.test(s)) return 'phone';
  if (/banque|bank|virement/.test(s)) return 'bank';
  if (/carte|card|visa/.test(s)) return 'card';
  return 'other';
}

export function MemberWithdrawalsScreen() {
  const {t, i18n} = useTranslation();
  const {colors, radii, glass} = useTheme();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';
  const lang = i18n.language?.startsWith('en') ? 'en' : 'fr';
  const online = useSyncExternalStore(
    connectivityStore.subscribe,
    () => connectivityStore.isOnline(),
    () => true,
  );

  const bal = useSyncExternalStore(
    cb => memberBalanceStore.subscribe(() => cb()),
    () => memberBalanceStore.getState(),
  );
  const wd = useSyncExternalStore(
    cb => withdrawalsStore.subscribe(() => cb()),
    () => withdrawalsStore.getState(),
  );
  const form = useSyncExternalStore(
    withdrawalRequestStore.subscribe,
    () => withdrawalRequestStore.getState(),
  );
  const profile = useSyncExternalStore(
    cb => memberProfileStore.subscribe(() => cb()),
    () => memberProfileStore.getState(),
  );

  const [formOpen, setFormOpen] = useState(false);
  const [countryPicker, setCountryPicker] = useState(false);
  const {detailId, detailEvents, detailLoading} = form;
  const pricing = getDisplayPricing();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const formY = useRef(0);

  useEffect(() => {
    void memberBalanceStore.load();
    void withdrawalsStore.load();
    void memberProfileStore.load();
    return () => withdrawalRequestStore.leaveScreen();
  }, []);

  // Messages du Worker : bannière. Seule la saisie incomplète reste sous le formulaire.
  useEffect(() => {
    const m = form.errorMessage;
    if (!m || m === 'withdrawals.errors.required') {
      return;
    }
    bannerStore.notify({
      tone: 'error',
      type: 'withdrawal-error',
      message: m.includes('.') ? t(m) : m,
    });
  }, [form.errorMessage, t]);

  useEffect(() => {
    if (form.uncertain) {
      bannerStore.notify({
        tone: 'warning',
        type: 'withdrawal-uncertain',
        message: t('withdrawals.uncertainResult'),
      });
    }
  }, [form.uncertain, t]);

  useEffect(() => {
    if (form.success) {
      bannerStore.notify({
        tone: 'success',
        type: 'withdrawal-success',
        message: form.success.message || t('withdrawals.successDefault'),
      });
    }
  }, [form.success, t]);

  useEffect(() => {
    if (form.pays) {
      return;
    }
    const pays = profile.data?.pays;
    const target = pays && isKnownCountry(pays) ? pays : 'BF';
    withdrawalRequestStore.setPays(target);
    void withdrawalRequestStore.loadMoyens(target);
  }, [profile.data?.pays, form.pays]);

  const solde = bal.data?.soldeDsiActuel ?? 0;
  const totalGagne = bal.data?.totalDsiGagnes ?? 0;
  const liste = wd.data?.retraits ?? [];
  const pending = liste.filter(
    r => !['payee', 'rejetee'].includes((r.statut || '').toLowerCase()),
  ).length;
  const totalDemande = liste.reduce((s, r) => s + (r.montantDsiDemande || 0), 0);
  const dernier = liste[0];
  const montantNum = parseInt(form.montantDsi, 10);
  const estimate =
    Number.isFinite(montantNum) && montantNum > 0
      ? withdrawalNet(montantNum)
      : null;

  const loading = bal.status === 'loading' && !bal.data;

  if (loading) {
    return (
      <View style={[styles.center, {padding: 24}]} testID="withdrawals-skeleton">
        <ActivityIndicator color={colors.bluePrimary} />
        <Text style={{marginTop: 12, color: colors.textSecondary}}>
          {t('withdrawals.loading')}
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={{flex: 1, backgroundColor: 'transparent'}}
        contentContainerStyle={{padding: 16, paddingBottom: 40, gap: 16}}
        refreshControl={
          <RefreshControl
            refreshing={bal.status === 'loading' || wd.status === 'loading'}
            onRefresh={() => {
              void memberBalanceStore.load({force: true});
              void withdrawalsStore.load({force: true});
            }}
          />
        }
        testID="screen-withdrawals">
        {/* Header */}
        <View style={{flexDirection: 'row', gap: 12, alignItems: 'center'}}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: radii.md,
              backgroundColor: colors.blueLight,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon name="WithdrawalsIcon" size={26} color={colors.bluePrimary} />
          </View>
          <View style={{flex: 1}}>
            <Text style={{fontFamily: 'Fraunces-Bold', fontSize: 22, color: colors.textPrimary}}>
              {t('withdrawals.title')}
            </Text>
            <Text style={{color: colors.textSecondary, fontSize: 14}}>
              {t('withdrawals.subtitle')}
            </Text>
          </View>
        </View>

        {/* Hero solde */}
        <View
          style={{
            backgroundColor: colors.bgDarkPremium,
            borderRadius: radii.lg,
            padding: 20,
            gap: 8,
          }}>
          <Text style={{color: colors.goldPrestige, fontSize: 12, fontWeight: '700'}}>
            {t('withdrawals.balanceLabel')}
          </Text>
          <Text style={{fontFamily: 'Fraunces-Bold', fontSize: 36, color: colors.textOnDark}}>
            {fmt(solde, locale)}
          </Text>
          <Text style={{color: colors.textOnDark, opacity: 0.85}}>
            {t('withdrawals.totalEarned')}{' '}
            <Text style={{fontWeight: '700'}}>{fmt(totalGagne, locale)} DSI</Text>
          </Text>
          <Pressable
            onPress={() => {
              setFormOpen(o => {
                const next = !o;
                if (next) {
                  setTimeout(() => scrollRef.current?.scrollTo({y: formY.current, animated: true}), 50);
                }
                return next;
              });
            }}
            disabled={!online}
            style={[
              styles.btn,
              {
                backgroundColor: colors.goldPrestige,
                marginTop: 8,
                opacity: online ? 1 : 0.5,
              },
            ]}
            testID="withdraw-toggle-form">
            <Text style={{color: colors.bgDarkPremium, fontWeight: '700'}}>
              {formOpen ? t('withdrawals.closeForm') : t('withdrawals.withdrawButton')}
            </Text>
          </Pressable>
        </View>

        {/* Stats */}
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
          {[
            {label: t('withdrawals.totalRequested'), value: `${fmt(totalDemande, locale)} DSI`},
            {label: t('withdrawals.pending'), value: String(pending)},
            {
              label: t('withdrawals.lastWithdrawal'),
              value: dernier ? fmtDate(dernier.dateDemande, locale) : t('withdrawals.none'),
            },
            {
              label: t('withdrawals.lastStatus'),
              value: dernier
                ? t(`withdrawals.status.${dernier.statut}`, {
                    defaultValue: dernier.statut || '—',
                  })
                : '—',
            },
          ].map(c => (
            <View
              key={c.label}
              style={{
                width: '48%',
                flexGrow: 1,
                padding: 12,
                borderRadius: radii.md,
                backgroundColor: glass.bg,
                borderWidth: 1,
                borderColor: glass.border,
              }}>
              <Text style={{fontSize: 11, color: colors.textSecondary}}>{c.label}</Text>
              <Text style={{marginTop: 4, fontWeight: '700', color: colors.textPrimary}}>
                {c.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Formulaire */}
        {formOpen ? (
          <View
            onLayout={e => {
              formY.current = e.nativeEvent.layout.y;
            }}
            style={{
              backgroundColor: glass.bg,
              borderColor: glass.border,
              borderWidth: 1,
              borderRadius: radii.lg,
              padding: 16,
              gap: 12,
            }}>
            <Text style={{fontSize: 12, color: colors.textMuted}}>
              {t('withdrawals.infoWindow', {
                start: pricing.withdrawalWindowStartHour,
                end: pricing.withdrawalWindowEndHour,
              })}
            </Text>
            <Text style={{fontSize: 12, color: colors.textMuted}}>
              {t('withdrawals.infoOncePerDay')}
            </Text>
            <Text style={{fontSize: 12, color: colors.textMuted}}>
              {t('withdrawals.infoFees', {
                fixed: pricing.withdrawalFeeFixedFcfa,
                rate: pricing.withdrawalFeeRatePct,
              })}
            </Text>

            {/* Pays */}
            <Text style={{fontWeight: '600', color: colors.textPrimary}}>
              {t('withdrawals.countryLabel')}
            </Text>
            <Pressable
              onPress={() => setCountryPicker(true)}
              style={[styles.input, {borderColor: colors.borderLight, justifyContent: 'center'}]}>
              <Text style={{color: colors.textPrimary}}>
                {form.pays
                  ? countryLabel(form.pays, lang as 'fr' | 'en')
                  : t('withdrawals.searchCountry')}
              </Text>
            </Pressable>

            {/* Moyens */}
            <Text style={{fontWeight: '600', color: colors.textPrimary}}>
              {t('withdrawals.paymentMethod')}
            </Text>
            {form.moyensLoading ? (
              <ActivityIndicator color={colors.bluePrimary} />
            ) : form.moyens.length === 0 ? (
              <Text style={{color: colors.textSecondary}}>{t('withdrawals.noMethods')}</Text>
            ) : (
              form.moyens.map(m => {
                const selected = form.moyenPaiement === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => withdrawalRequestStore.setMoyen(m)}
                    accessibilityRole="radio"
                    accessibilityState={{checked: selected}}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      padding: 12,
                      borderRadius: radii.md,
                      borderWidth: 1,
                      borderColor: selected ? colors.goldPrestige : colors.borderLight,
                      backgroundColor: selected ? colors.goldLight : colors.bgSurface,
                    }}>
                    <Text style={{color: colors.textPrimary, fontWeight: selected ? '700' : '500'}}>
                      {m}
                    </Text>
                  </Pressable>
                );
              })
            )}

            {/* Montant */}
            <Text style={{fontWeight: '600'}}>{t('withdrawals.amountLabel')}</Text>
            <TextInput
              value={form.montantDsi}
              onChangeText={v => withdrawalRequestStore.setMontant(v)}
              keyboardType="number-pad"
              placeholder={t('withdrawals.amountPlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, {borderColor: colors.borderLight, color: colors.textPrimary}]}
              testID="withdraw-amount"
            />
            {estimate ? (
              <View style={{gap: 4}}>
                <Text style={{fontSize: 13, color: colors.textSecondary}}>
                  {t('withdrawals.estimateBrut', {
                    defaultValue: 'Brut (estimation)',
                  })}
                  : {fmt(estimate.brut, locale)} FCFA
                </Text>
                <Text style={{fontSize: 13, color: colors.textSecondary}}>
                  {t('withdrawals.estimateFees', {defaultValue: 'Frais (estimation)'})}
                  : {fmt(estimate.frais, locale)} FCFA
                </Text>
                <Text style={{fontSize: 14, fontWeight: '700', color: colors.homeGold}}>
                  {t('withdrawals.estimateNet', {defaultValue: 'Net reçu (estimation)'})}
                  : {fmt(estimate.net, locale)} FCFA
                </Text>
                {estimate.net <= 0 ? (
                  <Text style={{color: colors.error, fontSize: 13}} accessibilityRole="alert">
                    {t('withdrawals.amountTooLow')}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {/* Numéro */}
            <Text style={{fontWeight: '600'}}>{t('withdrawals.field.numero')}</Text>
            <TextInput
              value={form.numeroPaiement}
              onChangeText={v => withdrawalRequestStore.setNumero(v)}
              keyboardType={
                form.moyenPaiement && detectMoyenKind(form.moyenPaiement) === 'phone'
                  ? 'phone-pad'
                  : 'default'
              }
              style={[styles.input, {borderColor: colors.borderLight, color: colors.textPrimary}]}
              testID="withdraw-numero"
            />

            {form.errorMessage === 'withdrawals.errors.required' ? (
              <Text style={{color: colors.error}} accessibilityRole="alert">
                {t('withdrawals.errors.required')}
              </Text>
            ) : null}
            {form.success ? (
              <View
                style={{backgroundColor: colors.successBg, padding: 12, borderRadius: radii.md}}
                accessibilityRole="summary">
                <Text style={{color: colors.textPrimary, fontSize: 13}}>
                  {fmt(form.success.montantDsiDemande, locale)} DSI →{' '}
                  {fmt(form.success.montantFcfaDemande, locale)} FCFA brut, frais{' '}
                  {fmt(form.success.fraisRetraitFcfa, locale)}, net{' '}
                  {fmt(form.success.montantFcfa, locale)} FCFA
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => void withdrawalRequestStore.submit()}
              disabled={form.submitting || !online}
              style={[
                styles.btn,
                {
                  backgroundColor: colors.bgDarkPremium,
                  opacity: form.submitting || !online ? 0.5 : 1,
                },
              ]}
              testID="withdraw-submit">
              <Text style={{color: colors.goldPrestige, fontWeight: '700'}}>
                {form.submitting
                  ? t('withdrawals.submitting')
                  : t('withdrawals.submit')}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Historique */}
        <View
          style={{
            backgroundColor: glass.bg,
            borderColor: glass.border,
            borderWidth: 1,
            borderRadius: radii.lg,
            padding: 16,
            gap: 10,
          }}>
          <Text style={{fontFamily: 'Fraunces-Bold', fontSize: 16, color: colors.textPrimary}}>
            {t('withdrawals.historyTitle')}
          </Text>
          {liste.length === 0 ? (
            <Text style={{color: colors.textSecondary}}>{t('withdrawals.emptyHistory')}</Text>
          ) : (
            liste.map(item => {
              const meta = withdrawalStatusMeta(item.statut);
              return (
                <Pressable
                  key={item.idRetrait}
                  onPress={() => void withdrawalRequestStore.openDetail(item.idRetrait)}
                  style={{
                    padding: 12,
                    borderRadius: radii.md,
                    borderWidth: 1,
                    borderColor: colors.borderLight,
                    gap: 4,
                  }}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <Text style={{fontWeight: '700', color: colors.textPrimary}}>
                      {fmt(item.montantDsiDemande, locale)} DSI
                    </Text>
                    <Text
                      style={{
                        color: meta.isRejected
                          ? colors.error
                          : meta.isTerminal
                            ? colors.success
                            : colors.warning,
                        fontWeight: '600',
                        fontSize: 12,
                      }}>
                      {meta.labelKey
                        ? t(meta.labelKey)
                        : meta.status}
                    </Text>
                  </View>
                  <Text style={{color: colors.textSecondary, fontSize: 13}}>
                    {fmt(item.montantFcfa, locale)} FCFA · {fmtDate(item.dateDemande, locale)}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Country picker */}
      <Modal visible={countryPicker} animationType="slide" transparent>
        <View style={{flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end'}}>
          <View
            style={{
              backgroundColor: colors.bgSurface,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: '70%',
              padding: 16,
            }}>
            <Text style={{fontWeight: '700', marginBottom: 12}}>
              {t('withdrawals.countryLabel')}
            </Text>
            <FlatList
              data={[...COUNTRIES]}
              keyExtractor={c => c.code}
              renderItem={({item}) => (
                <Pressable
                  onPress={() => {
                    withdrawalRequestStore.setPays(item.code);
                    void withdrawalRequestStore.loadMoyens(item.code);
                    setCountryPicker(false);
                  }}
                  style={{paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight}}>
                  <Text style={{color: colors.textPrimary}}>
                    {lang === 'en' ? item.nameEn : item.nameFr}
                  </Text>
                </Pressable>
              )}
            />
            <Pressable onPress={() => setCountryPicker(false)} style={{padding: 12}}>
              <Text style={{color: colors.bluePrimary, textAlign: 'center'}}>
                {t('common.close')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Detail sheet */}
      <Modal visible={!!detailId} animationType="slide" transparent>
        <View style={{flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end'}}>
          <View
            style={{
              backgroundColor: colors.bgSurface,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: '80%',
              padding: 20,
              gap: 12,
            }}>
            <Text style={{fontFamily: 'Fraunces-Bold', fontSize: 18}}>
              {t('withdrawals.details')}
            </Text>
            {detailLoading ? (
              <ActivityIndicator color={colors.bluePrimary} />
            ) : (
              <>
                {(() => {
                  const item = liste.find(x => x.idRetrait === detailId);
                  const meta = withdrawalStatusMeta(item?.statut);
                  if (meta.isRejected) {
                    return (
                      <Text style={{color: colors.error}}>
                        {t('withdrawals.rejectedMessage', {
                          defaultValue: 'Cette demande a été rejetée. Les DSI ont été restitués.',
                        })}
                      </Text>
                    );
                  }
                  if (meta.showFrieze) {
                    return (
                      <View style={{flexDirection: 'row', gap: 6}}>
                        {['demande', 'validee', 'envoyee', 'payee'].map((s, i) => {
                          const done = meta.friezeIndex >= i;
                          return (
                            <View key={s} style={{flex: 1, alignItems: 'center', gap: 4}}>
                              <View
                                style={{
                                  height: 6,
                                  width: '100%',
                                  borderRadius: 3,
                                  backgroundColor: done
                                    ? colors.goldPrestige
                                    : colors.bgSurfaceAlt,
                                }}
                              />
                              <Text style={{fontSize: 10, color: colors.textSecondary}}>
                                {t(`withdrawals.status.${s}`)}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    );
                  }
                  return (
                    <Text style={{color: colors.textSecondary}}>{meta.status}</Text>
                  );
                })()}
                <Text style={{fontWeight: '600'}}>{t('withdrawals.colStatus')}</Text>
                {detailEvents.length === 0 ? (
                  <Text style={{color: colors.textMuted}}>—</Text>
                ) : (
                  detailEvents.map((ev, idx) => (
                    <Text key={idx} style={{fontSize: 13, color: colors.textSecondary}}>
                      {fmtDate(ev.date, locale)} · {ev.champ || '—'} :{' '}
                      {ev.ancienneValeur ?? '—'} → {ev.nouvelleValeur ?? '—'}
                    </Text>
                  ))
                )}
              </>
            )}
            <Pressable
              onPress={() => withdrawalRequestStore.closeDetail()}
              style={[styles.btn, {backgroundColor: colors.bgDarkPremium}]}>
              <Text style={{color: colors.goldPrestige, fontWeight: '700'}}>
                {t('common.close')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
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
