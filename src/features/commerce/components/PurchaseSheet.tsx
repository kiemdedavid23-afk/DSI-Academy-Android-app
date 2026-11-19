/**
 * Fenêtre d'achat commune (site : PurchaseSheet). Un seul parcours pour la
 * Boutique et la Marketplace : confirmer, payer avec le solde DSI, voir le
 * résultat. L'écran ne calcule rien : l'état vient du store d'achat.
 */

import React, {useEffect, useSyncExternalStore} from 'react';
import {Modal, StyleSheet, View} from 'react-native';
import {Button, Text, useTheme, withAlpha} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {cartPurchaseErrorKey, purchaseErrorKey} from '../logic/errorKey';
import {COMMERCE_STORES} from '../store/commerceStores';
import type {CommerceAccess, CommerceSource} from '../store/commerceTypes';
import {PurchaseSteps} from './PurchaseSteps';
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

  const go = (fn: () => void) => () => {
    stores.purchase.dismiss();
    fn();
  };

  let body: React.ReactNode = null;
  if (p.phase === 'confirming') {
    body = null;
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
          {confirming ? (
            <PurchaseSteps
              source={source}
              product={product}
              cart={p.cart}
              onOpenDsi={go(onOpenDsi)}
            />
          ) : (
            <>
              <Text variant="subtitle" accessibilityRole="header" numberOfLines={2}>
                {p.cart ? t('commerce.cart.title') : product.title}
              </Text>
              {body}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {flex: 1, justifyContent: 'flex-end'},
  sheet: {width: '100%'},
});
