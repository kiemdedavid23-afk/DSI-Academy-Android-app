/**
 * Onglet Ventes (lot S6) : période (7 j, 30 j, 12 mois, Toujours), « Exporter »,
 * chiffre d'affaires et commandes payées avec variation, filtre Toutes / Payées /
 * En attente, liste paginée, détail d'une vente. Les paniers récupérés sont hors
 * périmètre (D8). Montants du Worker en DSI, affichés en FCFA (D20). Acheteur
 * inconnu : « Acheteur ».
 */

import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {FlatList, Pressable, Share, View} from 'react-native';
import {ErrorState, LoadingState, Text, useSellerColors, sellerMetrics} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import type {SellerOrderItem} from '../../store/sellerTypes';
import {formatOrderDate} from '../../logic/purchases';
import {SellerOrderSheet} from '../components/SellerOrderSheet';
import {SellerPillButton} from '../components/SellerPillButton';
import {SellerSegmented} from '../components/SellerSegmented';
import {SellerStatCard} from '../components/SellerStatCard';
import {formatFcfaFromDsi, metricDelta, type MetricDelta} from '../logic/sellerFormat';
import {ORDER_PERIODS, ordersErrorKey, type OrderFilter} from '../logic/sellerOrders';
import {sellerOrders, sellerOrdersStore} from '../store/sellerOrdersStore';

const S = 'commerce.sellerSpace.sales';
const O = 'commerce.sellerSpace.overview';

export type SellerSalesScreenProps = {
  header: React.ReactNode;
};

