/**
 * Fiche produit commune (site : MpProductPage). Entête immersif : fond flou de
 * la couverture, couverture nette, puces, titre, vendeur, note. Corps : favori,
 * garanties, description, puis `renderAction` (extras de la source). Barre
 * d'achat fixe en bas (`renderBar`) avec le prix. Le produit venu de la liste
 * s'affiche tout de suite ; la fiche est relue pour les champs complets.
 */

import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {Image, Pressable, ScrollView, View} from 'react-native';
import {
  Button,
  ErrorState,
  Icon,
  LoadingState,
  Text,
  useTheme,
  withAlpha,
} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {PriceTag} from '../components/PriceTag';
import {ProductCover} from '../components/ProductCover';
import {RatingStars} from '../components/Stars';
import {artFor} from '../logic/art';
import {categoryKeys, commerceErrorKey} from '../logic/errorKey';
import {COMMERCE_STORES} from '../store/commerceStores';
import type {CommerceProduct, CommerceSource} from '../store/commerceTypes';

const BAR_HEIGHT = 84;

export type CommerceProductScreenProps = {
  source: CommerceSource;
  id: string;
  /** Produit déjà connu (liste) : affiché sans attendre le Worker. */
  seed?: CommerceProduct | null;
  /** Contenu propre à la source, sous la description (panier, vendeur, avis…). */
  renderAction?: (product: CommerceProduct) => React.ReactNode;
  /** Bouton d'achat de la barre fixe, à côté du prix. */
  renderBar?: (product: CommerceProduct) => React.ReactNode;
};

