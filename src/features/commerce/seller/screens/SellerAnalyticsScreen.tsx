/**
 * Onglet Analyses (lot S7) : période (menu), quatre indicateurs avec variation,
 * courbes des revenus nets et des visites, entonnoir, meilleurs produits, pays.
 * Graphiques en react-native-svg (D9). Montants du Worker en DSI, affichés en
 * FCFA (D20). Quatre états : chargement, vide (aucune activité), erreur, données.
 */

import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {Pressable, RefreshControl, ScrollView, View} from 'react-native';
import {ErrorState, LoadingState, Text, useSellerColors, sellerMetrics} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import type {SellerMetric, SellerPeriod} from '../../store/sellerTypes';
import {SellerActionSheet} from '../components/SellerActionSheet';
import {SellerBarRow} from '../components/SellerBarRow';
import {SellerKpiCard} from '../components/SellerKpiCard';
import {SellerLineChart} from '../components/SellerLineChart';
import {SellerListCard} from '../components/SellerListCard';
import {formatFcfaFromDsi} from '../logic/sellerFormat';
import {
  ANALYTICS_PERIODS,
  analyticsErrorKey,
  barRatio,
  deltaBadge,
  formatPercent,
  hasSeriesData,
  seriesLabel,
} from '../logic/sellerAnalytics';
import {sellerAnalytics, sellerAnalyticsStore} from '../store/sellerAnalyticsStore';

const A = 'commerce.sellerSpace.analytics';
const O = 'commerce.sellerSpace.overview';

export type SellerAnalyticsScreenProps = {
  header: React.ReactNode;
};

