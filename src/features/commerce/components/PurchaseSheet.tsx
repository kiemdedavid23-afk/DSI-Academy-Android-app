/**
 * Fenêtre d'achat commune (site : PurchaseSheet). Un seul parcours pour la
 * Boutique et la Marketplace : confirmer, payer avec le solde DSI, voir le
 * résultat. L'écran ne calcule rien : l'état vient du store d'achat.
 */

import React, {useEffect, useSyncExternalStore} from 'react';
import {Modal, StyleSheet, View} from 'react-native';
import {Button, Text, useTheme, withAlpha} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {formatDsiAmount} from '../logic/format';
import {cartPurchaseErrorKey, purchaseErrorKey} from '../logic/errorKey';
import {COMMERCE_STORES} from '../store/commerceStores';
import type {CommerceAccess, CommerceSource} from '../store/commerceTypes';
import {PriceTag} from './PriceTag';
import {PurchaseStatusPage} from './PurchaseStatusPage';

export type PurchaseSheetProps = {
  source: CommerceSource;
  onOpenDsi: () => void;
  onOpenSubscription: () => void;
  onOpenPurchases: () => void;
  /** Boutique : après un paiement du panier, ouvre la Bibliothèque. */
  onOpenLibrary?: () => void;
  /** Ouvre l'achat : lien du vendeur (WebView) ou fichier (hors de l'app). */
  onOpenAccess: (access: CommerceAccess) => void;
};

export function PurchaseSheet({
  source,
  onOpenDsi,
  onOpenSubscription,
  onOpenPurchases,
  onOpenLibrary,
  onOpenAccess,
}: PurchaseSheetProps) {
  const stores = COMMERCE_STORES[source];
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const p = useSyncExternalStore(stores.purchase.subscribe, stores.purchase.getState);
  const bal = useSyncExternalStore(stores.balance.subscribe, stores.balance.getState);
  const confirming = p.phase === 'confirming';
  useEffect(() => {
    if (confirming) {
      void stores.balance.load({force: true});
    }
  }, [stores, confirming]);

  if (p.phase === 'idle' || !p.product) {
    return null;
  }
  if (p.phase === 'processing' || p.phase === 'pending' || p.phase === 'paid') {
    return (
      <PurchaseStatusPage
        source={source}
        onOpenPurchases={onOpenPurchases}
        onOpenLibrary={onOpenLibrary}
        onOpenAccess={onOpenAccess}
      />
    );
  }
  const product = p.product;
  const price = product.priceDsi;
  const known = bal.status === 'success' && bal.amount !== null;
  const insufficient = known && price > 0 && (bal.amount as number) < price;

  const go = (fn: () => void) => () => {
    stores.purchase.dismiss();
    fn();
  };

  let body: React.ReactNode = null;
  if (p.phase === 'confirming') {
    body = (
      <>
        <PriceTag priceDsi={price} free={product.free} large />
        {p.cart ? (
          <Text variant="caption" color="secondary" testID="purchase-cart-estimate">
            {t('commerce.cart.estimateNote')}
          </Text>
        ) : null}
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
  } else {
    const kind = p.errorKind;
    body = (
      <>
        <Text variant="body" testID="purchase-failed">
          {t(p.cart ? cartPurchaseErrorKey(kind, p.promoCode !== null) : purchaseErrorKey(kind))}
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
            {p.cart ? t('commerce.cart.title') : product.title}
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
