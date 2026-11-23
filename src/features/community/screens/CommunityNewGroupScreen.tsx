/**
 * Nouveau groupe (reprend site : CommunityNewGroupPage.jsx). Les contacts sont
 * proposés ; le Worker n'exige pas d'être en contact. La liste des membres est
 * fixée à la création : le groupe ne se gère plus ensuite (rapport §11.5).
 */

import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {ActivityIndicator, Pressable, ScrollView, View} from 'react-native';
import {Button, EmptyState, ErrorState, Icon, Text, TextField, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {communityErrorKey} from '@shared/community';
import {CommunityGate} from '../components/CommunityGate';
import {contactsStore} from '../store/contactsStore';
import {createGroupChat, GROUP_TITLE_MAX_LENGTH} from '../store/conversationActions';

type Props = {
  onCreated: (id: string, title: string) => void;
  onOpenFind: () => void;
  onOpenProfile: () => void;
  onOpenSubscription: () => void;
};

export function CommunityNewGroupScreen({
  onCreated,
  onOpenFind,
  onOpenProfile,
  onOpenSubscription,
}: Props) {
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const state = useSyncExternalStore(
    cb => contactsStore.subscribe(() => cb()),
    () => contactsStore.getState(),
  );
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorKey, setErrorKey] = useState('');

  useEffect(() => {
    void contactsStore.load();
  }, []);

  const toggle = (userId: string) =>
    setSelected(cur => (cur.includes(userId) ? cur.filter(x => x !== userId) : [...cur, userId]));

  const submit = async () => {
    const name = title.trim();
    if (!name) {
      setErrorKey('communityApp.groups.titleRequired');
      return;
    }
    if (selected.length === 0) {
      setErrorKey('communityApp.groups.membersRequired');
      return;
    }
    setSaving(true);
    setErrorKey('');
    try {
      const res = await createGroupChat(name, selected);
      if (!res.ok) {
        setErrorKey(res.errorKey);
        return;
      }
      onCreated(res.id, name);
    } finally {
      setSaving(false);
    }
  };

  const renderContacts = () => {
    if (!state.data) {
      return state.status === 'error' ? (
        <ErrorState
          message={t(communityErrorKey(state.error))}
          retryLabel={t('common.retry')}
          onRetry={() => void contactsStore.load({force: true})}
        />
      ) : (
        <ActivityIndicator color={colors.bluePrimary} />
      );
    }
    if (state.data.contacts.length === 0) {
      return (
        <EmptyState
          title={t('communityApp.groups.noContactsTitle')}
          message={t('communityApp.groups.noContactsText')}
          actionLabel={t('communityApp.actions.findMember')}
          onAction={onOpenFind}
          testID="community-newgroup-nocontacts"
        />
      );
    }
    return (
      <View style={{gap: spacing.sm}}>
        <Text style={{fontSize: 13, color: colors.textMuted}}>
          {t('communityApp.groups.selectedCount', {count: selected.length})}
        </Text>
        {state.data.contacts.map(c => {
          const on = selected.includes(c.peer.userId);
          return (
            <Pressable
              key={c.relationId}
              onPress={() => toggle(c.peer.userId)}
              accessibilityRole="checkbox"
              accessibilityState={{checked: on}}
              testID={`community-newgroup-contact-${c.peer.userId}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.md,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: on ? colors.bluePrimary : colors.borderLight,
                backgroundColor: colors.bgSurfaceAlt,
              }}>
              <View style={{flex: 1}}>
                <Text style={{fontSize: 15, fontWeight: '600', color: colors.textPrimary}}>
                  {c.peer.displayName}
                </Text>
                <Text style={{fontSize: 12.5, color: colors.textSecondary}}>
                  {c.peer.publicPseudonym}
                </Text>
              </View>
              {on ? <Icon name="CheckIcon" size={18} color={colors.bluePrimary} /> : null}
            </Pressable>
          );
        })}
      </View>
    );
  };

  return (
    <CommunityGate onOpenProfile={onOpenProfile} onOpenSubscription={onOpenSubscription}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{padding: spacing.lg, gap: spacing.md}}
        testID="screen-community-newgroup">
        <TextField
          label={t('communityApp.groups.titleLabel')}
          value={title}
          onChangeText={setTitle}
          maxLength={GROUP_TITLE_MAX_LENGTH}
          disabled={saving}
          testID="community-newgroup-title"
        />
        <Text style={{fontSize: 15, fontWeight: '700', color: colors.textPrimary}}>
          {t('communityApp.groups.membersLabel')}
        </Text>
        <Text style={{fontSize: 12.5, color: colors.textMuted}}>{t('communityApp.groups.note')}</Text>
        {renderContacts()}
        {errorKey ? (
          <Text
            accessibilityRole="alert"
            style={{fontSize: 13, color: colors.error}}
            testID="community-newgroup-error">
            {t(errorKey, {max: GROUP_TITLE_MAX_LENGTH})}
          </Text>
        ) : null}
        <View style={{flexDirection: 'row'}}>
          <Button
            label={saving ? t('communityApp.groups.creating') : t('communityApp.groups.submit')}
            onPress={submit}
            loading={saving}
            disabled={saving}
            testID="community-newgroup-submit"
          />
        </View>
      </ScrollView>
    </CommunityGate>
  );
}
