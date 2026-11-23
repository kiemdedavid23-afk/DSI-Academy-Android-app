/**
 * Support DSI (reprend site : CommunitySupportPage.jsx). Fil unique avec
 * l'équipe : messages du plus ancien au plus récent, relecture toutes les 10 s
 * au premier plan, 4 000 caractères au plus. L'envoi passe par
 * POST /support/messages avec un `messageId` : un texte renvoyé après un échec
 * ne crée jamais de doublon. Pas de pièces jointes.
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
import type {SupportMessage} from '@core/api/endpoints/community/support.types';
import {Button, ErrorState, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {CommunityGate} from '../components/CommunityGate';
import {formatClock} from '../format';
import {useVisiblePolling} from '../hooks/useVisiblePolling';
import {markSupportRead} from '../store/communityNotificationsStore';
import {supportStore} from '../store/supportStore';

const POLL_MS = 10_000;
const MAX_LENGTH = 4000;
const COUNTER_FROM = 3500;

type Props = {
  onOpenProfile: () => void;
  onOpenSubscription: () => void;
};

export function CommunitySupportScreen({onOpenProfile, onOpenSubscription}: Props) {
  const {t, i18n} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const chat = useSyncExternalStore(
    cb => supportStore.subscribe(cb),
    () => supportStore.getState(),
  );
  const [text, setText] = useState('');

  useEffect(() => {
    void supportStore.open();
  }, []);
  useVisiblePolling(() => void supportStore.poll(), POLL_MS, chat.status === 'ready');
  // Les réponses de l'équipe sont lues dès que le fil est ouvert.
  useEffect(() => {
    if (chat.status === 'ready') {
      void markSupportRead();
    }
  }, [chat.status, chat.messages.length]);

  // Liste inversée : le plus récent en bas, sans calcul de défilement.
  const data = useMemo(() => [...chat.messages].reverse(), [chat.messages]);

  const send = async () => {
    const res = await supportStore.send(text);
    if (res.ok) {
      setText('');
    }
  };

  const renderBubble = ({item}: {item: SupportMessage}) => {
    const mine = !item.official;
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
        testID={`community-support-message-${item.id}`}>
        {!mine ? (
          <Text style={{fontSize: 12, fontWeight: '700', color: colors.textSecondary}}>
            {item.displayName || t('communityApp.titles.support')}
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
          {mine && item.deliveredToAdminAt ? `${t('communityApp.support.delivered')} · ` : ''}
          {formatClock(item.createdAt, i18n.language)}
        </Text>
      </View>
    );
  };

  const renderBody = () => {
    if (chat.status === 'loading') {
      return (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}} testID="community-support-loading">
          <ActivityIndicator color={colors.bluePrimary} />
        </View>
      );
    }
    if (chat.status === 'error') {
      return (
        <ErrorState
          message={t(chat.errorKey ?? 'communityApp.errors.generic')}
          retryLabel={t('common.retry')}
          onRetry={() => void supportStore.open()}
          testID="community-support-error"
        />
      );
    }
    return (
      <>
        {data.length === 0 ? (
          <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl}}>
            <Text style={{fontSize: 14, color: colors.textMuted}} testID="community-support-empty">
              {t('communityApp.support.empty')}
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
            onEndReached={() => void supportStore.loadOlder()}
            ListFooterComponent={
              chat.hasMore ? (
                <View style={{alignItems: 'center', padding: spacing.sm}}>
                  {chat.loadingOlder ? (
                    <ActivityIndicator color={colors.bluePrimary} />
                  ) : (
                    <Button
                      variant="secondary"
                      label={t('communityApp.chat.older')}
                      onPress={() => void supportStore.loadOlder()}
                    />
                  )}
                </View>
              ) : null
            }
            testID="community-support-list"
          />
        )}
        {chat.noticeKey ? (
          <Text
            accessibilityRole="alert"
            style={{fontSize: 13, color: colors.error, paddingHorizontal: spacing.lg}}
            testID="community-support-notice">
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
              placeholder={t('communityApp.support.placeholder')}
              placeholderTextColor={colors.textMuted}
              accessibilityLabel={t('communityApp.support.placeholder')}
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
              testID="community-support-input"
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
            testID="community-support-send"
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
        testID="screen-community-support">
        {renderBody()}
      </KeyboardAvoidingView>
    </CommunityGate>
  );
}
