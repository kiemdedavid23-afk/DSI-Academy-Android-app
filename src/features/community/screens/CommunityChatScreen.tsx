/**
 * Discussion (reprend site : CommunityChatPage.jsx). Messages du plus ancien au
 * plus récent, relecture toutes les 5 s au premier plan, saisie de 4 000
 * caractères au plus. Pas de pièces jointes (Service Fichiers non livré) : un
 * message qui n'en contient qu'une s'affiche comme tel.
 */

import React, {useEffect, useMemo, useState, useSyncExternalStore} from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  View,
} from 'react-native';
import type {ChatMessage} from '@core/api/endpoints/community/conversations.types';
import {Button, EmptyState, ErrorState, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {communityMeStore} from '@shared/store';
import {CommunityGate} from '../components/CommunityGate';
import {formatClock} from '../format';
import {useVisiblePolling} from '../hooks/useVisiblePolling';
import {chatStore} from '../store/chatStore';

const POLL_MS = 5000;
const MAX_LENGTH = 4000;
const COUNTER_FROM = 3500;

type Props = {
  conversationId: string;
  isGroup: boolean;
  onOpenProfile: () => void;
  onOpenSubscription: () => void;
};

export function CommunityChatScreen({
  conversationId,
  isGroup,
  onOpenProfile,
  onOpenSubscription,
}: Props) {
  const {t, i18n} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const chat = useSyncExternalStore(
    cb => chatStore.subscribe(cb),
    () => chatStore.getState().chats[conversationId],
  );
  const me = useSyncExternalStore(
    cb => communityMeStore.subscribe(() => cb()),
    () => communityMeStore.getState(),
  );
  const myId = me.data?.userId ?? '';
  const [text, setText] = useState('');

  useEffect(() => {
    void chatStore.open(conversationId);
  }, [conversationId]);
  useVisiblePolling(() => void chatStore.poll(conversationId), POLL_MS, chat?.status === 'ready');

  // Liste inversée : le plus récent en bas, sans calcul de défilement.
  const data = useMemo(() => [...(chat?.messages ?? [])].reverse(), [chat?.messages]);

  const send = async () => {
    const res = await chatStore.send(conversationId, text, myId);
    if (res.ok) {
      setText('');
    }
  };

  const renderBubble = ({item}: {item: ChatMessage}) => {
    const mine = item.authorId === myId;
    return (
      <View
        style={{
          alignSelf: mine ? 'flex-end' : 'flex-start',
          maxWidth: '82%',
          marginVertical: spacing.xs,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radii.lg,
          backgroundColor: mine ? colors.bluePrimary : colors.bgSurfaceAlt,
        }}
        testID={`community-message-${item.id}`}>
        {isGroup && !mine && item.author ? (
          <Text style={{fontSize: 12, fontWeight: '700', color: colors.textSecondary}}>
            {item.author.displayName}
          </Text>
        ) : null}
        <Text style={{fontSize: 15, color: mine ? colors.textOnPrimary : colors.textPrimary}}>
          {item.kind === 'file' && !item.body ? t('communityApp.chats.fileMessage') : item.body}
        </Text>
        <Text
          style={{
            fontSize: 11,
            alignSelf: 'flex-end',
            color: mine ? colors.textOnPrimary : colors.textMuted,
          }}>
          {formatClock(item.createdAt, i18n.language)}
        </Text>
      </View>
    );
  };

  const renderBody = () => {
    if (!chat || chat.status === 'loading') {
      return (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}} testID="community-chat-loading">
          <ActivityIndicator color={colors.bluePrimary} />
        </View>
      );
    }
    if (chat.status === 'denied') {
      return (
        <EmptyState
          message={t(chat.errorKey ?? 'communityApp.errors.accessDenied')}
          testID="community-chat-denied"
        />
      );
    }
    if (chat.status === 'error') {
      return (
        <ErrorState
          message={t(chat.errorKey ?? 'communityApp.errors.generic')}
          retryLabel={t('common.retry')}
          onRetry={() => void chatStore.open(conversationId)}
          testID="community-chat-error"
        />
      );
    }
    return (
      <>
        {data.length === 0 ? (
          <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl}}>
            <Text style={{fontSize: 14, color: colors.textMuted}} testID="community-chat-empty">
              {t('communityApp.chat.empty')}
            </Text>
          </View>
        ) : (
          <FlatList
            style={{flex: 1}}
            inverted
            data={data}
            keyExtractor={m => m.id}
            renderItem={renderBubble}
            contentContainerStyle={{padding: spacing.md}}
            onEndReachedThreshold={0.3}
            onEndReached={() => void chatStore.loadOlder(conversationId)}
            ListFooterComponent={
              chat.hasMore ? (
                <View style={{alignItems: 'center', padding: spacing.sm}}>
                  {chat.loadingOlder ? (
                    <ActivityIndicator color={colors.bluePrimary} />
                  ) : (
                    <Button
                      variant="secondary"
                      label={t('communityApp.chat.older')}
                      onPress={() => void chatStore.loadOlder(conversationId)}
                    />
                  )}
                </View>
              ) : null
            }
            testID="community-chat-list"
          />
        )}
        {chat.noticeKey ? (
          <Text
            accessibilityRole="alert"
            style={{fontSize: 13, color: colors.error, paddingHorizontal: spacing.lg}}
            testID="community-chat-notice">
            {t(chat.noticeKey)}
          </Text>
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: spacing.sm,
            padding: spacing.md,
            borderTopWidth: 1,
            borderColor: colors.borderLight,
          }}>
          <View style={{flex: 1}}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('communityApp.chat.placeholder')}
              placeholderTextColor={colors.textMuted}
              accessibilityLabel={t('communityApp.chat.placeholder')}
              multiline
              maxLength={MAX_LENGTH}
              editable={!chat.sending}
              style={{
                maxHeight: 120,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.borderLight,
                color: colors.textPrimary,
                fontSize: 15,
              }}
              testID="community-chat-input"
            />
            {text.length >= COUNTER_FROM ? (
              <Text style={{fontSize: 11, color: colors.textMuted, alignSelf: 'flex-end'}}>
                {t('communityApp.chat.counter', {count: text.length, max: MAX_LENGTH})}
              </Text>
            ) : null}
          </View>
          <Button
            label={t('communityApp.chat.send')}
            onPress={send}
            disabled={chat.sending || text.trim().length === 0}
            loading={chat.sending}
            testID="community-chat-send"
          />
        </View>
      </>
    );
  };

  return (
    <CommunityGate onOpenProfile={onOpenProfile} onOpenSubscription={onOpenSubscription}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        testID="screen-community-chat">
        {renderBody()}
      </KeyboardAvoidingView>
    </CommunityGate>
  );
}
