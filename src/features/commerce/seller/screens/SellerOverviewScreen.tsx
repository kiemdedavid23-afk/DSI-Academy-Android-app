/**
 * Aperçu de l'espace vendeur : bonjour, lien de la boutique (copier, voir),
 * création de produit, solde et « Retirer », ventes et commandes de la période
 * avec leur variation, dernières commandes, meilleurs produits, bandeau de
 * suspension. Montants du Worker en DSI, affichés en FCFA. Aucune donnée
 * partielle : si le solde manque, le Worker répond 503 et l'écran affiche
 * l'erreur (D14).
 */

import React, {useEffect, useRef, useState} from 'react';
import {RefreshControl, ScrollView, View} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import type {SellerOverview} from '../../store/sellerTypes';
import {
  ErrorState,
  Icon,
  LoadingState,
  Text,
  useSellerColors,
  sellerMetrics,
} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {SellerBalanceCard} from '../components/SellerBalanceCard';
import {SellerListCard, SellerRow} from '../components/SellerListCard';
import {SellerPillButton} from '../components/SellerPillButton';
import {SellerStatCard} from '../components/SellerStatCard';
import {
  formatFcfaFromDsi,
  metricDelta,
  overviewErrorKey,
  type MetricDelta,
} from '../logic/sellerFormat';

const O = 'commerce.sellerSpace.overview';

export type SellerOverviewScreenProps = {
  /** Barre du haut, posée en tête et défilant avec le contenu. */
  header: React.ReactNode;
  overview: SellerOverview | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  firstName: string | null;
  onRetry: () => void;
  onCreateProduct: () => void;
  onWithdraw: () => void;
  onOpenStore: (url: string) => void;
};

