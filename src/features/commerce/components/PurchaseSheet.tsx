/**
 * Fenêtre d'achat commune (site : PurchaseSheet). Un seul parcours pour la
 * Boutique et la Marketplace : confirmer, payer avec le solde DSI, voir le
 * résultat. L'écran ne calcule rien : l'état vient du store d'achat.
 */

import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {Modal, StyleSheet, View} from 'react-native';
import {Button, LoadingState, Text, useTheme, withAlpha} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {formatDsiAmount} from '../logic/format';
import {accessErrorKey, purchaseErrorKey} from '../logic/errorKey';
import {COMMERCE_STORES} from '../store/commerceStores';
import type {CommerceAccess, CommerceSource} from '../store/commerceTypes';
import {PriceTag} from './PriceTag';

export type PurchaseSheetProps = {
  source: CommerceSource;
  onOpenDsi: () => void;
  onOpenSubscription: () => void;
  onOpenPurchases: () => void;
  /** Ouvre l'achat : lien du vendeur (WebView) ou fichier (hors de l'app). */
  onOpenAccess: (access: CommerceAccess) => void;
};

export function PurchaseSheet({
  source,
  onOpenDsi,
  onOpenSubscription,
  onOpenPurchases,
  onOpenAccess,
}: PurchaseSheetProps) {
  const stores = COMMERCE_STORES[source];
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const p = useSyncExternalStore(stores.purchase.subscribe, stores.purchase.getState);
  const bal = useSyncExternalStore(stores.balance.subscribe, stores.balance.getState);
  const [accessing, setAccessing] = useState(false);
  const [accessMsg, setAccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (p.phase === 'idle') {
      setAccessMsg(null);
    }
  }, [p.phase]);

  const confirming = p.phase === 'confirming';
  useEffect(() => {
    if (confirming) {
      void stores.balance.load({force: true});
    }
  }, [stores, confirming]);

  if (p.phase === 'idle' || !p.product) {
    return null;
  }
  const product = p.product;
  const price = product.priceDsi;
  const known = bal.status === 'success' && bal.amount !== null;
  const insufficient = known && price > 0 && (bal.amount as number) < price;

  const go = (fn: () => void) => () => {
    stores.purchase.dismiss();
    fn();
  };

  const openPaid = async (orderId: string) => {
    if (accessing) {
      return;
    }
    setAccessMsg(null);
    setAccessing(true);
    const res = await stores.orders.access({orderId, productId: product.id});
    setAccessing(false);
    if (res.ok) {
      stores.purchase.dismiss();
      onOpenAccess({url: res.url, mode: res.mode});
    } else {
      setAccessMsg(accessErrorKey(res.errorKind));
    }
  };

  let body: React.ReactNode = null;
  if (p.phase === 'confirming') {
    body = (
      <>
        <PriceTag priceDsi={price} free={product.free} large />
        {bal.status === 'loading' || bal.status === 'idle' ? (
          <Text variant="caption" color="secondary">
            {t('mp.checkout.balanceLoading')}
          </Text>
        ) : bal.status === 'error' ? (
          <View style={{gap: spacing.xs}}>
            <Text variant="caption" color="secondary">
              {t('mp.checkout.balanceError')}
            </Text>
            <Button
              variant="ghost"
              label={t('mp.checkout.balanceRetry')}
              onPress={() => void stores.balance.load({force: true})}
            />
          </View>
        ) : (
          <View style={{gap: spacing.xs}}>
            <Text variant="caption" color="secondary">
              {t('mp.checkout.balanceNow', {amount: formatDsiAmount(bal.amount as number)})}
            </Text>
            <Text variant="caption" color={insufficient ? 'primary' : 'secondary'}>
              {insufficient
                ? t('mp.checkout.balanceMissing', {
                    amount: formatDsiAmount(price - (bal.amount as number)),
                  })
                : t('mp.checkout.balanceAfter', {
                    amount: formatDsiAmount((bal.amount as number) - price),
                  })}
            </Text>
          </View>
        )}
        <Text variant="caption" color="secondary">
          {t('mp.checkout.deliveryNote')}
        </Text>
        {insufficient ? (
          <Button
            label={t('mp.member.balance')}
            onPress={go(onOpenDsi)}
            testID="purchase-open-dsi"
          />
        ) : (
          <Button
            label={t('mp.checkout.pay', {amount: formatDsiAmount(price)})}
            onPress={() => void stores.purchase.confirm()}
            testID="purchase-confirm"
          />
        )}
        <Button variant="ghost" label={t('common.cancel')} onPress={stores.purchase.dismiss} />
      </>
    );
  } else if (p.phase === 'processing') {
    body = (
      <>
        <LoadingState accessibilityLabel={t('mp.checkout.paying')} />
        <Text variant="body" color="secondary" testID="purchase-processing">
          {t('mp.checkout.paying')}
        </Text>
      </>
    );
  } else if (p.phase === 'pending') {
    body = (
      <>
        <Text variant="body" testID="purchase-pending">
          {t('mp.orders.noteProcessing')}
        </Text>
        {p.verifyFailed ? (
          <Text variant="caption" color="secondary">
            {t('app.catalogue.errorNetwork')}
          </Text>
        ) : null}
        <Button
          label={t(p.verifying ? 'mp.orders.checking' : 'mp.orders.check')}
          loading={p.verifying}
          onPress={() => void stores.purchase.verify()}
          testID="purchase-verify"
        />
        <Button variant="ghost" label={t('common.close')} onPress={stores.purchase.dismiss} />
      </>
    );
  } else if (p.phase === 'indeterminate') {
    body = (
      <>
        <Text variant="body" testID="purchase-indeterminate">
          {t('commerce.indeterminate')}
        </Text>
        <Button
          label={t('common.retry')}
          onPress={() => void stores.purchase.confirm()}
          testID="purchase-replay"
        />
        <Button variant="ghost" label={t('common.close')} onPress={stores.purchase.dismiss} />
      </>
    );
  } else if (p.phase === 'paid' && p.order) {
    const order = p.order;
    body = (
      <>
        <Text variant="body" testID="purchase-paid">
          {t('mp.purchaseDemo')}
        </Text>
        <Text variant="caption" color="secondary">
          {t('mp.checkout.result.orderRef', {ref: order.orderId})}
        </Text>
        {accessMsg ? (
          <Text variant="caption" color="secondary" testID="purchase-access-error">
            {t(accessMsg)}
          </Text>
        ) : null}
        <Button
          label={t(accessing ? 'mp.orders.accessLoading' : 'mp.checkout.result.access')}
          loading={accessing}
          onPress={() => void openPaid(order.orderId)}
          testID="purchase-access"
        />
        <Button
          variant="secondary"
          label={t('mp.checkout.result.myPurchases')}
          onPress={go(onOpenPurchases)}
        />
        <Button variant="ghost" label={t('common.close')} onPress={stores.purchase.dismiss} />
      </>
    );
  } else {
    const kind = p.errorKind;
    body = (
      <>
        <Text variant="body" testID="purchase-failed">
          {t(purchaseErrorKey(kind))}
        </Text>
        {kind === 'subscriptionInactive' ? (
          <Button
            label={t('commerce.openSubscription')}
            onPress={go(onOpenSubscription)}
            testID="purchase-open-subscription"
          />
        ) : kind === 'insufficientBalance' ? (
          <Button label={t('mp.member.balance')} onPress={go(onOpenDsi)} />
        ) : kind === 'paymentRefused' || kind === 'unauthorized' || kind === 'noProof' ? (
          kind === 'paymentRefused' ? (
            <Button label={t('common.retry')} onPress={stores.purchase.retry} testID="purchase-retry" />
          ) : null
        ) : null}
        <Button variant="ghost" label={t('common.close')} onPress={stores.purchase.dismiss} />
      </>
    );
  }

  return (
    <Modal
      transparent
      animationType="slide"
      visible
      onRequestClose={stores.purchase.dismiss}>
      <View style={[styles.scrim, {backgroundColor: withAlpha(colors.bgDarkPremium, 0.55)}]}>
        <View
          testID="purchase-sheet"
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bgSurface,
              borderTopLeftRadius: radii.lg,
              borderTopRightRadius: radii.lg,
              gap: spacing.md,
              padding: spacing.xl,
              paddingBottom: spacing.xxl,
            },
          ]}>
          <Text variant="subtitle" accessibilityRole="header" numberOfLines={2}>
            {product.title}
          </Text>
          {body}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {flex: 1, justifyContent: 'flex-end'},
  sheet: {width: '100%'},
});
