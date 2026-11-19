/**
 * « Mes achats » commun (site : MpPurchasesPage). Commandes de la source,
 * statut, vérification d'un paiement en cours, ouverture du produit acheté.
 */

import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {FlatList, View} from 'react-native';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Text,
  useTheme,
} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {accessErrorKey, commerceErrorKey, orderStatusKey} from '../logic/errorKey';
import {formatDsiAmount} from '../logic/format';
import {COMMERCE_STORES} from '../store/commerceStores';
import type {CommerceAccess, CommerceOrder, CommerceSource} from '../store/commerceTypes';

export type CommercePurchasesScreenProps = {
  source: CommerceSource;
  onDiscover: () => void;
  onOpenAccess: (access: CommerceAccess) => void;
  /** Coque : carte d'ambiance et sélecteurs, posés en tête de la liste. */
  shellHeader?: React.ReactNode;
};

export function CommercePurchasesScreen({
  source,
  onDiscover,
  onOpenAccess,
  shellHeader,
}: CommercePurchasesScreenProps) {
  const stores = COMMERCE_STORES[source];
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const orders = useSyncExternalStore(stores.orders.subscribe, stores.orders.getState);
  const [accessKey, setAccessKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{orderId: string; key: string} | null>(null);

  useEffect(() => {
    void stores.orders.load({force: true});
  }, [stores]);

  const open = async (order: CommerceOrder, productId: string | null) => {
    const key = `${order.id}:${productId ?? ''}`;
    if (accessKey !== null) {
      return;
    }
    setMessage(null);
    setAccessKey(key);
    const res = await stores.orders.access({orderId: order.id, productId});
    setAccessKey(null);
    if (res.ok) {
      onOpenAccess({url: res.url, mode: res.mode});
    } else {
      setMessage({orderId: order.id, key: accessErrorKey(res.errorKind)});
    }
  };

  const check = async (order: CommerceOrder) => {
    setMessage(null);
    const res = await stores.orders.verify(order.id);
    if (!res.ok) {
      setMessage({orderId: order.id, key: commerceErrorKey(res.errorKind ?? null)});
    }
  };

  if ((orders.status === 'idle' || orders.status === 'loading') && orders.items.length === 0) {
    return (
      <View style={{flex: 1, backgroundColor: colors.bgApp}}>
        {shellHeader}
        <LoadingState accessibilityLabel={t('content.loading')} />
      </View>
    );
  }
  if (orders.status === 'error' && orders.items.length === 0) {
    return (
      <View style={{flex: 1, backgroundColor: colors.bgApp}}>
        {shellHeader}
        <ErrorState
          message={t(commerceErrorKey(orders.errorKind))}
          retryLabel={t('common.retry')}
          onRetry={() => void stores.orders.load({force: true})}
          testID="commerce-purchases-error"
        />
      </View>
    );
  }

  const renderOrder = ({item}: {item: CommerceOrder}) => {
    const items = item.items.length > 0 ? item.items : [{productId: '', title: null, qty: null}];
    return (
      <View
        testID={`order-${item.id}`}
        style={{
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderLight,
          borderRadius: radii.md,
          borderWidth: 1,
          gap: spacing.sm,
          marginHorizontal: spacing.xl,
          padding: spacing.lg,
        }}>
        <Text variant="caption" color="secondary">
          {t(orderStatusKey(item.status, item.rawStatus))}
          {item.createdAt ? ` · ${new Date(item.createdAt).toLocaleDateString()}` : ''}
        </Text>
        <Text variant="bodySmallStrong" color="gold">
          {t('commerce.priceDsi', {amount: formatDsiAmount(item.totalDsi)})}
        </Text>
        {item.status === 'processing' ? (
          <>
            <Text variant="caption" color="secondary">
              {t('mp.orders.notePending')}
            </Text>
            <Button
              variant="secondary"
              label={t(orders.verifyingId === item.id ? 'mp.orders.checking' : 'mp.orders.check')}
              loading={orders.verifyingId === item.id}
              onPress={() => void check(item)}
              testID={`order-verify-${item.id}`}
            />
          </>
        ) : null}
        {items.map(line => (
          <View key={`${item.id}-${line.productId}`} style={{gap: spacing.xs}}>
            <Text variant="cardTitle" numberOfLines={2}>
              {line.title ?? t('mp.orders.fallbackTitle')}
            </Text>
            {item.status === 'paid' ? (
              <Button
                variant="secondary"
                label={t(
                  accessKey === `${item.id}:${line.productId}`
                    ? 'mp.orders.accessLoading'
                    : 'mp.orders.open',
                )}
                loading={accessKey === `${item.id}:${line.productId}`}
                onPress={() => void open(item, line.productId === '' ? null : line.productId)}
                testID={`order-open-${item.id}`}
              />
            ) : null}
          </View>
        ))}
        {message && message.orderId === item.id ? (
          <Text variant="caption" color="secondary" testID="order-message">
            {t(message.key)}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <FlatList
      style={{flex: 1, backgroundColor: colors.bgApp}}
      testID={`screen-${source}-purchases`}
      data={orders.items}
      keyExtractor={o => o.id}
      contentContainerStyle={{gap: spacing.md, paddingBottom: spacing.xxxl, paddingTop: shellHeader ? 0 : spacing.lg}}
      ListHeaderComponent={shellHeader ? <View>{shellHeader}</View> : undefined}
      renderItem={renderOrder}
      ListEmptyComponent={
        <EmptyState
          title={t('mp.orders.emptyTitle')}
          message={t('mp.orders.emptyHint')}
          actionLabel={t('mp.orders.emptyCta')}
          onAction={onDiscover}
          testID="commerce-purchases-empty"
        />
      }
    />
  );
}
