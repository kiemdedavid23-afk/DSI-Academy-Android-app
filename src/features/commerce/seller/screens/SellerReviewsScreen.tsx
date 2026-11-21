/**
 * Avis reçus (lot S8) : note moyenne, répartition de 5 à 1 étoiles, puis liste
 * paginée du plus récent au plus ancien. Auteur inconnu : « Acheteur ».
 * Commentaire ou produit absents : omis.
 */

import React, {useEffect, useSyncExternalStore} from 'react';
import {FlatList, View} from 'react-native';
import {ErrorState, LoadingState, Text, useSellerColors, sellerMetrics} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {formatOrderDate} from '../../logic/purchases';
import {SellerStars} from '../components/SellerStars';
import {SellerSubHeader} from '../components/SellerSubHeader';
import {overviewErrorKey} from '../logic/sellerFormat';
import {distributionRows, filledStars, formatRating} from '../logic/sellerMore';
import {sellerReviews, sellerReviewsStore} from '../store/sellerReviewsStore';

const R = 'commerce.sellerSpace.reviews';

export type SellerReviewsScreenProps = {
  header: React.ReactNode;
  onBack: () => void;
};

export function SellerReviewsScreen({header, onBack}: SellerReviewsScreenProps) {
  const sellerColors = useSellerColors();
  const {t, i18n} = useTranslation();
  const s = useSyncExternalStore(
    cb => sellerReviewsStore.subscribe(() => cb()),
    sellerReviewsStore.getState,
  );

  useEffect(() => {
    void sellerReviews.load();
  }, []);

  const summary = s.summary;
  const rating = summary ? formatRating(summary.rating, i18n.language) : null;

  const top = (
    <View style={{gap: 16}}>
      <SellerSubHeader
        title={t(`${R}.title`)}
        backLabel={t('commerce.sellerSpace.tabs.more')}
        onBack={onBack}
        testID="seller-reviews-back"
      />
      {summary ? (
        <View
          testID="seller-reviews-summary"
          style={{
            borderColor: sellerColors.border,
            borderRadius: sellerMetrics.cardRadius,
            borderWidth: 1,
            gap: 12,
            marginHorizontal: sellerMetrics.margin,
            padding: sellerMetrics.cardPadding,
          }}>
          <View style={{alignItems: 'center', flexDirection: 'row', gap: 12}}>
            <Text variant="display" style={{color: sellerColors.ink}}>
              {rating ?? t(`${R}.noRating`)}
            </Text>
            <View style={{gap: 4}}>
              <SellerStars filled={summary.rating === null ? 0 : filledStars(summary.rating)} size={18} />
              <Text variant="caption" style={{color: sellerColors.inkMuted}}>
                {t(`${R}.count`, {count: summary.ratingCount})}
              </Text>
            </View>
          </View>
          {distributionRows(summary).map(row => (
            <View key={row.star} style={{alignItems: 'center', flexDirection: 'row', gap: 8}} testID={`seller-reviews-dist-${row.star}`}>
              <Text variant="caption" style={{color: sellerColors.inkMuted, width: 12}}>
                {row.star}
              </Text>
              <View style={{backgroundColor: sellerColors.surfaceMuted, borderRadius: 9999, flex: 1, height: 8, overflow: 'hidden'}}>
                <View style={{backgroundColor: sellerColors.accentDot, borderRadius: 9999, height: 8, width: `${Math.round(row.ratio * 100)}%`}} />
              </View>
              <Text variant="caption" style={{color: sellerColors.inkMuted, minWidth: 24, textAlign: 'right'}}>
                {row.count}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );

  let body: React.ReactNode = null;
  if (s.status === 'error' && s.items.length === 0 && !summary) {
    body = (
      <ErrorState
        message={t(overviewErrorKey(s.error))}
        retryLabel={t('common.retry')}
        onRetry={() => void sellerReviews.load()}
        testID="seller-reviews-error"
      />
    );
  } else if (s.status !== 'success' && !summary) {
    body = <LoadingState testID="seller-reviews-loading" />;
  } else if (s.items.length === 0) {
    body = (
      <Text variant="body" style={{color: sellerColors.inkMuted, padding: sellerMetrics.margin, textAlign: 'center'}} testID="seller-reviews-empty">
        {t(`${R}.empty`)}
      </Text>
    );
  }

  return (
    <FlatList
      data={s.items}
      keyExtractor={r => r.id}
      style={{backgroundColor: sellerColors.bg, flex: 1}}
      contentContainerStyle={{paddingBottom: 32}}
      testID="seller-reviews"
      ListHeaderComponent={
        <>
          {header}
          {top}
          {body}
        </>
      }
      onEndReached={() => void sellerReviews.loadMore()}
      onEndReachedThreshold={0.5}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={7}
      ListFooterComponent={s.loadingMore ? <LoadingState /> : null}
      renderItem={({item}) => (
        <View
          testID={`seller-review-${item.id}`}
          style={{
            borderBottomColor: sellerColors.border,
            borderBottomWidth: 1,
            gap: 4,
            paddingHorizontal: sellerMetrics.margin,
            paddingVertical: 14,
          }}>
          <View style={{alignItems: 'center', flexDirection: 'row', gap: 8}}>
            <SellerStars filled={filledStars(item.rating)} />
            <Text variant="caption" accessibilityLabel={t(`${R}.ratingLabel`, {rating: item.rating})} style={{color: sellerColors.inkMuted}}>
              {item.createdAt ? formatOrderDate(item.createdAt, i18n.language) : ''}
            </Text>
          </View>
          {item.comment ? (
            <Text variant="body" style={{color: sellerColors.ink}}>
              {item.comment}
            </Text>
          ) : null}
          <Text variant="caption" numberOfLines={1} style={{color: sellerColors.inkMuted}}>
            {[item.authorDisplayName ?? t('commerce.sellerSpace.overview.buyerFallback'), item.listingTitle]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      )}
    />
  );
}
