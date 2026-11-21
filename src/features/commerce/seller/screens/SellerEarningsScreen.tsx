/**
 * Mes gains (lot S8) : solde réel du Paiement (disponible, en attente), bouton
 * « Retirer » vers « Mes retraits » (D10), journal des crédits paginé. 503
 * `CONFIG` : « solde momentanément indisponible », sans aucun chiffre (D14).
 * Montants du Worker en DSI, affichés en FCFA (D20).
 */

import React, {useEffect, useSyncExternalStore} from 'react';
import {FlatList, View} from 'react-native';
import {ErrorState, LoadingState, Text, useSellerColors, sellerMetrics} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {formatOrderDate} from '../../logic/purchases';
import {SellerPillButton} from '../components/SellerPillButton';
import {SellerSubHeader} from '../components/SellerSubHeader';
import {formatFcfaFromDsi, overviewErrorKey} from '../logic/sellerFormat';
import {ledgerTypeKey} from '../logic/sellerMore';
import {sellerEarnings, sellerEarningsStore} from '../store/sellerEarningsStore';

const E = 'commerce.sellerSpace.earnings';
const O = 'commerce.sellerSpace.overview';

export type SellerEarningsScreenProps = {
  header: React.ReactNode;
  onBack: () => void;
  onWithdraw: () => void;
};

export function SellerEarningsScreen({header, onBack, onWithdraw}: SellerEarningsScreenProps) {
  const sellerColors = useSellerColors();
  const {t, i18n} = useTranslation();
  const s = useSyncExternalStore(
    cb => sellerEarningsStore.subscribe(() => cb()),
    sellerEarningsStore.getState,
  );

  useEffect(() => {
    void sellerEarnings.load();
  }, []);

  const cur = t(`${O}.currency`);
  const amount = (dsi: number) => `${formatFcfaFromDsi(dsi)} ${cur}`;
  const ready = s.status === 'success' && s.availableDsi !== null;

  const top = (
    <View style={{gap: 16}}>
      <SellerSubHeader
        title={t(`${E}.title`)}
        backLabel={t('commerce.sellerSpace.tabs.more')}
        onBack={onBack}
        testID="seller-earnings-back"
      />
      {ready ? (
        <View
          testID="seller-earnings-balance"
          style={{
            borderColor: sellerColors.border,
            borderRadius: sellerMetrics.cardRadius,
            borderWidth: 1,
            gap: 8,
            marginHorizontal: sellerMetrics.margin,
            padding: sellerMetrics.cardPadding,
          }}>
          <Text variant="bodySmall" style={{color: sellerColors.inkMuted}}>
            {t(`${E}.available`)}
          </Text>
          <Text variant="display" style={{color: sellerColors.ink}} testID="seller-earnings-available">
            {amount(s.availableDsi ?? 0)}
          </Text>
          <Text variant="bodySmall" style={{color: sellerColors.inkMuted}} testID="seller-earnings-pending">
            {t(`${E}.pending`, {amount: amount(s.pendingDsi)})}
          </Text>
          <SellerPillButton label={t(`${O}.withdraw`)} tone="orange" onPress={onWithdraw} testID="seller-earnings-withdraw" />
        </View>
      ) : null}
      {ready ? (
        <Text variant="subtitle" accessibilityRole="header" style={{color: sellerColors.ink, paddingHorizontal: sellerMetrics.margin}}>
          {t(`${E}.history`)}
        </Text>
      ) : null}
    </View>
  );

  let body: React.ReactNode = null;
  if (s.status === 'error') {
    body = (
      <ErrorState
        message={t(overviewErrorKey(s.error))}
        retryLabel={t('common.retry')}
        onRetry={() => void sellerEarnings.load()}
        testID="seller-earnings-error"
      />
    );
  } else if (!ready) {
    body = <LoadingState accessibilityLabel={t('content.loading')} testID="seller-earnings-loading" />;
  } else if (s.ledger.length === 0) {
    body = (
      <Text variant="body" style={{color: sellerColors.inkMuted, padding: sellerMetrics.margin, textAlign: 'center'}} testID="seller-earnings-empty">
        {t(`${E}.empty`)}
      </Text>
    );
  }

  return (
    <FlatList
      data={ready ? s.ledger : []}
      keyExtractor={e => e.id}
      style={{backgroundColor: sellerColors.bg, flex: 1}}
      contentContainerStyle={{paddingBottom: 32}}
      testID="seller-earnings"
      ListHeaderComponent={
        <>
          {header}
          {top}
          {body}
        </>
      }
      onEndReached={() => void sellerEarnings.loadMore()}
      onEndReachedThreshold={0.5}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={7}
      ListFooterComponent={s.loadingMore ? <LoadingState accessibilityLabel={t('content.loading')} /> : undefined}
      renderItem={({item}) => (
        <View
          testID={`seller-ledger-${item.id}`}
          style={{
            alignItems: 'center',
            borderBottomColor: sellerColors.border,
            borderBottomWidth: 1,
            flexDirection: 'row',
            gap: 12,
            minHeight: 64,
            paddingHorizontal: sellerMetrics.margin,
            paddingVertical: 12,
          }}>
          <View style={{flex: 1}}>
            <Text variant="bodyStrong" numberOfLines={1} style={{color: sellerColors.ink}}>
              {item.listingTitle ?? t(ledgerTypeKey(item.type))}
            </Text>
            <Text variant="caption" numberOfLines={1} style={{color: sellerColors.inkMuted}}>
              {[t(ledgerTypeKey(item.type)), item.createdAt ? formatOrderDate(item.createdAt, i18n.language) : null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          <Text variant="bodyStrong" style={{color: item.amountDsi >= 0 ? sellerColors.positiveText : sellerColors.negativeText}}>
            {item.amountDsi >= 0 ? '+' : '−'}
            {amount(Math.abs(item.amountDsi))}
          </Text>
        </View>
      )}
    />
  );
}