export function SellerSalesScreen({header}: SellerSalesScreenProps) {
  const sellerColors = useSellerColors();
  const {t, i18n} = useTranslation();
  const s = useSyncExternalStore(
    cb => sellerOrdersStore.subscribe(() => cb()),
    sellerOrdersStore.getState,
  );
  const [open, setOpen] = useState<SellerOrderItem | null>(null);
  const [exportFailed, setExportFailed] = useState(false);

  useEffect(() => {
    void sellerOrders.load();
  }, []);

  const cur = t(`${O}.currency`);
  const amount = (dsi: number) => `${formatFcfaFromDsi(dsi)} ${cur}`;
  const buyer = (o: SellerOrderItem) => o.buyerDisplayName ?? t(`${O}.buyerFallback`);
  const statusLabel = (o: SellerOrderItem) =>
    t(o.status === 'paid' ? `${S}.paid` : `${O}.orderStatus.${o.status}`);

  const deltaText = (d: MetricDelta): string | undefined => {
    switch (d.kind) {
      case 'up':
        return t(`${O}.up`, {pct: d.pct});
      case 'down':
        return t(`${O}.down`, {pct: d.pct});
      case 'flat':
        return t(`${O}.flat`);
      case 'new':
        return t(`${O}.newLabel`);
      default:
        return undefined;
    }
  };
  const tone = (d: MetricDelta) =>
    d.kind === 'up' || d.kind === 'new'
      ? ('positive' as const)
      : d.kind === 'down'
      ? ('negative' as const)
      : ('neutral' as const);

  const doExport = async () => {
    setExportFailed(false);
    const csv = await sellerOrders.exportCsv();
    if (csv === null) {
      setExportFailed(true);
      return;
    }
    try {
      await Share.share({message: csv, title: t(`${S}.exportTitle`)});
    } catch {
      setExportFailed(true);
    }
  };

  const periodOptions = ORDER_PERIODS.map(p => ({id: p, label: t(`${S}.period.${p}`)}));
  const filterOptions: Array<{id: OrderFilter; label: string}> = [
    {id: 'all', label: t(`${S}.filterAll`)},
    {id: 'paid', label: t(`${S}.filterPaid`)},
    {id: 'processing', label: t(`${S}.filterPending`)},
  ];

  const summary = s.summary;
  const revenueDelta = summary ? metricDelta(summary.revenueDsi) : null;
  const paidDelta = summary ? metricDelta(summary.paidOrders) : null;

  const top = (
    <View style={{gap: 12, paddingHorizontal: sellerMetrics.margin, paddingBottom: 16}}>
      <Text variant="display" accessibilityRole="header" style={{color: sellerColors.ink}}>
        {t(`${S}.title`)}
      </Text>
      <Text variant="bodySmall" style={{color: sellerColors.inkMuted}}>
        {t(`${S}.subtitle.${s.period}`)}
      </Text>
      <SellerSegmented options={periodOptions} value={s.period} onChange={p => void sellerOrders.setPeriod(p)} testID="seller-sales-period" />
      <SellerPillButton
        label={t(`${S}.export`)}
        loading={s.exporting}
        disabled={s.status !== 'success'}
        onPress={() => void doExport()}
        testID="seller-sales-export"
      />
      {exportFailed ? (
        <Text variant="bodySmall" accessibilityLiveRegion="polite" style={{color: sellerColors.negativeText}}>
          {t(`${S}.exportError`)}
        </Text>
      ) : null}
      {summary && revenueDelta && paidDelta ? (
        <>
          <View style={{flexDirection: 'row'}}>
            <SellerStatCard
              testID="seller-sales-revenue"
              label={t(`${S}.revenue`)}
              value={amount(summary.revenueDsi.value)}
              deltaText={deltaText(revenueDelta)}
              deltaTone={tone(revenueDelta)}
              compareText={revenueDelta.kind === 'none' ? undefined : t(`${O}.compare`)}
            />
          </View>
          <View style={{flexDirection: 'row'}}>
            <SellerStatCard
              testID="seller-sales-paid"
              label={t(`${S}.paidOrders`)}
              value={String(summary.paidOrders.value)}
              deltaText={deltaText(paidDelta)}
              deltaTone={tone(paidDelta)}
              compareText={paidDelta.kind === 'none' ? undefined : t(`${O}.compare`)}
            />
          </View>
        </>
      ) : null}
      <SellerSegmented options={filterOptions} value={s.filter} onChange={f => void sellerOrders.setFilter(f)} testID="seller-sales-filter" />
    </View>
  );

  let body: React.ReactNode = null;
  if (s.status === 'error' && s.items.length === 0) {
    body = (
      <ErrorState
        message={t(ordersErrorKey(s.error))}
        retryLabel={t('common.retry')}
        onRetry={() => void sellerOrders.load()}
        testID="seller-sales-error"
      />
    );
  } else if (s.status !== 'success' && s.items.length === 0) {
    body = <LoadingState accessibilityLabel={t('content.loading')} testID="seller-sales-loading" />;
  } else if (s.items.length === 0) {
    body = (
      <Text variant="bodySmall" style={{color: sellerColors.inkMuted, padding: sellerMetrics.margin, textAlign: 'center'}} testID="seller-sales-empty">
        {t(`${S}.empty`)}
      </Text>
    );
  }

  const detailRows = open
    ? [
        {label: t(`${S}.detail.buyer`), value: buyer(open)},
        ...(open.buyerCountry ? [{label: t(`${S}.detail.country`), value: open.buyerCountry}] : []),
        ...(open.createdAt ? [{label: t(`${S}.detail.date`), value: formatOrderDate(open.createdAt, i18n.language)}] : []),
        {label: t(`${S}.detail.price`), value: amount(open.priceDsi)},
        {label: t(`${S}.detail.commission`), value: amount(open.commissionDsi)},
        {label: t(`${S}.detail.fees`), value: amount(open.feesDsi)},
        {label: t(`${S}.detail.net`), value: amount(open.netSellerDsi)},
        {label: t(`${S}.detail.status`), value: statusLabel(open)},
      ]
    : [];

  return (
    <>
      <FlatList
        data={s.items}
        keyExtractor={o => o.id}
        style={{backgroundColor: sellerColors.bg, flex: 1}}
        contentContainerStyle={{paddingBottom: 32}}
        testID="seller-sales"
        ListHeaderComponent={
          <>
            {header}
            {top}
            {body}
          </>
        }
        onEndReached={() => void sellerOrders.loadMore()}
        onEndReachedThreshold={0.5}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        ListFooterComponent={s.loadingMore ? <LoadingState accessibilityLabel={t('content.loading')} /> : undefined}
        renderItem={({item}) => (
          <Pressable
            onPress={() => setOpen(item)}
            accessibilityRole="button"
            testID={`seller-sale-${item.id}`}
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
              <Text variant="bodySmallStrong" numberOfLines={1} style={{color: sellerColors.ink}}>
                {item.listingTitle ?? t(`${O}.productFallback`)}
              </Text>
              <Text variant="caption" numberOfLines={1} style={{color: sellerColors.inkMuted}}>
                {[buyer(item), item.createdAt ? formatOrderDate(item.createdAt, i18n.language) : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            <View style={{alignItems: 'flex-end', gap: 4}}>
              <Text variant="bodySmallStrong" style={{color: sellerColors.ink}}>
                {amount(item.netSellerDsi)}
              </Text>
              <View
                style={{
                  backgroundColor:
                    item.status === 'paid'
                      ? sellerColors.positiveBadgeBg
                      : item.status === 'failed'
                      ? sellerColors.negativeBg
                      : sellerColors.surfaceMuted,
                  borderRadius: 9999,
                  paddingHorizontal: 10,
                  paddingVertical: 2,
                }}>
                <Text
                  variant="caption"
                  style={{
                    color:
                      item.status === 'paid'
                        ? sellerColors.positiveText
                        : item.status === 'failed'
                        ? sellerColors.negativeText
                        : sellerColors.inkMuted,
                  }}>
                  {statusLabel(item)}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
      />
      <SellerOrderSheet
        visible={open !== null}
        title={open?.listingTitle ?? t(`${O}.productFallback`)}
        rows={detailRows}
        closeLabel={t(`${S}.close`)}
        onClose={() => setOpen(null)}
      />
    </>
  );
}
