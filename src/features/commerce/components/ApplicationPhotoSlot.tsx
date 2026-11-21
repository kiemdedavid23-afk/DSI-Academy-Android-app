/**
 * Emplacement d'une photo de la candidature : aperçu, état d'envoi, boutons
 * appareil photo et galerie. Les textes viennent de mp.apply.slots.* ; le
 * message d'erreur est une clé i18n posée par le store.
 */

import React from 'react';
import {Image, View} from 'react-native';
import {Button, Icon, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import type {ApplicationSlot} from '../logic/applicationDraft';
import type {PickSource} from '../logic/pickImage';

export type ApplicationPhotoSlotProps = {
  /** Clé du créneau : logo, id_front, id_back, id_selfie. */
  slotKey: 'logo' | 'id_front' | 'id_back' | 'id_selfie';
  slot: ApplicationSlot;
  onPick: (source: PickSource) => void;
};

export function ApplicationPhotoSlot({
  slotKey,
  slot,
  onPick,
}: ApplicationPhotoSlotProps) {
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const L = `mp.apply.slots`;
  const uploading = slot.status === 'uploading';
  const done = slot.status === 'done';
  const hasPhoto = slot.uri !== null;

  return (
    <View
      testID={`apply-slot-${slotKey}`}
      style={{
        backgroundColor: colors.bgSurface,
        borderColor: colors.borderLight,
        borderRadius: radii.md,
        borderWidth: 1,
        gap: spacing.md,
        padding: spacing.md,
      }}>
      <View>
        <Text variant="subtitle">{t(`${L}.${slotKey}.label`)}</Text>
        <Text variant="bodySmall" color="secondary">
          {t(`${L}.${slotKey}.hint`)}
        </Text>
      </View>

      {hasPhoto ? (
        <Image
          source={{uri: slot.uri ?? undefined}}
          accessibilityIgnoresInvertColors
          resizeMode="cover"
          style={{
            alignSelf: 'center',
            aspectRatio: slotKey === 'logo' ? 1 : 4 / 3,
            borderRadius: radii.md,
            width: slotKey === 'logo' ? 140 : '100%',
          }}
        />
      ) : null}

      {uploading ? (
        <Text variant="bodySmall" color="secondary" testID={`apply-slot-${slotKey}-uploading`}>
          {t(`${L}.uploading`)}
        </Text>
      ) : null}
      {done ? (
        <View style={{alignItems: 'center', flexDirection: 'row', gap: spacing.xs}}>
          <Icon name="CheckIcon" size={18} color={colors.success} />
          <Text variant="bodySmall" color="success">
            {t(`${L}.done`)}
          </Text>
        </View>
      ) : null}
      {slot.errorKey ? (
        <Text
          variant="bodySmall"
          color="error"
          accessibilityLiveRegion="polite"
          testID={`apply-slot-${slotKey}-error`}>
          {t(slot.errorKey)}
        </Text>
      ) : null}

      <View style={{flexDirection: 'row', gap: spacing.sm}}>
        <Button
          variant="secondary"
          label={t(`${L}.camera`)}
          onPress={() => onPick('camera')}
          disabled={uploading}
          style={{flex: 1}}
          testID={`apply-slot-${slotKey}-camera`}
        />
        <Button
          variant="secondary"
          label={t(
            slot.status === 'error' && hasPhoto
              ? `${L}.retry`
              : done
              ? `${L}.change`
              : `${L}.gallery`,
          )}
          onPress={() => onPick('gallery')}
          disabled={uploading}
          style={{flex: 1}}
          testID={`apply-slot-${slotKey}-gallery`}
        />
      </View>
    </View>
  );
}
