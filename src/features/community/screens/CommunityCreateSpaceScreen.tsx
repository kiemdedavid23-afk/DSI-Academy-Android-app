/**
 * Création d'un espace (reprend site : CommunityCreateSpacePage.jsx). Toujours
 * public : un espace privé est créable côté Worker mais inutilisable (rapport
 * §11.6), il n'est donc pas proposé.
 */

import React, {useState} from 'react';
import {ScrollView, View} from 'react-native';
import {Button, Text, TextField, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {CommunityGate} from '../components/CommunityGate';
import {
  createSpaceAction,
  SPACE_DESCRIPTION_MAX_LENGTH,
  SPACE_NAME_MAX_LENGTH,
} from '../store/spaceActions';

type Props = {
  onCreated: (id: string, name: string) => void;
  onOpenProfile: () => void;
  onOpenSubscription: () => void;
};

export function CommunityCreateSpaceScreen({onCreated, onOpenProfile, onOpenSubscription}: Props) {
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorKey, setErrorKey] = useState('');

  const submit = async () => {
    if (saving) {
      return;
    }
    setSaving(true);
    setErrorKey('');
    try {
      const res = await createSpaceAction({name, description});
      if (!res.ok) {
        setErrorKey(res.errorKey);
        return;
      }
      onCreated(res.id, res.name);
    } finally {
      setSaving(false);
    }
  };

  const nameInvalid = errorKey === 'communityApp.spaces.nameRequired';

  return (
    <CommunityGate onOpenProfile={onOpenProfile} onOpenSubscription={onOpenSubscription}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{padding: spacing.lg, gap: spacing.md}}
        testID="screen-community-create-space">
        <Text style={{fontSize: 13.5, color: colors.textMuted}}>
          {t('communityApp.spaces.createHint')}
        </Text>
        <TextField
          label={t('communityApp.spaces.nameLabel')}
          value={name}
          onChangeText={setName}
          maxLength={SPACE_NAME_MAX_LENGTH}
          error={nameInvalid ? t(errorKey, {max: SPACE_NAME_MAX_LENGTH}) : undefined}
          testID="community-space-name"
        />
        <TextField
          label={t('communityApp.spaces.descriptionLabel')}
          value={description}
          onChangeText={setDescription}
          maxLength={SPACE_DESCRIPTION_MAX_LENGTH}
          multiline
          helper={t('communityApp.spaces.descriptionHint', {
            count: description.length,
            max: SPACE_DESCRIPTION_MAX_LENGTH,
          })}
          testID="community-space-description"
        />
        {errorKey && !nameInvalid ? (
          <Text accessibilityRole="alert" style={{fontSize: 13.5, color: colors.error}}>
            {t(errorKey)}
          </Text>
        ) : null}
        <View style={{flexDirection: 'row'}}>
          <Button
            label={saving ? t('communityApp.spaces.creating') : t('communityApp.spaces.submit')}
            onPress={() => void submit()}
            loading={saving}
            testID="community-space-submit"
          />
        </View>
      </ScrollView>
    </CommunityGate>
  );
}
