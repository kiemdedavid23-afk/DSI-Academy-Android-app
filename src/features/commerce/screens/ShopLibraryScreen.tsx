/**
 * Bibliothèque Boutique (L8d-3) : les produits achetés. « Ouvrir » demande
 * une URL temporaire pour la version réellement acquise ; un article sans
 * fichier déterminé n'a aucun bouton, et une ressource indisponible n'est
 * jamais réessayée automatiquement (support).
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
import {categoryKeys, commerceErrorKey, libraryOpenErrorKey} from '../logic/errorKey';
import {shopLibraryStore} from '../store/libraryStore';
import type {CommerceAccess} from '../store/commerceTypes';

export type ShopLibraryScreenProps = {
  onDiscover: () => void;
  onOpenAccess: (access: CommerceAccess) => void;
};

export function ShopLibraryScreen({
  onDiscover,
  onOpenAccess,
}: ShopLibraryScreenProps) {
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();
  const lib = useSyncExternalStore(
    shopLibraryStore.subscribe,
    shopLibraryStore.getState,
  );
  const [message, setMessage] = useState<{id: string; key: string} | null>(null);
  const [blocked, setBlocked] = useState<string[]>([]);

  useEffect(() => {
    void shopLibraryStore.load({force: true});
  }, []);

  const open = async (productId: string) => {
    setMessage(null);
    const res = await shopLibraryStore.open(productId);
    if (res.ok) {
      onOpenAccess({url: res.url, mode: 'external'});
      return;
    }
    if (res.errorKind === 'entitlementUnavailable') {
      setBlocked(prev => [...prev, productId]);
    }
    setMessage({id: productId, key: libraryOpenErrorKey(res.errorKind)});
  };

  if ((lib.status === 'loading' || lib.status === 'idle') && lib.items.length === 0) {
    return <LoadingState accessibilityLabel={t('content.loading')} />;
  }
  if (lib.status === 'error' && lib.items.length === 0) {
    return (
      <ErrorState
        message={t(commerceErrorKey(lib.errorKind))}
        retryLabel={t('common.retry')}
        onRetry={() => void shopLibraryStore.load({force: true})}
        testID="library-error"
      />
    );
  }

  return (
    <FlatList
      style={{flex: 1, backgroundColor: colors.bgApp}}
      testID="screen-shop-library"
      data={lib.items}
      keyExtractor={i => i.productId}
      contentContainerStyle={{
        gap: spacing.lg,
        padding: spacing.xl,
        paddingBottom: spacing.xxxl,
      }}
      ListEmptyComponent={
        <EmptyState
          title={t('commerce.library.emptyTitle')}
          message={t('commerce.library.emptyHint')}
          actionLabel={t('mp.favs.emptyCta')}
          onAction={onDiscover}
          testID="library-empty"
        />
      }
      renderItem={({item}) => {
        const unavailable =
          !item.hasAsset || !item.assetFileId || blocked.includes(item.productId);
        const category = item.category
          ? t(categoryKeys('shop', item.category), {defaultValue: item.category})
          : null;
        return (
          <View style={{gap: spacing.xs}} testID={`library-item-${item.productId}`}>
            <Text variant="bodySmallStrong" numberOfLines={2}>
              {item.title || t('commerce.cart.unavailable')}
            </Text>
            <Text variant="caption" color="secondary">
              {[
                category,
                item.grantedAt
                  ? t('commerce.library.grantedOn', {
                      date: new Date(item.grantedAt).toLocaleDateString(),
                    })
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {message?.id === item.productId ? (
              <Text variant="caption" color="secondary" testID="library-open-error">
                {t(message.key)}
              </Text>
            ) : null}
            {unavailable ? (
              <Text variant="caption" color="secondary" testID="library-no-file">
                {t('commerce.library.noFile')}
              </Text>
            ) : (
              <Button
                label={t(
                  lib.openingId === item.productId
                    ? 'commerce.library.opening'
                    : 'commerce.library.open',
                )}
                loading={lib.openingId === item.productId}
                disabled={lib.openingId !== null}
                onPress={() => void open(item.productId)}
                testID={`library-open-${item.productId}`}
              />
            )}
          </View>
        );
      }}
    />
  );
}