export function SellerAnalyticsScreen({header}: SellerAnalyticsScreenProps) {
  const sellerColors = useSellerColors();
  const {t, i18n} = useTranslation();
  const s = useSyncExternalStore(
    cb => sellerAnalyticsStore.subscribe(() => cb()),
    sellerAnalyticsStore.getState,
  );
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    void sellerAnalytics.load();
  }, []);

  const data = s.data;
  const cur = t(`${O}.currency`);
  const fcfa = (dsi: number) => `${formatFcfaFromDsi(dsi)} ${cur}`;

  const scroll = (children: React.ReactNode) => (
    <ScrollView
      style={{flex: 1, backgroundColor: sellerColors.bg}}
      contentContainerStyle={{paddingBottom: 32}}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={() => void sellerAnalytics.load()}
          colors={[sellerColors.accentDot]}
        />
      }
      testID="seller-analytics">
      {header}
      <View style={{gap: 12, paddingHorizontal: sellerMetrics.margin}}>
        <Text variant="display" accessibilityRole="header" style={{color: sellerColors.ink}}>
          {t(`${A}.title`)}
        </Text>
        <Text variant="body" style={{color: sellerColors.inkMuted}}>
          {t(`${A}.subtitle`)}
        </Text>
        <View style={{alignItems: 'flex-start'}}>
          <Pressable
            onPress={() => setMenu(true)}
            accessibilityRole="button"
            accessibilityLabel={t(`${A}.periodMenu`)}
            testID="seller-analytics-period"
            style={{
              alignItems: 'center',
              backgroundColor: sellerColors.bg,
              borderColor: sellerColors.border,
              borderRadius: 9999,
              borderWidth: 1,
              flexDirection: 'row',
              gap: 8,
              minHeight: 48,
              paddingHorizontal: 20,
            }}>
            <Text variant="bodyStrong" style={{color: sellerColors.ink}}>
              {t(`${A}.period.${s.period}`)}
            </Text>
            <Text variant="bodyStrong" style={{color: sellerColors.inkMuted}}>
              ▾
            </Text>
          </Pressable>
        </View>
        {children}
      </View>
      <SellerActionSheet
        visible={menu}
        title={t(`${A}.periodMenu`)}
        closeLabel={t(`${A}.close`)}
        actions={ANALYTICS_PERIODS.map(p => ({id: p, label: t(`${A}.period.${p}`)}))}
        onSelect={id => {
          setMenu(false);
          void sellerAnalytics.setPeriod(id as SellerPeriod);
        }}
        onClose={() => setMenu(false)}
      />
    </ScrollView>
  );

  if (!data) {
    if (s.status === 'error') {
      return scroll(
        <ErrorState
          message={t(analyticsErrorKey(s.error))}
          retryLabel={t('common.retry')}
          onRetry={() => void sellerAnalytics.load()}
          testID="seller-analytics-error"
        />,
      );
    }
    return scroll(<LoadingState testID="seller-analytics-loading" />);
  }

  const {kpis, series, funnel, topListings, byCountry} = data;
  const tone = (m: SellerMetric) =>
    m.trend === 'up' ? ('positive' as const) : m.trend === 'down' ? ('negative' as const) : ('neutral' as const);
  const badge = (m: SellerMetric) => deltaBadge(m, i18n.language, t(`${O}.newLabel`));
  const prev = (m: SellerMetric, fmt: (n: number) => string) =>
    m.previous === null ? undefined : t(`${A}.vsPrevious`, {value: fmt(m.previous)});

  const revenueSeries = series.map(p => p.netRevenueDsi);
  const viewsSeries = series.map(p => p.pageViews);
  const first = series.length > 0 ? seriesLabel(series[0].date) : '';
  const last = series.length > 0 ? seriesLabel(series[series.length - 1].date) : '';
  const funnelMax = Math.max(funnel.storeViews, funnel.listingViews, funnel.ordersCreated, funnel.ordersPaid);
  const funnelRows: Array<[string, number]> = [
    [t(`${A}.funnel.storeViews`), funnel.storeViews],
    [t(`${A}.funnel.listingViews`), funnel.listingViews],
    [t(`${A}.funnel.ordersCreated`), funnel.ordersCreated],
    [t(`${A}.funnel.ordersPaid`), funnel.ordersPaid],
  ];
  const maxCountry = Math.max(0, ...byCountry.map(c => c.revenueDsi));

  return scroll(
    <>
      <View style={{flexDirection: 'row', gap: sellerMetrics.gap}}>
        <SellerKpiCard
          testID="seller-kpi-revenue"
          kind="revenue"
          label={t(`${A}.kpi.netRevenue`)}
          value={fcfa(kpis.netRevenueDsi.value)}
          badge={badge(kpis.netRevenueDsi)}
          badgeTone={tone(kpis.netRevenueDsi)}
          compareText={prev(kpis.netRevenueDsi, fcfa)}
        />
        <SellerKpiCard
          testID="seller-kpi-visitors"
          kind="visitors"
          label={t(`${A}.kpi.visitors`)}
          value={String(kpis.uniqueVisitors.value)}
          badge={badge(kpis.uniqueVisitors)}
          badgeTone={tone(kpis.uniqueVisitors)}
          compareText={prev(kpis.uniqueVisitors, String)}
        />
      </View>
      <View style={{flexDirection: 'row', gap: sellerMetrics.gap}}>
        <SellerKpiCard
          testID="seller-kpi-views"
          kind="views"
          label={t(`${A}.kpi.pageViews`)}
          value={String(kpis.pageViews.value)}
          badge={badge(kpis.pageViews)}
          badgeTone={tone(kpis.pageViews)}
          compareText={prev(kpis.pageViews, String)}
        />
        <SellerKpiCard
          testID="seller-kpi-success"
          kind="success"
          label={t(`${A}.kpi.successRate`)}
          value={formatPercent(kpis.successRate.percent, i18n.language)}
          compareText={t(`${A}.attempted`, {count: kpis.successRate.attempted})}
        />
      </View>

      <SellerListCard title={t(`${A}.charts.revenue`)} testID="seller-analytics-revenue-chart">
        {hasSeriesData(revenueSeries) ? (
          <SellerLineChart
            values={revenueSeries}
            firstLabel={first}
            lastLabel={last}
            accessibilityLabel={t(`${A}.charts.revenue`)}
          />
        ) : (
          <Text variant="bodySmall" style={{color: sellerColors.inkMuted}}>
            {t(`${A}.noData`)}
          </Text>
        )}
      </SellerListCard>

      <SellerListCard title={t(`${A}.charts.visits`)} testID="seller-analytics-visits-chart">
        {hasSeriesData(viewsSeries) ? (
          <SellerLineChart
            values={viewsSeries}
            firstLabel={first}
            lastLabel={last}
            accessibilityLabel={t(`${A}.charts.visits`)}
          />
        ) : (
          <Text variant="bodySmall" style={{color: sellerColors.inkMuted}}>
            {t(`${A}.noData`)}
          </Text>
        )}
      </SellerListCard>

      <SellerListCard title={t(`${A}.funnel.title`)} testID="seller-analytics-funnel">
        {funnelRows.map(([label, value]) => (
          <SellerBarRow key={label} label={label} value={String(value)} ratio={barRatio(value, funnelMax)} />
        ))}
      </SellerListCard>

      <SellerListCard title={t(`${A}.topProducts`)} testID="seller-analytics-top">
        {topListings.length === 0 ? (
          <Text variant="bodySmall" style={{color: sellerColors.inkMuted}}>
            {t(`${A}.noProducts`)}
          </Text>
        ) : (
          topListings.map(l => (
            <View key={l.id} style={{gap: 2}}>
              <View style={{flexDirection: 'row', gap: 12, justifyContent: 'space-between'}}>
                <Text variant="bodyStrong" numberOfLines={1} style={{color: sellerColors.ink, flex: 1}}>
                  {l.title}
                </Text>
                <Text variant="bodyStrong" style={{color: sellerColors.ink}}>
                  {fcfa(l.revenueDsi)}
                </Text>
              </View>
              <Text variant="caption" style={{color: sellerColors.inkMuted}}>
                {t(`${A}.productLine`, {
                  sales: l.salesCount,
                  views: l.views,
                  conversion: formatPercent(l.conversionPct, i18n.language),
                })}
              </Text>
            </View>
          ))
        )}
      </SellerListCard>

      <SellerListCard title={t(`${A}.countries`)} testID="seller-analytics-countries">
        {byCountry.length === 0 ? (
          <Text variant="bodySmall" style={{color: sellerColors.inkMuted}}>
            {t(`${A}.noCountries`)}
          </Text>
        ) : (
          byCountry.map(c => (
            <SellerBarRow
              key={c.country}
              label={`${c.country} · ${t(`${A}.ordersCount`, {count: c.orders})}`}
              value={fcfa(c.revenueDsi)}
              ratio={barRatio(c.revenueDsi, maxCountry)}
            />
          ))
        )}
      </SellerListCard>
    </>,
  );
}
