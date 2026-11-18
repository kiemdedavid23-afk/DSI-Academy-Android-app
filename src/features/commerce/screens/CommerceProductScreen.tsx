/**
 * Fiche produit commune (site : MpProductPage). Le produit venu de la liste
 * s'affiche tout de suite ; la fiche est relue pour les champs complets.
 * `renderAction` accueille l'achat (L8c) : la fiche n'en connaît pas la logique.
 */

import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {ScrollView, View} from 'react-native';
import {Button, ErrorState, LoadingState, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {PriceTag} from '../components/PriceTag';
import {ProductCover} from '../components/ProductCover';
import {categoryKeys, commerceErrorKey} from '../logic/errorKey';
import {COMMERCE_STORES} from '../store/commerceStores';
import type {CommerceProduct, CommerceSource} from '../store/commerceTypes';

export type CommerceProductScreenProps = {
  source: CommerceSource;
  id: string;
  /** Produit déjà connu (liste) : affiché sans attendre le Worker. */
  seed?: CommerceProduct | null;
  renderAction?: (product: CommerceProduct) => React.ReactNode;
};

export function CommerceProductScreen({
  source,
  id,
  seed,
  renderAction,
}: CommerceProductScreenProps) {
  const stores = COMMERCE_STORES[source];
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();
  const [favError, setFavError] = useState<string | null>(null);

  const detail = useSyncExternalStore(stores.detail.subscribe, stores.detail.getState);
  const favs = useSyncExternalStore(stores.favorites.subscribe, stores.favorites.getState);

  useEffect(() => {
    void stores.detail.open(id, seed ?? null);
    void stores.favorites.loadIds();
    // `seed` n'est lu qu'à l'ouverture : un changement ne doit pas relancer l'appel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores, id]);

  const product = detail.id === id ? detail.product : null;

  if (!product) {
    if (detail.id === id && detail.status === 'error') {
      return (
        <View style={{flex: 1, backgroundColor: colors.bgApp}}>
          <ErrorState
            message={t(commerceErrorKey(detail.errorKind))}
            retryLabel={t('common.retry')}
            onRetry={() => void stores.detail.open(id, null)}
            testID="commerce-product-error"
          />
        </View>
      );
    }
    return (
      <View style={{flex: 1, backgroundColor: colors.bgApp}}>
        <LoadingState accessibilityLabel={t('content.loading')} />
      </View>
    );
  }

  const isFavorite = favs.ids.includes(product.id);

  const onToggle = async () => {
    setFavError(null);
    const res = await stores.favorites.toggle(product);
    if (!res.ok) {
      setFavError(
        res.errorKind === 'unauthorized' || res.errorKind === 'noProof'
          ? commerceErrorKey(res.errorKind)
          : isFavorite
          ? 'mp.favs.removeError'
          : 'commerce.favAddError',
      );
    }
  };

  const category = product.category
    ? t(categoryKeys(source, product.category), {defaultValue: product.category})
    : null;

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: colors.bgApp}}
      contentContainerStyle={{
        gap: spacing.lg,
        padding: spacing.xl,
        paddingBottom: spacing.xxxl,
      }}
      testID={`screen-${source}-product`}>
      <ProductCover source={source} coverUrl={product.coverUrl} />
      <View style={{gap: spacing.xs}}>
        {category ? (
          <Text variant="micro" color="muted" style={{textTransform: 'uppercase'}}>
            {category}
          </Text>
        ) : null}
        <Text variant="title" accessibilityRole="header">
          {product.title}
        </Text>
        {product.storeName ? (
          <Text variant="caption" color="secondary">
            {`${t('mp.by')} ${product.storeName}`}
          </Text>
        ) : null}
        {product.tagline ? (
          <Text variant="body" color="secondary">
            {product.tagline}
          </Text>
        ) : null}
        {product.reviewCount > 0 && product.reviewAvg !== null ? (
          <Text variant="caption" color="secondary">
            {`${product.reviewAvg.toFixed(1)} · ${t('commerce.reviews', {
              count: product.reviewCount,
            })}`}
          </Text>
        ) : null}
        <PriceTag priceDsi={product.priceDsi} free={product.free} large />
      </View>

      {product.description ? (
        <View style={{gap: spacing.xs}}>
          <Text variant="subtitle" accessibilityRole="header">
            {t('app.catalogue.about')}
          </Text>
          <Text variant="body">{product.description}</Text>
        </View>
      ) : null}

      {renderAction ? renderAction(product) : null}

      <Button
        variant="secondary"
        label={isFavorite ? t('mp.favs.remove') : t('commerce.favAdd')}
        onPress={() => void onToggle()}
        testID="commerce-favorite-toggle"
      />
      {favError ? (
        <Text variant="caption" color="secondary" testID="commerce-favorite-error">
          {t(favError)}
        </Text>
      ) : null}
    </ScrollView>
  );
}
