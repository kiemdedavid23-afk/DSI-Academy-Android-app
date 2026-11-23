/**
 * Trouver un membre (reprend site : CommunityFindMemberPage.jsx).
 * Correspondance exacte du pseudonyme ou de l'identifiant DSI : le Worker n'est
 * pas un annuaire à parcourir. Rappelle aussi son propre pseudonyme.
 */

import React, {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {ActivityIndicator, ScrollView, View} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {Button, EmptyState, ErrorState, Text, TextField, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {communityMeStore} from '@shared/store';
import {CommunityGate} from '../components/CommunityGate';
import {PersonRow} from '../components/PersonRow';
import {memberDirectory} from '../store/memberDirectoryStore';

type Props = {
  onOpenMember: (ref: string) => void;
  onOpenProfile: () => void;
  onOpenSubscription: () => void;
};

export function CommunityFindMemberScreen({
  onOpenMember,
  onOpenProfile,
  onOpenSubscription,
}: Props) {
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {search} = useSyncExternalStore(
    cb => memberDirectory.subscribe(cb),
    () => memberDirectory.getState(),
  );
  const me = useSyncExternalStore(
    cb => communityMeStore.subscribe(() => cb()),
    () => communityMeStore.getState(),
  );
  const own = me.data?.profile ?? null;

  useEffect(() => {
    memberDirectory.resetSearch();
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  const copyOwn = () => {
    const value = own?.publicPseudonym || `@${own?.pseudonym ?? ''}`;
    try {
      Clipboard.setString(value);
      setCopied(true);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <CommunityGate onOpenProfile={onOpenProfile} onOpenSubscription={onOpenSubscription}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{padding: spacing.lg, gap: spacing.md}}
        testID="screen-community-find">
        <Text style={{fontSize: 13, color: colors.textMuted}}>{t('communityApp.find.hint')}</Text>
        <TextField
          label={t('communityApp.find.placeholder')}
          value={query}
          onChangeText={setQuery}
          placeholder={t('communityApp.find.placeholder')}
          autoCapitalize="none"
          autoComplete="off"
          onSubmitEditing={() => void memberDirectory.search(query)}
          testID="community-find-input"
        />
        <View style={{flexDirection: 'row'}}>
          <Button
            label={t('communityApp.find.submit')}
            onPress={() => void memberDirectory.search(query)}
            disabled={search.status === 'loading'}
            testID="community-find-submit"
          />
        </View>

        {search.status === 'loading' ? (
          <ActivityIndicator color={colors.bluePrimary} testID="community-find-loading" />
        ) : null}
        {search.status === 'error' && search.errorKey ? (
          <ErrorState
            message={t(search.errorKey)}
            retryLabel={t('common.retry')}
            onRetry={() => void memberDirectory.search(query)}
            testID="community-find-error"
          />
        ) : null}
        {search.status === 'done' && search.items.length === 0 ? (
          <EmptyState
            title={t('communityApp.find.noResult')}
            message={t('communityApp.find.noResultHint')}
            testID="community-find-empty"
          />
        ) : null}
        {search.status === 'done'
          ? search.items.map(peer => (
              <PersonRow
                key={peer.userId}
                peer={peer}
                onPress={() => onOpenMember(peer.pseudonym || peer.userId)}
                testID={`community-find-result-${peer.userId}`}
              />
            ))
          : null}

        {own ? (
          <View
            style={{
              gap: spacing.sm,
              padding: spacing.lg,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: colors.borderLight,
            }}>
            <Text style={{fontSize: 15, fontWeight: '700', color: colors.textPrimary}}>
              {t('communityApp.find.ownTitle')}
            </Text>
            <Text style={{fontSize: 17, color: colors.textPrimary}}>
              {own.publicPseudonym || `@${own.pseudonym}`}
            </Text>
            <Text style={{fontSize: 12.5, color: colors.textMuted}}>
              {t('communityApp.find.ownText')}
            </Text>
            <View style={{flexDirection: 'row'}}>
              <Button
                variant="secondary"
                label={copied ? t('communityApp.find.copied') : t('communityApp.find.copy')}
                onPress={copyOwn}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </CommunityGate>
  );
}