export function CommerceProductScreen({
  source,
  id,
  seed,
  renderAction,
  renderBar,
}: CommerceProductScreenProps) {
  const stores = COMMERCE_STORES[source];
  const {t} = useTranslation();
  const {colors, spacing, radii, touch} = useTheme();
  const [favError, setFavError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const detail = useSyncExternalStore(stores.detail.subscribe, stores.detail.getState);
  const favs = useSyncExternalStore(stores.favorites.subscribe, stores.favorites.getState);

  useEffect(() => {
    setExpanded(false);
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
          : 'mp.pd.favoriteNote.error',
      );
    }
  };

  const category = product.category
    ? t(categoryKeys(source, product.category), {
        defaultValue: product.category.charAt(0).toUpperCase() + product.category.slice(1),
      })
    : null;
  const rating =
    product.reviewAvg !== null && product.reviewCount > 0 ? product.reviewAvg : null;
  const long = (product.description ?? '').length > 220;
  const chip = {
    borderColor: withAlpha(colors.textOnDark, 0.28),
    backgroundColor: withAlpha(colors.bgDarkPremium, 0.55),
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  };

  return (
    <View style={{flex: 1, backgroundColor: colors.bgApp}} testID={`screen-${source}-product`}>
      <ScrollView
        contentContainerStyle={{paddingBottom: renderBar ? BAR_HEIGHT + spacing.xl : spacing.xxxl}}>
        <View
          style={{
            backgroundColor: colors.bgDarkPremium,
            borderBottomColor: colors.goldBorder,
            borderBottomWidth: 1,
            overflow: 'hidden',
          }}>
          <Image
            source={product.coverUrl ? {uri: product.coverUrl} : artFor(product.title)}
            blurRadius={24}
            resizeMode="cover"
            style={{position: 'absolute', top: 0, bottom: 0, left: 0, right: 0}}
            accessible={false}
          />
          <View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: withAlpha(colors.bgDarkPremium, 0.55),
            }}
          />
          <View
            style={{
              alignItems: 'center',
              gap: spacing.md,
              paddingHorizontal: spacing.xl,
              paddingVertical: spacing.xl,
            }}>
            <View style={{maxWidth: 240, width: '60%'}}>
              <ProductCover source={source} coverUrl={product.coverUrl} title={product.title} />
            </View>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center'}}>
              {category ? (
                <View style={chip}>
                  <Text variant="micro" style={{color: colors.textOnDark, textTransform: 'uppercase'}}>
                    {category}
                  </Text>
                </View>
              ) : null}
              {product.free ? (
                <View
                  style={[
                    chip,
                    {
                      backgroundColor: withAlpha(colors.goldPrestige, 0.14),
                      borderColor: colors.goldBorder,
                    },
                  ]}>
                  <Text variant="micro" style={{color: colors.goldPrestige, textTransform: 'uppercase'}}>
                    {t('mp.card.free')}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text variant="title" accessibilityRole="header" style={{color: colors.textOnDark, textAlign: 'center'}}>
              {product.title}
            </Text>
            {product.storeName ? (
              <Text variant="bodySmall" style={{color: colors.textOnDark, opacity: 0.9}}>
                {t('mp.pd.by', {store: product.storeName})}
              </Text>
            ) : null}
            {rating !== null || product.salesCount > 0 ? (
              <View
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: spacing.md,
                  justifyContent: 'center',
                }}>
                {rating !== null ? (
                  <View
                    style={{alignItems: 'center', flexDirection: 'row', gap: 6}}
                    accessibilityLabel={t('mp.pd.ratingAria', {value: rating.toFixed(1)})}>
                    <RatingStars value={rating} />
                    <Text variant="captionStrong" style={{color: colors.textOnDark}}>
                      {rating.toFixed(1)}
                    </Text>
                    <Text variant="caption" style={{color: colors.textOnDark, opacity: 0.85}}>
                      {`(${t('mp.pd.reviewCount', {count: product.reviewCount})})`}
                    </Text>
                  </View>
                ) : null}
                {product.salesCount > 0 ? (
                  <Text variant="caption" style={{color: colors.textOnDark, opacity: 0.85}}>
                    {t('mp.pd.sold', {count: product.salesCount})}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        <View style={{gap: spacing.xl, padding: spacing.xl}}>
          <View style={{alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end'}}>
            <Pressable
              onPress={() => void onToggle()}
              accessibilityRole="button"
              accessibilityState={{selected: isFavorite}}
              accessibilityLabel={isFavorite ? t('mp.pd.favoriteOn') : t('mp.pd.favoriteOff')}
              testID="commerce-favorite-toggle"
              style={{
                alignItems: 'center',
                backgroundColor: isFavorite ? colors.goldLight : colors.bgSurface,
                borderColor: isFavorite ? colors.goldBorder : colors.borderLight,
                borderRadius: radii.md,
                borderWidth: 1,
                justifyContent: 'center',
                minHeight: touch.min,
                minWidth: touch.min,
              }}>
              <Icon
                name="BookmarkIcon"
                size={22}
                color={isFavorite ? colors.goldPrestige : colors.textPrimary}
              />
            </Pressable>
          </View>
          {favError ? (
            <Text variant="caption" color="secondary" testID="commerce-favorite-error">
              {t(favError)}
            </Text>
          ) : null}

          {source === 'marketplace' ? (
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm}}>
              <Text variant="caption" color="secondary">
                {`✓ ${t('mp.pd.instant')}`}
              </Text>
              <Text variant="caption" color="secondary">
                {`✓ ${t('mp.pd.secure')}`}
              </Text>
            </View>
          ) : null}

          {product.tagline ? (
            <Text variant="body" color="secondary">
              {product.tagline}
            </Text>
          ) : null}

          {product.description ? (
            <View style={{gap: spacing.sm}}>
              <Text variant="subtitle" accessibilityRole="header">
                {t('mp.pd.description')}
              </Text>
              <Text variant="body" color="secondary" numberOfLines={expanded || !long ? undefined : 5}>
                {product.description}
              </Text>
              {long ? (
                <Button
                  variant="ghost"
                  label={expanded ? t('mp.pd.showLess') : t('mp.pd.showMore')}
                  onPress={() => setExpanded(v => !v)}
                  testID="commerce-description-toggle"
                />
              ) : null}
            </View>
          ) : null}

          {renderAction ? renderAction(product) : null}
        </View>
      </ScrollView>

      {renderBar ? (
        <View
          style={{
            alignItems: 'center',
            backgroundColor: colors.bgSurface,
            borderTopColor: colors.goldBorder,
            borderTopWidth: 1,
            bottom: 0,
            flexDirection: 'row',
            gap: spacing.lg,
            justifyContent: 'space-between',
            left: 0,
            minHeight: BAR_HEIGHT,
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.md,
            position: 'absolute',
            right: 0,
          }}
          testID="commerce-buy-bar">
          <View>
            <Text variant="caption" color="secondary">
              {t('mp.pd.price')}
            </Text>
            <PriceTag priceDsi={product.priceDsi} free={product.free} large />
          </View>
          <View style={{flex: 1, maxWidth: 220}}>{renderBar(product)}</View>
        </View>
      ) : null}
    </View>
  );
}
