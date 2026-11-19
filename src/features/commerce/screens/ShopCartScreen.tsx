/**
 * Panier Boutique (L8d-2) : lignes, quantités, code promo (aperçu), totaux
 * estimés et paiement par la fenêtre d'achat commune. Le prix vient du
 * catalogue ; le Worker recalcule tout au paiement.
 */

import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {ScrollView, View} from 'react-native';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Text,
  TextField,
  useTheme,
} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {CartLineRow} from '../components/CartLineRow';
import {cartCheckoutProduct, cartTotals} from '../logic/cart';
import {commerceErrorKey} from '../logic/errorKey';
import {formatDsiAmount} from '../logic/format';
import {PurchaseSheet, type PurchaseSheetProps} from '../components/PurchaseSheet';
import {shopCartStore} from '../store/cartStore';
import {COMMERCE_STORES} from '../store/commerceStores';
import type {CommerceProduct} from '../store/commerceTypes';

export type ShopCartScreenProps = {
  sheet: Omit<PurchaseSheetProps, 'source'>;
  onDiscover: () => void;
  onOpenProduct: (product: CommerceProduct) => void;
};

export function ShopCartScreen({
  sheet,
  onDiscover,
  onOpenProduct,
}: ShopCartScreenProps) {
  const stores = COMMERCE_STORES.shop;
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const cart = useSyncExternalStore(
    shopCartStore.subscribe,
    shopCartStore.getState,
  );
  const purchase = useSyncExternalStore(
    stores.purchase.subscribe,
    stores.purchase.getState,
  );
  const [code, setCode] = useState('');
  const [writeError, setWriteError] = useState(false);

  // Le panier est toujours relu à l'ouverture (jamais servi du cache).
  useEffect(() => {
    void shopCartStore.load({force: true});
  }, []);

  const linesKey = cart.lines.map(l => l.productId).join('|');
  useEffect(() => {
    if (cart.status === 'success') {
      void shopCartStore.hydrate(stores.catalogue.getState().items);
    }
  }, [cart.status, linesKey, stores]);

  // Achat payé : le panier serveur est relu et le code promo effacé.
  const paidCart = purchase.cart && purchase.phase === 'paid';
  useEffect(() => {
    if (paidCart) {
      shopCartStore.clearPromo();
      setCode('');
      void shopCartStore.load({force: true});
    }
  }, [paidCart]);

  const write = async (fn: () => Promise<{ok: boolean}>) => {
    setWriteError(false);
    const res = await fn();
    if (!res.ok) {
      setWriteError(true);
    }
  };

  if (cart.status !== 'success' && cart.lines.length === 0) {
    if (cart.status === 'error') {
      return (
        <ErrorState
          message={t(commerceErrorKey(cart.errorKind))}
          retryLabel={t('common.retry')}
          onRetry={() => void shopCartStore.load({force: true})}
          testID="cart-error"
        />
      );
    }
    return <LoadingState accessibilityLabel={t('content.loading')} />;
  }
  if (cart.lines.length === 0) {
    return (
      <EmptyState
        title={t('commerce.cart.emptyTitle')}
        message={t('commerce.cart.emptyHint')}
        actionLabel={t('mp.favs.emptyCta')}
        onAction={onDiscover}
        testID="cart-empty"
      />
    );
  }

  const byId = new Map(cart.products.map(p => [p.id, p]));
  const resolved = cart.productsStatus === 'success';
  const unavailable = resolved
    ? cart.lines.filter(l => !byId.has(l.productId))
    : [];
  const totals = cartTotals(cart.lines, cart.products, cart.promo);
  const busy = cart.busyId !== null;
  const canPay = resolved && unavailable.length === 0 && !busy;

  const apply = async () => {
    await shopCartStore.previewPromo(code);
  };

  const pay = () => {
    stores.purchase.start(
      cartCheckoutProduct(t('commerce.cart.title'), totals.totalDsi),
      {promoCode: cart.promo?.code ?? null, cart: true},
    );
  };

  const promoMessage =
    cart.promoStatus === 'valid' && cart.promo
      ? cart.promo.kind === 'percent'
        ? t('commerce.cart.promoValid', {
            code: cart.promo.code,
            value: cart.promo.value,
          })
        : t('commerce.cart.promoValidOther', {code: cart.promo.code})
      : cart.promoStatus === 'invalid'
        ? t('commerce.cart.promoInvalid')
        : t('commerce.cart.promoNote');

  return (
    <>
      <ScrollView
        style={{flex: 1, backgroundColor: colors.bgApp}}
        contentContainerStyle={{
          gap: spacing.lg,
          padding: spacing.xl,
          paddingBottom: spacing.xxxl,
        }}
        testID="screen-shop-cart">
        {writeError ? (
          <Text variant="caption" color="secondary" testID="cart-write-error">
            {t('commerce.cart.writeError')}
          </Text>
        ) : null}

        {cart.lines.map(line => (
          <CartLineRow
            key={line.productId}
            productId={line.productId}
            qty={line.qty}
            product={byId.get(line.productId)}
            loading={!byId.has(line.productId) && !resolved}
            busy={busy}
            removing={cart.busyId === line.productId}
            onMinus={() => void write(() => shopCartStore.setQty(line.productId, line.qty - 1))}
            onPlus={() => void write(() => shopCartStore.setQty(line.productId, line.qty + 1))}
            onRemove={() => void write(() => shopCartStore.remove(line.productId))}
            onDetails={onOpenProduct}
          />
        ))}

        {cart.productsStatus === 'error' ? (
          <View style={{gap: spacing.xs}}>
            <Text variant="caption" color="secondary">
              {t(commerceErrorKey(cart.productsErrorKind))}
            </Text>
            <Button
              variant="ghost"
              label={t('common.retry')}
              onPress={() =>
                void shopCartStore.hydrate(stores.catalogue.getState().items)
              }
              testID="cart-products-retry"
            />
          </View>
        ) : null}

        <View style={{gap: spacing.sm}}>
          <TextField
            label={t('commerce.cart.promoLabel')}
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            maxLength={40}
            helper={promoMessage}
            testID="cart-promo-input"
          />
          <View style={{flexDirection: 'row', gap: spacing.sm}}>
            <Button
              variant="secondary"
              label={t(
                cart.promoStatus === 'checking'
                  ? 'commerce.cart.promoChecking'
                  : 'commerce.cart.promoApply',
              )}
              loading={cart.promoStatus === 'checking'}
              disabled={code.trim() === ''}
              onPress={() => void apply()}
              testID="cart-promo-apply"
            />
            {cart.promo ? (
              <Button
                variant="ghost"
                label={t('commerce.cart.promoRemove')}
                onPress={() => {
                  shopCartStore.clearPromo();
                  setCode('');
                }}
                testID="cart-promo-remove"
              />
            ) : null}
          </View>
        </View>

        <View
          style={{
            backgroundColor: colors.bgSurface,
            borderColor: colors.goldBorder,
            borderRadius: radii.md,
            borderWidth: 1,
            gap: spacing.xs,
            padding: spacing.lg,
          }}
          testID="cart-totals">
          <Text variant="body">
            {t('commerce.cart.subtotal', {
              amount: formatDsiAmount(totals.subtotalDsi),
            })}
          </Text>
          {totals.discountDsi !== null ? (
            <Text variant="body">
              {t('commerce.cart.discount', {
                amount: formatDsiAmount(totals.discountDsi),
              })}
            </Text>
          ) : null}
          <Text variant="subtitle" color="gold">
            {t('commerce.cart.total', {
              amount: formatDsiAmount(totals.totalDsi),
            })}
          </Text>
        </View>

        {unavailable.length > 0 ? (
          <Text variant="caption" color="secondary" testID="cart-blocked">
            {t('commerce.cart.blocked')}
          </Text>
        ) : null}
        <Button
          label={t('commerce.cart.checkout')}
          disabled={!canPay}
          onPress={pay}
          testID="cart-checkout"
        />
      </ScrollView>
      <PurchaseSheet source="shop" {...sheet} />
    </>
  );
}
