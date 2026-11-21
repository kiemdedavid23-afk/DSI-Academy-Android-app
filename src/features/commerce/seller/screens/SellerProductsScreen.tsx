/**
 * Onglet Produits (lot S5) : compteurs, « Créer un produit », filtres
 * Tous / Publiés / Brouillons, recherche, grille à deux colonnes, menu ⋮
 * (modifier, soumettre, repasser en brouillon, dupliquer, archiver), pagination
 * par curseur. Quatre états : chargement, vide, erreur, données. « Importer »
 * et « Générer avec l'IA » sont hors périmètre (D8).
 */

import React, {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {Alert, FlatList, TextInput, View} from 'react-native';
import {ErrorState, LoadingState, Text, useSellerColors, sellerMetrics} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import type {SellerListingStatus, SellerListingSummary} from '../../store/sellerTypes';
import {SellerActionSheet} from '../components/SellerActionSheet';
import {SellerPillButton} from '../components/SellerPillButton';
import {SellerProductCard} from '../components/SellerProductCard';
import {SellerSegmented} from '../components/SellerSegmented';
import {formatFcfaFromDsi} from '../logic/sellerFormat';
import {
  actionsFor,
  productErrorKey,
  type ProductAction,
  type ProductFilter,
} from '../logic/sellerProductForm';
import {sellerProducts, sellerProductsStore} from '../store/sellerProductsStore';

const P = 'commerce.sellerSpace.products';
const SEARCH_DELAY_MS = 400;

const STATUS_TONE: Record<SellerListingStatus, 'positive' | 'neutral' | 'negative'> = {
  published: 'positive',
  draft: 'neutral',
  pending_review: 'neutral',
  rejected: 'negative',
  suspended: 'negative',
  archived: 'neutral',
};

export type SellerProductsScreenProps = {
  header: React.ReactNode;
  onCreate: () => void;
  onEdit: (id: string) => void;
};

export function SellerProductsScreen({header, onCreate, onEdit}: SellerProductsScreenProps) {
  const sellerColors = useSellerColors();
  const {t} = useTranslation();
  const s = useSyncExternalStore(
    cb => sellerProductsStore.subscribe(() => cb()),
    sellerProductsStore.getState,
  );
  const [text, setText] = useState('');
  const [menuFor, setMenuFor] = useState<SellerListingSummary | null>(null);
  const first = useRef(true);

  useEffect(() => {
    void sellerProducts.load();
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => void sellerProducts.setQuery(text), SEARCH_DELAY_MS);
    return () => clearTimeout(id);
  }, [text]);

  const counts = s.counts;
  const options: Array<{id: ProductFilter; label: string}> = [
    {id: 'all', label: t(`${P}.filterAll`, {count: counts?.all ?? 0})},
    {id: 'published', label: t(`${P}.filterPublished`, {count: counts?.published ?? 0})},
    {id: 'draft', label: t(`${P}.filterDraft`, {count: counts?.draft ?? 0})},
  ];

  const run = async (item: SellerListingSummary, action: ProductAction) => {
    setMenuFor(null);
    if (action === 'edit') {
      onEdit(item.id);
      return;
    }
    if (action === 'archive') {
      Alert.alert(t(`${P}.archiveTitle`), t(`${P}.archiveBody`), [
        {text: t(`${P}.cancel`), style: 'cancel'},
        {
          text: t(`${P}.actions.archive`),
          style: 'destructive',
          onPress: () => void sellerProducts.act(item.id, 'archive'),
        },
      ]);
      return;
    }
    await sellerProducts.act(item.id, action);
  };

  const top = (
    <View style={{gap: 12, paddingHorizontal: sellerMetrics.margin, paddingBottom: 16}}>
      <Text variant="display" accessibilityRole="header" style={{color: sellerColors.ink}}>
        {t(`${P}.title`)}
      </Text>
      {counts ? (
        <Text variant="body" style={{color: sellerColors.inkMuted}}>
          {t(`${P}.summaryAll`, {count: counts.all})} ·{' '}
          {t(`${P}.summaryPublished`, {count: counts.published})}
        </Text>
      ) : null}
      <SellerPillButton
        tone="orange"
        label={`+ ${t(`${P}.create`)}`}
        onPress={onCreate}
        testID="seller-products-create"
      />
      <SellerSegmented options={options} value={s.filter} onChange={f => void sellerProducts.setFilter(f)} />
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t(`${P}.searchPlaceholder`)}
        placeholderTextColor={sellerColors.inkMuted}
        accessibilityLabel={t(`${P}.searchPlaceholder`)}
        returnKeyType="search"
        maxLength={80}
        testID="seller-products-search"
        style={{
          backgroundColor: sellerColors.surfaceMuted,
          borderRadius: 9999,
          color: sellerColors.ink,
          minHeight: 52,
          paddingHorizontal: 20,
        }}
      />
      {s.actionError ? (
        <Text variant="bodySmall" accessibilityLiveRegion="polite" style={{color: sellerColors.negativeText}}>
          {t(productErrorKey(s.actionError))}
        </Text>
      ) : null}
    </View>
  );

  let body: React.ReactNode = null;
  if (s.status === 'error' && s.items.length === 0) {
    body = (
      <ErrorState
        message={t(productErrorKey(s.error))}
        retryLabel={t('common.retry')}
        onRetry={() => void sellerProducts.load()}
        testID="seller-products-error"
      />
    );
  } else if (s.status !== 'success' && s.items.length === 0) {
    body = <LoadingState testID="seller-products-loading" />;
  } else if (s.items.length === 0) {
    body = (
      <Text variant="body" style={{color: sellerColors.inkMuted, padding: sellerMetrics.margin, textAlign: 'center'}} testID="seller-products-empty">
        {t(s.query ? `${P}.emptySearch` : `${P}.empty`)}
      </Text>
    );
  }

  return (
    <>
      <FlatList
        data={s.items}
        keyExtractor={i => i.id}
        numColumns={2}
        columnWrapperStyle={{gap: sellerMetrics.gap, paddingHorizontal: sellerMetrics.margin}}
        contentContainerStyle={{gap: 20, paddingBottom: 32}}
        keyboardShouldPersistTaps="handled"
        style={{backgroundColor: sellerColors.bg, flex: 1}}
        testID="seller-products"
        ListHeaderComponent={
          <>
            {header}
            {top}
            {body}
          </>
        }
        onEndReached={() => void sellerProducts.loadMore()}
        onEndReachedThreshold={0.5}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        ListFooterComponent={s.loadingMore ? <LoadingState /> : null}
        renderItem={({item, index}) => (
          <SellerProductCard
            testID={`seller-product-${item.id}`}
            title={item.title}
            categoryLabel={item.categoryLabel ?? ''}
            coverUrl={item.coverUrl}
            tone={index % 2 === 0 ? 'peach' : 'sky'}
            statusLabel={t(`${P}.status.${item.status}`)}
            statusTone={STATUS_TONE[item.status]}
            priceLabel={
              item.free || item.priceDsi === 0
                ? t(`${P}.free`)
                : t(`${P}.price`, {amount: formatFcfaFromDsi(item.priceDsi)})
            }
            menuLabel={t(`${P}.menu`)}
            busy={s.busyId === item.id}
            onPress={() => onEdit(item.id)}
            onMenu={() => setMenuFor(item)}
          />
        )}
      />
      <SellerActionSheet
        visible={menuFor !== null}
        title={menuFor?.title ?? ''}
        closeLabel={t(`${P}.cancel`)}
        actions={(menuFor ? actionsFor(menuFor.status) : []).map(a => ({
          id: a,
          label: t(`${P}.actions.${a}`),
          danger: a === 'archive',
        }))}
        onSelect={id => menuFor && void run(menuFor, id as ProductAction)}
        onClose={() => setMenuFor(null)}
      />
    </>
  );
}
