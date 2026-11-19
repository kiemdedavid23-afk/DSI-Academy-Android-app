/**
 * Parcours de confirmation de l'achat (site : PurchaseSheet), en deux feuilles :
 *  1. Récapitulatif : produit, total, « Continuer » ;
 *  2. Moyen de paiement : Solde DSI (choisi), Mobile Money et Virement (« Bientôt »),
 *     « Payer N DSI » et mention « Paiement sécurisé ».
 * Ne calcule rien : le solde et l'état d'achat viennent des stores.
 */

import React, {useState, useSyncExternalStore} from 'react';
import {Pressable, View} from 'react-native';
import {Button, Icon, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {categoryKeys} from '../logic/errorKey';
import {formatDsiAmount} from '../logic/format';
import {COMMERCE_STORES} from '../store/commerceStores';
import type {CommerceProduct, CommerceSource} from '../store/commerceTypes';
import {Glyph} from './CheckoutGlyphs';
import {PriceTag} from './PriceTag';
import {ProductCover} from './ProductCover';

export type PurchaseStepsProps = {
  source: CommerceSource;
  product: CommerceProduct;
  cart: boolean;
  /** Ferme la feuille puis ouvre l'espace DSI (recharge). */
  onOpenDsi: () => void;
};

export function PurchaseSteps({source, product, cart, onOpenDsi}: PurchaseStepsProps) {
  const stores = COMMERCE_STORES[source];
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const [step, setStep] = useState<'recap' | 'method'>('recap');
  const bal = useSyncExternalStore(stores.balance.subscribe, stores.balance.getState);

  const price = product.priceDsi;
  const free = product.free || price === 0;
  const known = bal.status === 'success' && bal.amount !== null;
  const insufficient = known && !free && (bal.amount as number) < price;

  const categoryLabel = product.category
    ? t(categoryKeys(source, product.category), {
        defaultValue: product.category.charAt(0).toUpperCase() + product.category.slice(1),
      })
    : null;
  const meta = [categoryLabel, product.storeName].filter(Boolean).join(' · ');

  const closeBtn = (
    <Pressable
      onPress={stores.purchase.dismiss}
      accessibilityRole="button"
      accessibilityLabel={t('mp.checkout.close')}
      testID="purchase-close"
      style={{alignItems: 'center', height: 44, justifyContent: 'center', width: 44}}>
      <Icon name="XIcon" size={24} color={colors.textPrimary} />
    </Pressable>
  );

  if (step === 'recap') {
    return (
      <View style={{gap: spacing.lg}} testID="purchase-recap">
        <View style={{alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'}}>
          <Text variant="title" accessibilityRole="header">
            {t('mp.checkout.summaryTitle')}
          </Text>
          {closeBtn}
        </View>
        <View style={{alignItems: 'center', flexDirection: 'row', gap: spacing.md}}>
          {cart ? null : (
            <View style={{width: 64}}>
              <ProductCover source={source} coverUrl={product.coverUrl} title={product.title} />
            </View>
          )}
          <View style={{flex: 1, gap: 4}}>
            <Text variant="cardTitle" numberOfLines={3}>
              {cart ? t('commerce.cart.title') : product.title}
            </Text>
            {!cart && meta ? (
              <Text variant="bodySmall" color="secondary" numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
          </View>
        </View>
        {cart ? (
          <Text variant="caption" color="secondary" testID="purchase-cart-estimate">
            {t('commerce.cart.estimateNote')}
          </Text>
        ) : null}
        <View style={{alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'}}>
          <Text variant="bodyStrong" color="secondary">
            {t('mp.checkout.total')}
          </Text>
          <PriceTag priceDsi={price} free={free} large />
        </View>
        <Text variant="caption" color="secondary">
          {t('mp.checkout.deliveryNote')}
        </Text>
        <Button
          label={t('mp.checkout.continue')}
          onPress={() => {
            setStep('method');
            void stores.balance.load({force: true});
          }}
          testID="purchase-continue"
        />
      </View>
    );
  }

  const option = (opts: {
    key: string;
    glyph: 'clock' | 'phone' | 'bank' | 'dsi';
    name: string;
    selected?: boolean;
    soon?: boolean;
    children?: React.ReactNode;
  }) => (
    <View
      key={opts.key}
      testID={`purchase-method-${opts.key}`}
      style={{
        alignItems: 'center',
        backgroundColor: opts.selected ? colors.goldLight : 'transparent',
        borderColor: opts.selected ? colors.goldPrestige : 'transparent',
        borderRadius: radii.md,
        borderWidth: 1,
        flexDirection: 'row',
        gap: spacing.md,
        opacity: opts.soon ? 0.6 : 1,
        padding: spacing.md,
      }}>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.goldLight,
          borderColor: colors.goldBorder,
          borderRadius: 26,
          borderWidth: 1,
          height: 52,
          justifyContent: 'center',
          width: 52,
        }}>
        {opts.glyph === 'dsi' ? (
          <Icon name="DsiIcon" size={28} color={colors.goldPrestige} />
        ) : (
          <Glyph name={opts.glyph} size={26} color={colors.goldPrestige} />
        )}
      </View>
      <View style={{flex: 1, gap: 2}}>
        <Text variant="bodyStrong" color={opts.soon ? 'secondary' : 'primary'}>
          {opts.name}
        </Text>
        {opts.children}
      </View>
      {opts.soon ? (
        <Text variant="bodySmall" color="secondary">
          {t('mp.checkout.soon')}
        </Text>
      ) : null}
      {opts.selected ? (
        <View
          style={{
            alignItems: 'center',
            backgroundColor: colors.goldPrestige,
            borderRadius: 14,
            height: 28,
            justifyContent: 'center',
            width: 28,
          }}>
          <Icon name="CheckIcon" size={16} color={colors.bgDarkPremium} />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={{gap: spacing.md}} testID="purchase-method">
      <View
        accessibilityLabel={t('mp.checkout.progress', {current: 2, total: 3})}
        style={{backgroundColor: colors.borderLight, borderRadius: 2, height: 4}}>
        <View
          style={{backgroundColor: colors.goldPrestige, borderRadius: 2, height: 4, width: '60%'}}
        />
      </View>
      <View style={{alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'}}>
        <Pressable
          onPress={() => setStep('recap')}
          accessibilityRole="button"
          accessibilityLabel={t('mp.checkout.back')}
          testID="purchase-back"
          style={{alignItems: 'center', height: 44, justifyContent: 'center', width: 44}}>
          <Icon name="ChevronLeftIcon" size={24} color={colors.textPrimary} />
        </Pressable>
        {closeBtn}
      </View>
      <Text variant="title" accessibilityRole="header">
        {t('mp.checkout.methodTitle')}
      </Text>
      <Text variant="body" color="secondary">
        {t(free ? 'mp.checkout.methodFree' : 'mp.checkout.methodIntro')}
      </Text>
      {free
        ? null
        : option({
            key: 'dsi',
            glyph: 'dsi',
            name: t('mp.checkout.dsiName'),
            selected: true,
            children:
              bal.status === 'loading' || bal.status === 'idle' ? (
                <Text variant="bodySmall" color="secondary">
                  {t('mp.checkout.balanceLoading')}
                </Text>
              ) : bal.status === 'error' ? (
                <>
                  <Text variant="bodySmall" color="secondary">
                    {t('mp.checkout.balanceError')}
                  </Text>
                  <Button
                    variant="ghost"
                    label={t('mp.checkout.balanceRetry')}
                    onPress={() => void stores.balance.load({force: true})}
                  />
                </>
              ) : (
                <>
                  <Text variant="bodySmall" color="secondary">
                    {t('mp.checkout.balanceNow', {amount: formatDsiAmount(bal.amount as number)})}
                  </Text>
                  <Text variant="bodySmall" color={insufficient ? 'primary' : 'secondary'}>
                    {insufficient
                      ? t('mp.checkout.balanceMissing', {
                          amount: formatDsiAmount(price - (bal.amount as number)),
                        })
                      : t('mp.checkout.balanceAfter', {
                          amount: formatDsiAmount((bal.amount as number) - price),
                        })}
                  </Text>
                </>
              ),
          })}
      {free
        ? null
        : option({key: 'mobile', glyph: 'phone', name: t('mp.checkout.mobileMoney'), soon: true})}
      {free
        ? null
        : option({key: 'transfer', glyph: 'bank', name: t('mp.checkout.transfer'), soon: true})}
      {insufficient ? (
        <Button
          label={t('mp.member.balance')}
          onPress={onOpenDsi}
          testID="purchase-open-dsi"
        />
      ) : (
        <Button
          label={free ? t('mp.pd.getFree') : t('mp.checkout.pay', {amount: formatDsiAmount(price)})}
          onPress={() => void stores.purchase.confirm()}
          disabled={!free && !known}
          testID="purchase-confirm"
        />
      )}
      <View style={{alignItems: 'center', flexDirection: 'row', gap: spacing.xs, justifyContent: 'center'}}>
        <Icon name="ShieldIcon" size={16} color={colors.goldPrestige} />
        <Text variant="bodySmall" color="secondary">
          {t('mp.checkout.secure')}
        </Text>
      </View>
    </View>
  );
}