export function SellerOverviewScreen({
  header,
  overview,
  status,
  error,
  firstName,
  onRetry,
  onCreateProduct,
  onWithdraw,
  onOpenStore,
}: SellerOverviewScreenProps) {
  const sellerColors = useSellerColors();
  const {t} = useTranslation();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  const scroll = (children: React.ReactNode, refreshing = false) => (
    <ScrollView
      style={{flex: 1, backgroundColor: sellerColors.bg}}
      contentContainerStyle={{paddingBottom: 32}}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRetry}
          colors={[sellerColors.accentDot]}
        />
      }
      testID="seller-overview">
      {header}
      {children}
    </ScrollView>
  );

  if (!overview) {
    if (status === 'error') {
      return scroll(
        <ErrorState
          message={t(overviewErrorKey(error))}
          retryLabel={t('common.retry')}
          onRetry={onRetry}
          testID="seller-overview-error"
        />,
      );
    }
    return scroll(<LoadingState accessibilityLabel={t('content.loading')} testID="seller-overview-loading" />);
  }

  const {seller, suspension, balance, period, recentOrders, topListings} = overview;
  const blocked = seller.status !== 'APPROVED' || suspension.type !== null;

  const copy = () => {
    try {
      Clipboard.setString(seller.storeUrl);
      setCopied(true);
      if (timer.current) {
        clearTimeout(timer.current);
      }
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

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

  const salesDelta = metricDelta(period.salesDsi);
  const ordersDelta = metricDelta(period.orders);

  return scroll(
    <View style={{gap: sellerMetrics.gap, paddingHorizontal: sellerMetrics.margin}}>
      {blocked ? (
        <View
          testID="seller-suspension"
          style={{
            backgroundColor: sellerColors.negativeBg,
            borderRadius: sellerMetrics.cardRadius,
            gap: 4,
            padding: sellerMetrics.cardPadding,
          }}>
          <Text variant="bodyStrong" style={{color: sellerColors.negativeText}}>
            {t(seller.status === 'REVOKED' ? `${O}.revokedTitle` : `${O}.suspendedTitle`)}
          </Text>
          {suspension.reason ? (
            <Text variant="bodySmall" style={{color: sellerColors.negativeText}}>
              {t(`${O}.suspendedReason`, {reason: suspension.reason.slice(0, 300)})}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={{gap: 4, paddingTop: 4}}>
        <Text variant="title" accessibilityRole="header" style={{color: sellerColors.ink}}>
          {firstName ? t(`${O}.greeting`, {name: firstName}) : t(`${O}.greetingNoName`)}
        </Text>
        <Text variant="body" style={{color: sellerColors.inkMuted}}>
          {t(`${O}.yourStore`)}
        </Text>
        <Text
          variant="bodyStrong"
          selectable
          numberOfLines={1}
          testID="seller-store-url"
          style={{color: sellerColors.ink, fontFamily: 'monospace'}}>
          {seller.storeUrl}
        </Text>
        <Text
          variant="bodyStrong"
          onPress={copy}
          accessibilityRole="button"
          testID="seller-copy-link"
          style={{color: sellerColors.accent}}>
          {copied ? t(`${O}.copied`) : t(`${O}.copyLink`)}
        </Text>
      </View>

      <SellerPillButton
        label={t(`${O}.viewStore`)}
        onPress={() => onOpenStore(seller.storeUrl)}
        testID="seller-view-store"
      />
      <SellerPillButton
        label={t(`${O}.createProduct`)}
        onPress={onCreateProduct}
        leading={<Icon name="PlusIcon" size={18} color={sellerColors.ink} />}
        testID="seller-create-product"
      />

      <SellerBalanceCard
        label={t(`${O}.balance`)}
        amount={formatFcfaFromDsi(balance.availableDsi)}
        currency={t(`${O}.currency`)}
        pendingText={
          balance.pendingDsi > 0
            ? t(`${O}.pending`, {amount: formatFcfaFromDsi(balance.pendingDsi)})
            : undefined
        }
        withdrawLabel={t(`${O}.withdraw`)}
        onWithdraw={onWithdraw}
      />

      <View style={{flexDirection: 'row', gap: sellerMetrics.gap}}>
        <SellerStatCard
          testID="seller-stat-sales"
          label={t(`${O}.salesPeriod`)}
          value={`${formatFcfaFromDsi(period.salesDsi.value)}`}
          deltaText={deltaText(salesDelta)}
          deltaTone={tone(salesDelta)}
          compareText={salesDelta.kind === 'none' ? undefined : t(`${O}.compare`)}
        />
        <SellerStatCard
          testID="seller-stat-orders"
          label={t(`${O}.orders`)}
          value={String(period.orders.value)}
          deltaText={deltaText(ordersDelta)}
          deltaTone={tone(ordersDelta)}
          compareText={ordersDelta.kind === 'none' ? undefined : t(`${O}.compare`)}
        />
      </View>

      <SellerListCard title={t(`${O}.recentOrders`)} testID="seller-recent-orders">
        {recentOrders.length === 0 ? (
          <Text variant="bodySmall" style={{color: sellerColors.inkMuted}}>
            {t(`${O}.noOrders`)}
          </Text>
        ) : (
          recentOrders.map(o => (
            <SellerRow
              key={o.id}
              testID={`seller-order-${o.id}`}
              title={o.listingTitle ?? t(`${O}.productFallback`)}
              subtitle={
                o.status === 'paid'
                  ? o.buyerDisplayName ?? t(`${O}.buyerFallback`)
                  : `${o.buyerDisplayName ?? t(`${O}.buyerFallback`)} · ${t(
                      `${O}.orderStatus.${o.status}`,
                    )}`
              }
              trailing={`${formatFcfaFromDsi(o.netSellerDsi)} ${t(`${O}.currency`)}`}
            />
          ))
        )}
      </SellerListCard>

      <SellerListCard title={t(`${O}.topProducts`)} testID="seller-top-products">
        {topListings.length === 0 ? (
          <Text variant="bodySmall" style={{color: sellerColors.inkMuted}}>
            {t(`${O}.noProducts`)}
          </Text>
        ) : (
          topListings.map(p => (
            <SellerRow
              key={p.id}
              testID={`seller-top-${p.id}`}
              title={p.title}
              subtitle={t(`${O}.salesCount`, {count: p.salesCount})}
              trailing={`${formatFcfaFromDsi(p.revenueDsi)} ${t(`${O}.currency`)}`}
            />
          ))
        )}
      </SellerListCard>
    </View>,
    status === 'loading',
  );
}
