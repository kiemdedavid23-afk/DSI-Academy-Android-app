/**
 * Candidature vendeur : écran de suivi selon le statut. En cours d'examen,
 * refusée (avec le motif et le redépôt), approuvée, suspendue, retirée.
 * Textes : mp.apply.pending / rejected / approved / suspended / revoked.
 */

import React from 'react';
import {ScrollView, View} from 'react-native';
import type {SellerApplication} from '../store/sellerTypes';
import {Button, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';

const A = 'mp.apply';
const REASON_MAX = 300;

export type SellerStatusScreenProps = {
  shellHeader: React.ReactNode;
  application: SellerApplication;
  /** Rouvre l'assistant (redépôt). */
  onRestart: () => void;
  /** Ouvre l'espace vendeur (lot S4) ; absent tant qu'il n'existe pas. */
  onOpenSpace?: () => void;
  /** Pastille « Candidature envoyée » juste après le dépôt. */
  justSent?: boolean;
};

function cleanReason(reason: string | null): string | null {
  const r = reason?.trim();
  return r ? r.slice(0, REASON_MAX) : null;
}

export function SellerStatusScreen({
  shellHeader,
  application,
  onRestart,
  onOpenSpace,
  justSent = false,
}: SellerStatusScreenProps) {
  const {t, i18n} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';
  const reason = cleanReason(application.reason);
  const date = (ms: number | null) =>
    ms === null ? '' : new Date(ms).toLocaleDateString(locale);

  let key: 'pending' | 'rejected' | 'approved' | 'suspended' | 'revoked' | 'unknown';
  switch (application.status) {
    case 'PENDING':
      key = 'pending';
      break;
    case 'REJECTED':
      key = 'rejected';
      break;
    case 'APPROVED':
      key = 'approved';
      break;
    case 'SUSPENDED':
      key = 'suspended';
      break;
    case 'REVOKED':
      key = 'revoked';
      break;
    default:
      key = 'unknown';
  }

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: colors.bgApp}}
      contentContainerStyle={{gap: spacing.lg, paddingBottom: spacing.xxxl}}
      testID={`screen-seller-status-${key}`}>
      {shellHeader}
      <View style={{gap: spacing.md, paddingHorizontal: spacing.xl}}>
        {key === 'pending' ? (
          <>
            {justSent ? (
              <Text variant="bodySmallStrong" color="success">
                {t(`${A}.pending.sent`)}
              </Text>
            ) : null}
            <Text variant="title" accessibilityRole="header">
              {t(`${A}.pending.title`)}
            </Text>
            <Text variant="body" color="secondary">
              {t(`${A}.pending.body`)}
            </Text>
            <View
              style={{
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderLight,
                borderRadius: radii.md,
                borderWidth: 1,
                gap: spacing.xs,
                padding: spacing.md,
              }}>
              {application.storeName ? (
                <Text variant="body">
                  {t(`${A}.pending.shop`)} : {application.storeName}
                </Text>
              ) : null}
              {application.submittedAt !== null ? (
                <Text variant="bodySmall" color="secondary">
                  {t(`${A}.pending.sentOn`)} {date(application.submittedAt)}
                </Text>
              ) : null}
            </View>
          </>
        ) : null}

        {key === 'rejected' ? (
          <>
            <Text variant="title" accessibilityRole="header">
              {t(`${A}.rejected.title`)}
            </Text>
            {reason ? (
              <Text variant="body">{t(`${A}.rejected.reason`, {reason})}</Text>
            ) : null}
            <Text variant="body" color="secondary">
              {t(`${A}.rejected.again`)}
            </Text>
            <Button
              label={t(`${A}.landing.startAgain`)}
              onPress={onRestart}
              testID="seller-restart"
            />
          </>
        ) : null}

        {key === 'approved' ? (
          <>
            <Text variant="title" accessibilityRole="header">
              {t(`${A}.approved.title`)}
            </Text>
            <Text variant="body" color="secondary">
              {t(`${A}.approved.body`)}
            </Text>
            {onOpenSpace ? (
              <Button
                label={t(`${A}.approved.cta`)}
                onPress={onOpenSpace}
                testID="seller-open-space"
              />
            ) : (
              <Text variant="caption" color="secondary" testID="seller-space-soon">
                {t('commerce.shell.seller.startSoon')}
              </Text>
            )}
          </>
        ) : null}

        {key === 'suspended' ? (
          <>
            <Text variant="title" accessibilityRole="header">
              {t(`${A}.suspended.title`)}
            </Text>
            {reason ? (
              <Text variant="body">{t(`${A}.suspended.reason`, {reason})}</Text>
            ) : null}
            <Text variant="body" color="secondary">
              {t(`${A}.suspended.open`)}
            </Text>
          </>
        ) : null}

        {key === 'revoked' ? (
          <>
            <Text variant="title" accessibilityRole="header">
              {t(`${A}.revoked.title`)}
            </Text>
            <Text variant="body" color="secondary">
              {application.reviewedAt !== null
                ? t(`${A}.revoked.since`, {date: date(application.reviewedAt)})
                : ''}
              {t(`${A}.revoked.body`)}
            </Text>
            {reason ? (
              <Text variant="body">{t(`${A}.revoked.reason`, {reason})}</Text>
            ) : null}
          </>
        ) : null}

        {key === 'unknown' ? (
          <Text variant="body" color="secondary">
            {t(`${A}.unknown`)}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
