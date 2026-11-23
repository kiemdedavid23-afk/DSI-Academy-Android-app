/**
 * Discussions (reprend site : CommunityChatsPage.jsx) : recherche locale,
 * filtres Toutes / Privées / Groupes, relecture toutes les 15 s tant que
 * l'écran est au premier plan. Espaces et Support s'ajoutent aux lots C5 et C6.
 */

import React, {useEffect, useMemo, useState, useSyncExternalStore} from 'react';
import {ActivityIndicator, Pressable, ScrollView, View} from 'react-native';
import type {ConversationSummary} from '@core/api/endpoints/community/conversations.types';
import {Button, EmptyState, ErrorState, MemberAvatar, Text, TextField, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {communityErrorKey, initialsOf} from '@shared/community';
import {refreshAfterImageError} from '@shared/store';
import {CommunityGate} from '../components/CommunityGate';
import {formatListTime} from '../format';
import {useVisiblePolling} from '../hooks/useVisiblePolling';
import {conversationsStore, refreshConversations} from '../store/conversationsStore';

type Filter = 'all' | 'direct' | 'group';
const FILTERS: Filter[] = ['all', 'direct', 'group'];
const POLL_MS = 15_000;

type Props = {
  onOpenChat: (id: string, title: string, type: 'direct' | 'group') => void;
  onOpenFind: () => void;
  onNewGroup: () => void;
  onOpenProfile: () => void;
  onOpenSubscription: () => void;
};

export function CommunityChatsScreen({
  onOpenChat,
  onOpenFind,
  onNewGroup,
  onOpenProfile,
  onOpenSubscription,
}: Props) {
  const {t, i18n} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const state = useSyncExternalStore(
    cb => conversationsStore.subscribe(() => cb()),
    () => conversationsStore.getState(),
  );
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    void conversationsStore.load({force: true});
  }, []);
  useVisiblePolling(refreshConversations, POLL_MS);

  // Espaces et Support : lots C5 et C6.
  const items = useMemo(
    () =>
      (state.data ?? []).filter(
        (c): c is ConversationSummary & {type: 'direct' | 'group'} =>
          c.type === 'direct' || c.type === 'group',
      ),
    [state.data],
  );
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(c => {
      if (filter !== 'all' && c.type !== filter) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        c.title.toLowerCase().includes(q) ||
        (c.lastMessage ?? '').toLowerCase().includes(q)
      );
    });
  }, [items, filter, query]);

  const renderBody = () => {
    if (!state.data) {
      if (state.status === 'error') {
        return (
          <ErrorState
            message={t(communityErrorKey(state.error))}
            retryLabel={t('common.retry')}
            onRetry={() => void conversationsStore.load({force: true})}
            testID="community-chats-error"
          />
        );
      }
      return (
        <View style={{padding: spacing.xl, alignItems: 'center'}} testID="community-chats-loading">
          <ActivityIndicator color={colors.bluePrimary} />
        </View>
      );
    }
    if (items.length === 0) {
      return (
        <EmptyState
          title={t('communityApp.home.emptyTitle')}
          message={t('communityApp.home.emptyText')}
          actionLabel={t('communityApp.actions.findMember')}
          onAction={onOpenFind}
          testID="community-chats-empty"
        />
      );
    }
    return (
      <View style={{gap: spacing.md}}>
        <TextField
          label={t('communityApp.chats.searchPlaceholder')}
          value={query}
          onChangeText={setQuery}
          placeholder={t('communityApp.chats.searchPlaceholder')}
          autoCapitalize="none"
          testID="community-chats-search"
        />
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t('communityApp.chats.filtersLabel')}
          style={{flexDirection: 'row', gap: spacing.sm}}>
          {FILTERS.map(f => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              accessibilityRole="radio"
              accessibilityState={{checked: filter === f}}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radii.pill,
                borderWidth: 1,
                borderColor: filter === f ? colors.bluePrimary : colors.borderLight,
                backgroundColor: filter === f ? colors.bluePrimary : colors.bgSurfaceAlt,
              }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: filter === f ? colors.textOnPrimary : colors.textPrimary,
                }}>
                {t(`communityApp.chats.filters.${f}`)}
              </Text>
            </Pressable>
          ))}
        </View>
        {visible.length === 0 ? (
          <Text style={{fontSize: 13.5, color: colors.textMuted}} testID="community-chats-nomatch">
            {t('communityApp.chats.noResults')}
          </Text>
        ) : (
          visible.map(c => {
            const preview =
              c.lastMessage ??
              (c.lastMessageAt !== null
                ? t('communityApp.chats.fileMessage')
                : t('communityApp.chats.noMessage'));
            return (
              <Pressable
                key={c.id}
                onPress={() => onOpenChat(c.id, c.title, c.type)}
                accessibilityRole="button"
                accessibilityLabel={`${c.title}. ${preview}`}
                testID={`community-chat-row-${c.id}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.md,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.borderLight,
                  backgroundColor: colors.bgSurfaceAlt,
                }}>
                <MemberAvatar
                  initials={initialsOf(c.title)}
                  size="sm"
                  src={c.peer?.avatarThumbUrl ?? c.peer?.avatarUrl ?? null}
                  onImageError={refreshAfterImageError}
                />
                <View style={{flex: 1}}>
                  <Text
                    numberOfLines={1}
                    style={{fontSize: 15.2, fontWeight: '700', color: colors.textPrimary}}>
                    {c.title}
                  </Text>
                  <Text numberOfLines={1} style={{fontSize: 13, color: colors.textSecondary}}>
                    {preview}
                  </Text>
                </View>
                <Text style={{fontSize: 12, color: colors.textMuted}}>
                  {formatListTime(c.lastMessageAt, i18n.language)}
                </Text>
              </Pressable>
            );
          })
        )}
      </View>
    );
  };

  return (
    <CommunityGate onOpenProfile={onOpenProfile} onOpenSubscription={onOpenSubscription}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{padding: spacing.lg, gap: spacing.md}}
        testID="screen-community-chats">
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm}}>
          <Button
            label={t('communityApp.newMenu.newGroup')}
            onPress={onNewGroup}
            testID="community-chats-new-group"
          />
          <Button
            variant="secondary"
            label={t('communityApp.actions.findMember')}
            onPress={onOpenFind}
          />
        </View>
        {renderBody()}
      </ScrollView>
    </CommunityGate>
  );
}
