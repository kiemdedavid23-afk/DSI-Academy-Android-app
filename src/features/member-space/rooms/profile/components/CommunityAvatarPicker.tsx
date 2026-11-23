/**
 * Boutons « Ajouter / Changer la photo » et « Supprimer la photo »
 * (reprend site : community-profile/AvatarPicker.jsx). Une même action sert à la
 * première photo et au remplacement. La photo est choisie dans la galerie puis
 * réduite à 512 px avant l'envoi.
 */

import React, {useState} from 'react';
import {View} from 'react-native';
import {Button, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {pickAndUploadAvatar, removeCommunityAvatarAction} from '@shared/store';

type Props = {hasPhoto: boolean};

export function CommunityAvatarPicker({hasPhoto}: Props) {
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();
  const [busy, setBusy] = useState<'upload' | 'delete' | null>(null);
  const [errorKey, setErrorKey] = useState('');

  const onPick = async () => {
    setErrorKey('');
    setBusy('upload');
    try {
      const res = await pickAndUploadAvatar();
      if (res.ok === false) {
        setErrorKey(res.errorKey);
      }
    } finally {
      setBusy(null);
    }
  };

  const onRemove = async () => {
    setErrorKey('');
    setBusy('delete');
    try {
      const res = await removeCommunityAvatarAction();
      if (!res.ok) {
        setErrorKey(res.errorKey);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{gap: spacing.sm}} testID="community-avatar-picker">
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm}}>
        <Button
          variant="secondary"
          label={
            busy === 'upload'
              ? t('communityProfile.photo.uploading')
              : hasPhoto
              ? t('communityProfile.photo.change')
              : t('communityProfile.photo.add')
          }
          onPress={onPick}
          disabled={busy !== null}
          loading={busy === 'upload'}
          testID="community-avatar-pick"
        />
        {hasPhoto ? (
          <Button
            variant="secondary"
            label={
              busy === 'delete'
                ? t('communityProfile.photo.deleting')
                : t('communityProfile.photo.remove')
            }
            onPress={onRemove}
            disabled={busy !== null}
            loading={busy === 'delete'}
            testID="community-avatar-remove"
          />
        ) : null}
      </View>
      <Text style={{fontSize: 12, color: colors.textMuted}}>
        {t('communityProfile.photo.hint')}
      </Text>
      {errorKey ? (
        <Text
          accessibilityRole="alert"
          style={{fontSize: 13, color: colors.error}}
          testID="community-avatar-error">
          {t(errorKey)}
        </Text>
      ) : null}
    </View>
  );
}
