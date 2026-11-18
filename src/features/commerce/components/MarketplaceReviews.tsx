/**
 * Avis d'un produit Marketplace (site : MpProductPage, « Avis des membres »).
 * Liste anonyme, du plus récent au plus ancien, puis formulaire d'avis. Le
 * Worker décide du droit de noter : 403 = pas d'achat payé, 409 = déjà noté.
 * Branché dans `renderAction` de la fiche : la fiche commune n'en sait rien.
 */

import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {Pressable, View} from 'react-native';
import {Button, Card, Text, TextField, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {commerceErrorKey} from '../logic/errorKey';
import {MARKETPLACE_STORES} from '../store/marketplaceStores';
import type {CommerceErrorKind} from '../store/commerceTypes';

const MAX_COMMENT = 2000;

export function starsText(value: number): string {
  const full = Math.max(0, Math.min(5, Math.round(value)));
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

/** Échec d'envoi d'un avis → clé i18n. */
export function reviewErrorKey(kind: CommerceErrorKind | null): string {
  switch (kind) {
    case 'forbidden':
      return 'commerce.reviewForm.errors.forbidden';
    case 'conflict':
      return 'commerce.reviewForm.errors.conflict';
    case 'validation':
      return 'commerce.reviewForm.errors.validation';
    default:
      return commerceErrorKey(kind);
  }
}

export function MarketplaceReviews({productId}: {productId: string}) {
  const store = MARKETPLACE_STORES.reviews;
  const {t} = useTranslation();
  const {colors, spacing, touch} = useTheme();
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState<{key: string; ok: boolean} | null>(null);

  useEffect(() => {
    void store.load(productId);
  }, [store, productId]);

  const reviews = state.productId === productId ? state.reviews : [];

  const send = async () => {
    setMessage(null);
    const res = await store.submit(productId, rating, comment);
    if (res.ok) {
      setRating(0);
      setComment('');
      setMessage({key: 'commerce.reviewForm.thanks', ok: true});
    } else {
      setMessage({key: reviewErrorKey(res.errorKind), ok: false});
    }
  };

  return (
    <View style={{gap: spacing.md}} testID="marketplace-reviews">
      <Text variant="subtitle" accessibilityRole="header">
        {t('mp.pd.reviewsTitle')}
      </Text>

      {state.status === 'error' && reviews.length === 0 ? (
        <View style={{gap: spacing.xs}}>
          <Text variant="caption" color="secondary">
            {t('commerce.reviewsLoadError')}
          </Text>
          <Button
            variant="ghost"
            label={t('common.retry')}
            onPress={() => void store.load(productId)}
            testID="marketplace-reviews-retry"
          />
        </View>
      ) : null}

      {state.status === 'success' && reviews.length === 0 ? (
        <Text variant="caption" color="secondary" testID="marketplace-reviews-empty">
          {t('mp.pd.reviewsEmpty')}
        </Text>
      ) : null}

      {reviews.map(r => (
        <Card key={r.id} testID={`marketplace-review-${r.id}`}>
          <View style={{gap: spacing.xs}}>
            <Text
              variant="body"
              accessibilityLabel={t('mp.pd.ratingAria', {value: r.rating})}>
              {starsText(r.rating)}
            </Text>
            <Text variant="body" color={r.comment ? undefined : 'secondary'}>
              {r.comment ?? t('mp.pd.reviewNoComment')}
            </Text>
          </View>
        </Card>
      ))}

      <View style={{gap: spacing.sm}}>
        <Text variant="subtitle" accessibilityRole="header">
          {t('commerce.reviewForm.title')}
        </Text>
        <View style={{flexDirection: 'row', gap: spacing.xs}}>
          {[1, 2, 3, 4, 5].map(n => (
            <Pressable
              key={n}
              onPress={() => setRating(n)}
              accessibilityRole="radio"
              accessibilityState={{selected: rating === n}}
              accessibilityLabel={t('commerce.reviewForm.star', {value: n})}
              testID={`review-star-${n}`}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: touch.min,
                minWidth: touch.min,
              }}>
              <Text
                variant="title"
                style={{color: n <= rating ? colors.goldPrestige : colors.textMuted}}>
                {n <= rating ? '★' : '☆'}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextField
          label={t('commerce.reviewForm.commentLabel')}
          value={comment}
          onChangeText={text => setComment(text.slice(0, MAX_COMMENT))}
          placeholder={t('commerce.reviewForm.commentPlaceholder')}
          testID="review-comment"
        />
        <Button
          label={t('commerce.reviewForm.send')}
          onPress={() => void send()}
          disabled={rating === 0}
          loading={state.submitting}
          testID="review-send"
        />
        {message ? (
          <Text
            variant="caption"
            color="secondary"
            accessibilityRole="alert"
            testID="review-message">
            {t(message.key)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
