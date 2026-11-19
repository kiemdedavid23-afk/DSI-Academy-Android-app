/**
 * « Mes achats » et « Historique » communs (site : MpPurchasesPage). Commandes de la
 * source, statut, vérification d'un paiement en cours, ouverture du produit acheté.
 * Boutique : lien vers la bibliothèque achetée.
 */

import React, {useEffect, useMemo, useState, useSyncExternalStore} from 'react';
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
import {PurchaseRow} from '../components/PurchaseRow';
import {accessErrorKey, commerceErrorKey} from '../logic/errorKey';
import {ordersFor, type OrdersMode} from '../logic/purchases';
import {COMMERCE_STORES} from '../store/commerceStores';
import type {CommerceAccess, CommerceOrder, CommerceSource} from '../store/commerceTypes';

export type CommercePurchasesScreenProps = {
  source: CommerceSource;
  mode?: OrdersMode;
  /** Boutique seulement : bibliothèque des achats. */
  onOpenLibrary?: () => void;
  onDiscover: () => void;
  onOpenAccess: (access: CommerceAccess) => void;
  /** Coque : carte d'ambiance et sélecteurs, posés en tête de la liste. */
  shellHeader?: React.ReactNode;
};

export function CommercePurchasesScreen({
  source,
  mode = 'purchases',
  onOpenLibrary,
  onDiscover,
  onOpenAccess,
  shellHeader,
}: CommercePurchasesScreenProps) {
  const stores = COMMERCE_STORES[source];
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();
  const orders = useSyncExternalStore(stores.orders.subscribe, stores.orders.getState);
  const [accessKey, setAccessKey] = useState<string | null>(null);
  const list = useMemo(() => ordersFor(mode, orders.items), [mode, orders.items]);
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
      <PurchaseRow order={item}>
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
        {item.status === 'paid'
          ? items.map(line => (
              <Button
                key={`${item.id}-${line.productId}`}
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
            ))
          : null}
        {message && message.orderId === item.id ? (
          <Text variant="caption" color="secondary" testID="order-message">
            {t(message.key)}
          </Text>
        ) : null}
      </PurchaseRow>
    );
  };

  return (
    <FlatList
      style={{flex: 1, backgroundColor: colors.bgApp}}
      testID={`screen-${source}-${mode}`}
      data={list}
      keyExtractor={o => o.id}
      contentContainerStyle={{gap: spacing.md, paddingBottom: spacing.xxxl, paddingTop: shellHeader ? 0 : spacing.lg}}
      ListHeaderComponent={
        shellHeader || (onOpenLibrary && source === 'shop') ? (
          <View style={{gap: spacing.md}}>
            {shellHeader}
            {onOpenLibrary && source === 'shop' ? (
              <View style={{paddingHorizontal: spacing.xl}}>
                <Button
                  variant="secondary"
                  label={t('commerce.library.title')}
                  onPress={onOpenLibrary}
                  testID="shop-open-library"
                />
              </View>
            ) : null}
          </View>
        ) : undefined
      }
      renderItem={renderOrder}
      ListEmptyComponent={
        <EmptyState
          title={t(mode === 'history' ? 'commerce.shell.historyEmptyTitle' : 'mp.orders.emptyTitle')}
          message={t(mode === 'history' ? 'commerce.shell.historyEmptyHint' : 'mp.orders.emptyHint')}
          actionLabel={t('mp.orders.emptyCta')}
          onAction={onDiscover}
          testID="commerce-purchases-empty"
        />
      }
    />
  );
}
