/**
 * Pièce Paiements — historique paginé (L3b).
 */

import React, {useEffect, useSyncExternalStore} from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {Text, useTheme, Icon} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {formatMontant} from '@core/utils/formatMontant';
import {paymentsHistoryStore} from '../store/paymentsHistoryStore';

function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(locale);
  } catch {
    return '—';
  }
}

export function MemberPaymentHistoryScreen() {
  const {t, i18n} = useTranslation();
  const {colors, radii, glass} = useTheme();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';

  const st = useSyncExternalStore(
    paymentsHistoryStore.subscribe,
    () => paymentsHistoryStore.getState(),
    () => paymentsHistoryStore.getState(),
  );

  useEffect(() => {
    void paymentsHistoryStore.load(1);
  }, []);

  const loading = st.status === 'loading' && st.items.length === 0;
  const paidOnPage = st.items.filter(i => i.statut === 'paid').length;
  const pendingOnPage = st.items.filter(i => i.statut === 'pending').length;

  if (loading) {
    return (
      <View style={[styles.center, {padding: 24}]} testID="payments-skeleton">
        <ActivityIndicator color={colors.bluePrimary} />
        <Text style={{marginTop: 12, color: colors.textSecondary}}>
          {t('payments.loading')}
        </Text>
      </View>
    );
  }

  if (st.status === 'error' && st.items.length === 0) {
    return (
      <View style={[styles.center, {padding: 24}]} testID="payments-error">
        <Text style={{color: colors.textSecondary, textAlign: 'center'}}>
          {st.error?.includes('.') ? t(st.error) : st.error}
        </Text>
        <Pressable
          onPress={() => void paymentsHistoryStore.load(1, {force: true})}
          style={[styles.btn, {backgroundColor: colors.bgDarkPremium, marginTop: 16}]}>
          <Text style={{color: colors.goldPrestige, fontWeight: '600'}}>
            {t('common.retry')}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: 'transparent'}}
      contentContainerStyle={{padding: 16, paddingBottom: 32, gap: 16}}
      refreshControl={
        <RefreshControl
          refreshing={st.pageLoading || (st.status === 'loading' && st.items.length > 0)}
          onRefresh={() => {
            paymentsHistoryStore.invalidate();
            void paymentsHistoryStore.load(st.page, {force: true});
          }}
        />
      }
      testID="screen-payments">
      {/* En-tête */}
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: radii.md,
            backgroundColor: colors.blueLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon name="PaymentsIcon" size={26} color={colors.bluePrimary} />
        </View>
        <View style={{flex: 1}}>
          <Text
            style={{
              fontFamily: 'Fraunces-Bold',
              fontSize: 22,
              color: colors.textPrimary,
            }}>
            {t('payments.title')}
          </Text>
          <Text style={{color: colors.textSecondary, fontSize: 14}}>
            {t('payments.subtitle')}
          </Text>
        </View>
      </View>

      {/* Héros */}
      <View
        style={{
          backgroundColor: colors.bgDarkPremium,
          borderRadius: radii.lg,
          padding: 20,
          gap: 8,
        }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: colors.goldPrestige,
            backgroundColor: 'rgba(212,175,55,0.14)',
            alignSelf: 'flex-start',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: radii.sm,
            overflow: 'hidden',
          }}>
          {t('payments.heroLabel')}
        </Text>
        <Text
          style={{
            fontFamily: 'Fraunces-Bold',
            fontSize: 38,
            color: colors.textOnDark,
            lineHeight: 42,
          }}>
          {st.total}
        </Text>
        <Text style={{color: colors.textOnDark, fontSize: 14, opacity: 0.85}}>
          {st.total <= 1
            ? t('payments.heroCaption')
            : t('payments.heroCaptionPlural')}
        </Text>
      </View>

      {/* 3 stats page */}
      <View style={{flexDirection: 'row', gap: 8}}>
        {[
          {label: t('payments.statPaid'), value: String(paidOnPage), gold: false},
          {
            label: t('payments.statPending'),
            value: String(pendingOnPage),
            gold: true,
          },
          {
            label: t('payments.statPage'),
            value: `${st.page} / ${Math.max(st.totalPages, 1)}`,
            gold: false,
          },
        ].map(c => (
          <View
            key={c.label}
            style={{
              flex: 1,
              minHeight: 80,
              padding: 12,
              borderRadius: radii.md,
              backgroundColor: glass.bg,
              borderWidth: 1,
              borderColor: c.gold ? colors.goldBorder : glass.border,
            }}>
            <Text style={{fontSize: 11, color: colors.textSecondary}}>{c.label}</Text>
            <Text
              style={{
                marginTop: 6,
                fontWeight: '700',
                fontSize: 18,
                color: c.gold ? colors.homeGold : colors.textPrimary,
              }}>
              {c.value}
            </Text>
          </View>
        ))}
      </View>

      {/* Liste */}
      <View
        style={{
          backgroundColor: glass.bg,
          borderColor: glass.border,
          borderWidth: 1,
          borderRadius: radii.lg,
          padding: 16,
          opacity: st.pageLoading ? 0.55 : 1,
          gap: 12,
        }}>
        {st.items.length === 0 ? (
          <Text style={{color: colors.textSecondary}}>{t('payments.empty')}</Text>
        ) : (
          st.items.map((item, idx) => {
            const stKey = item.statut;
            const isPaid = stKey === 'paid';
            const isPending = stKey === 'pending';
            const pillBg = isPaid
              ? colors.successBg
              : isPending
                ? colors.warningBg
                : colors.bgSurfaceAlt;
            const pillFg = isPaid
              ? colors.success
              : isPending
                ? colors.warning
                : colors.textSecondary;
            const label = isPaid
              ? t('payments.statusPaid')
              : isPending
                ? t('payments.statusPending')
                : stKey || t('payments.statusUnknown');
            return (
              <View
                key={item.idTransaction ?? `${idx}`}
                style={{
                  padding: 14,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.borderLight,
                  backgroundColor: colors.bgSurface,
                  gap: 6,
                }}
                accessibilityRole="summary">
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                  <Text style={{color: colors.textSecondary, fontSize: 13}}>
                    {formatDate(
                      item.dateConfirmation || item.dateCreation,
                      locale,
                    )}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: pillBg,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 999,
                    }}>
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: pillFg,
                      }}
                    />
                    <Text style={{color: pillFg, fontWeight: '700', fontSize: 12}}>
                      {label}
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    fontFamily: 'Fraunces-Bold',
                    fontSize: 20,
                    color: colors.textPrimary,
                  }}>
                  {formatMontant(item.montant, item.devise, locale)}
                </Text>
                <Text style={{color: colors.textSecondary, fontSize: 13}}>
                  {[item.typePaiement, item.plateforme]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </Text>
                <Text style={{color: colors.textMuted, fontSize: 12}}>
                  {t('payments.colRef')}: {item.referenceExterne || item.idTransaction || '—'}
                </Text>
              </View>
            );
          })
        )}
      </View>

      {/* Pager */}
      {st.totalPages > 1 ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
          <Pressable
            onPress={() => paymentsHistoryStore.prevPage()}
            disabled={st.page <= 1 || st.pageLoading}
            style={[
              styles.btn,
              {
                backgroundColor: colors.bgSurfaceAlt,
                opacity: st.page <= 1 || st.pageLoading ? 0.4 : 1,
              },
            ]}>
            <Text style={{color: colors.textPrimary, fontWeight: '600'}}>
              {t('payments.prev')}
            </Text>
          </Pressable>
          <Text style={{color: colors.textSecondary, fontSize: 13}}>
            {st.totalPages <= 1
              ? t('payments.pageInfo', {page: st.page, total: st.totalPages})
              : t('payments.pageInfoPlural', {
                  page: st.page,
                  total: st.totalPages,
                })}
          </Text>
          <Pressable
            onPress={() => paymentsHistoryStore.nextPage()}
            disabled={st.page >= st.totalPages || st.pageLoading}
            style={[
              styles.btn,
              {
                backgroundColor: colors.bgSurfaceAlt,
                opacity: st.page >= st.totalPages || st.pageLoading ? 0.4 : 1,
              },
            ]}>
            <Text style={{color: colors.textPrimary, fontWeight: '600'}}>
              {t('payments.next')}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
});
