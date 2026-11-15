/**
 * Pièce Avoirs DSI (L3c).
 */

import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Text, useTheme, Icon} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {withdrawalsStore} from '@shared/store';
import {memberBalanceStore} from '../../home/store/homeDashboardStore';
import {GiftCodeOverlay} from '../components/GiftCodeOverlay';
import {withdrawalStatusMeta} from '@core/utils/withdrawalStatusMeta';
import {connectivityStore} from '@shared/store';

function fmt(n: number, locale: string) {
  return new Intl.NumberFormat(locale).format(n);
}
function fmtDate(iso: string | null | undefined, locale: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function MemberDsiHoldingsScreen() {
  const {t, i18n} = useTranslation();
  const {colors, radii, glass} = useTheme();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';
  const navigation = useNavigation<any>();
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

  const [useOpen, setUseOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);

  useEffect(() => {
    void memberBalanceStore.load().then(() => {
      setLoadedAt(new Date().toISOString());
    });
    void withdrawalsStore.load();
  }, []);

  useEffect(() => {
    if (bal.status === 'success' && bal.data) {
      setLoadedAt(new Date().toISOString());
    }
  }, [bal.status, bal.data]);

  const solde = bal.data?.soldeDsiActuel ?? 0;
  const total = bal.data?.totalDsiGagnes ?? 0;
  const recent = (wd.data?.retraits ?? []).slice(0, 3);
  const loading = bal.status === 'loading' && !bal.data;

  if (loading) {
    return (
      <View style={[styles.center, {padding: 24}]} testID="dsi-skeleton">
        <ActivityIndicator color={colors.bluePrimary} />
        <Text style={{marginTop: 12, color: colors.textSecondary}}>
          {t('dsi.loading')}
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={{flex: 1, backgroundColor: 'transparent'}}
        contentContainerStyle={{padding: 16, paddingBottom: 32, gap: 16}}
        refreshControl={
          <RefreshControl
            refreshing={bal.status === 'loading'}
            onRefresh={() => {
              void memberBalanceStore.load({force: true});
              void withdrawalsStore.load({force: true});
            }}
          />
        }
        testID="screen-dsi">
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
            <Icon name="DsiIcon" size={26} color={colors.bluePrimary} />
          </View>
          <View style={{flex: 1}}>
            <Text style={{fontFamily: 'Fraunces-Bold', fontSize: 22, color: colors.textPrimary}}>
              {t('dsi.title')}
            </Text>
            <Text style={{color: colors.textSecondary, fontSize: 14}}>
              {t('dsi.subtitle')}
            </Text>
          </View>
        </View>

        {/* Héros */}
        <View
          style={{
            backgroundColor: colors.bgDarkPremium,
            borderRadius: radii.lg,
            padding: 20,
            gap: 10,
          }}>
          <Text style={{color: colors.goldPrestige, fontWeight: '700', fontSize: 12}}>
            {t('dsi.balanceLabel')}
          </Text>
          <Text style={{fontFamily: 'Fraunces-Bold', fontSize: 36, color: colors.textOnDark}}>
            {fmt(solde, locale)}
          </Text>
          <Text style={{color: colors.textOnDark, opacity: 0.8, fontSize: 13}}>
            {t('dsi.balanceDescription')}
          </Text>
          <Pressable
            onPress={() => setUseOpen(o => !o)}
            style={[styles.btn, {backgroundColor: colors.goldPrestige}]}>
            <Text style={{color: colors.bgDarkPremium, fontWeight: '700'}}>
              {t('dsi.useButton')}
            </Text>
          </Pressable>
          {useOpen ? (
            <View style={{gap: 8}}>
              <Pressable
                onPress={() => navigation.navigate('MemberSubscription')}
                style={[styles.choice, {borderColor: colors.goldBorder}]}>
                <Icon name="SubscriptionIcon" size={20} color={colors.goldPrestige} />
                <Text style={{color: colors.textOnDark, fontWeight: '600'}}>
                  {t('dsi.use.subscription', {defaultValue: t('rooms.subscription')})}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.getParent()?.navigate('Shop')}
                style={[styles.choice, {borderColor: colors.goldBorder}]}>
                <Icon name="BagIcon" size={20} color={colors.goldPrestige} />
                <Text style={{color: colors.textOnDark, fontWeight: '600'}}>
                  {t('dsi.use.shop', {defaultValue: 'Boutique'})}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.getParent()?.navigate('Marketplace')}
                style={[styles.choice, {borderColor: colors.goldBorder}]}>
                <Icon name="StoreIcon" size={20} color={colors.goldPrestige} />
                <Text style={{color: colors.textOnDark, fontWeight: '600'}}>
                  {t('dsi.use.marketplace', {defaultValue: 'Marketplace'})}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* Bandeau cadeau */}
        <View
          style={{
            backgroundColor: glass.bg,
            borderColor: glass.border,
            borderWidth: 1,
            borderRadius: radii.lg,
            padding: 16,
            gap: 10,
          }}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
            <Icon name="GiftIcon" size={28} color={colors.goldPrestige} />
            <View style={{flex: 1}}>
              <Text style={{fontWeight: '700', color: colors.textPrimary}}>
                {t('dsi.giftBannerTitle')}
              </Text>
              <Text style={{color: colors.textSecondary, fontSize: 13}}>
                {t('dsi.giftBannerText')}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => setGiftOpen(true)}
            disabled={!online}
            style={[
              styles.btn,
              {
                backgroundColor: colors.bgDarkPremium,
                opacity: online ? 1 : 0.5,
              },
            ]}>
            <Text style={{color: colors.goldPrestige, fontWeight: '700'}}>
              {t('dsi.giftOpen')}
            </Text>
          </Pressable>
        </View>

        {/* Stats */}
        <View style={{flexDirection: 'row', gap: 8}}>
          <View
            style={{
              flex: 1,
              padding: 14,
              borderRadius: radii.md,
              backgroundColor: glass.bg,
              borderWidth: 1,
              borderColor: colors.goldBorder,
            }}>
            <Text style={{fontSize: 11, color: colors.textSecondary}}>
              {t('dsi.statEarned')}
            </Text>
            <Text style={{fontFamily: 'Fraunces-Bold', fontSize: 20, color: colors.homeGold}}>
              {fmt(total, locale)}
            </Text>
            <Text style={{fontSize: 11, color: colors.textMuted}}>
              {t('dsi.statEarnedNote')}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              padding: 14,
              borderRadius: radii.md,
              backgroundColor: glass.bg,
              borderWidth: 1,
              borderColor: glass.border,
            }}>
            <Text style={{fontSize: 11, color: colors.textSecondary}}>
              {t('dsi.statUpdated')}
            </Text>
            <Text style={{fontWeight: '700', fontSize: 14, color: colors.textPrimary}}>
              {fmtDate(loadedAt, locale)}
            </Text>
            <Text style={{fontSize: 11, color: colors.textMuted}}>
              {t('dsi.statUpdatedNote')}
            </Text>
          </View>
        </View>

        {/* Retraits récents */}
        <View
          style={{
            backgroundColor: glass.bg,
            borderColor: glass.border,
            borderWidth: 1,
            borderRadius: radii.lg,
            padding: 16,
            gap: 10,
          }}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={{fontFamily: 'Fraunces-Bold', fontSize: 16, color: colors.textPrimary}}>
              {t('dsi.recentWithdrawals')}
            </Text>
            <Pressable onPress={() => navigation.navigate('MemberWithdrawals')}>
              <Text style={{color: colors.bluePrimary, fontWeight: '600', fontSize: 13}}>
                {t('dsi.viewAllWithdrawals')}
              </Text>
            </Pressable>
          </View>
          {recent.length === 0 ? (
            <Text style={{color: colors.textSecondary}}>{t('dsi.emptyWithdrawals')}</Text>
          ) : (
            recent.map(item => {
              const meta = withdrawalStatusMeta(item.statut);
              return (
                <View
                  key={item.idRetrait}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 8,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.borderLight,
                  }}>
                  <View>
                    <Text style={{fontWeight: '600', color: colors.textPrimary}}>
                      {fmt(item.montantDsiDemande, locale)} DSI
                    </Text>
                    <Text style={{fontSize: 12, color: colors.textSecondary}}>
                      {fmtDate(item.dateDemande, locale)}
                    </Text>
                  </View>
                  <Text style={{color: colors.textSecondary, fontSize: 12}}>
                    {meta.labelKey ? t(meta.labelKey) : meta.status}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* Historique DSI non branché (route non capturée) */}
        <View
          style={{
            backgroundColor: glass.bg,
            borderColor: glass.border,
            borderWidth: 1,
            borderRadius: radii.lg,
            padding: 16,
            gap: 6,
          }}>
          <Text style={{fontFamily: 'Fraunces-Bold', fontSize: 16, color: colors.textPrimary}}>
            {t('dsi.historyTitle')}
          </Text>
          <Text style={{color: colors.textSecondary, fontSize: 13}}>
            {t('dsi.historySubtitle')}
          </Text>
          <Text style={{color: colors.textMuted, fontSize: 13}}>{t('dsi.historySoon')}</Text>
        </View>
      </ScrollView>

      <GiftCodeOverlay visible={giftOpen} onClose={() => setGiftOpen(false)} />
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
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
});
