/**
 * Fiche d'un membre (reprend site : CommunityMemberPage.jsx). Photo, nom,
 * pseudonyme, état du contact, actions selon `contact.status`, blocage.
 * Aucune donnée privée (nom réel, e-mail, WhatsApp). Écrire et appeler
 * arrivent avec les discussions et les appels. `blocked.byThem` n'est jamais
 * affiché (décision D7).
 */

import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {ActivityIndicator, Alert, ScrollView, View} from 'react-native';
import {
  Button,
  EmptyState,
  ErrorState,
  MemberAvatar,
  Text,
  useTheme,
} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {initialsOf} from '@shared/community';
import {refreshAfterImageError} from '@shared/store';
import {CommunityGate} from '../components/CommunityGate';
import {
  acceptRequestAction,
  blockMemberAction,
  cancelRequestAction,
  rejectRequestAction,
  removeContactAction,
  requestContactAction,
  unblockMemberAction,
  type ContactActionResult,
} from '../store/contactActions';
import {startDirectChat} from '../store/conversationActions';
import {memberDirectory} from '../store/memberDirectoryStore';

type Props = {
  /** Identifiant DSI ou pseudonyme (avec ou sans @). */
  memberRef: string;
  onOpenChat: (id: string, title: string) => void;
  onOpenProfile: () => void;
  onOpenSubscription: () => void;
};

export function CommunityMemberScreen({
  memberRef,
  onOpenChat,
  onOpenProfile,
  onOpenSubscription,
}: Props) {
  const {t} = useTranslation();
  const {colors, spacing} = useTheme();
  const ref = memberRef.replace(/^@+/, '');
  const {cards} = useSyncExternalStore(
    cb => memberDirectory.subscribe(cb),
    () => memberDirectory.getState(),
  );
  const entry = cards[ref];
  const [busy, setBusy] = useState(false);
  const [feedbackKey, setFeedbackKey] = useState('');
  const [infoKey, setInfoKey] = useState('');

  useEffect(() => {
    void memberDirectory.loadCard(ref);
  }, [ref]);

  const run = async (fn: () => Promise<ContactActionResult>) => {
    if (busy) {
      return;
    }
    setBusy(true);
    setFeedbackKey('');
    setInfoKey('');
    try {
      const res = await fn();
      if (!res.ok) {
        setFeedbackKey(res.errorKey);
        return;
      }
      if (res.infoKey) {
        setInfoKey(res.infoKey);
      }
      await memberDirectory.loadCard(ref, {silent: true});
    } finally {
      setBusy(false);
    }
  };

  /** Écrire : ouvre (ou crée) la discussion privée, une seule par paire. */
  const write = async (userId: string, name: string) => {
    if (busy) {
      return;
    }
    setBusy(true);
    setFeedbackKey('');
    setInfoKey('');
    try {
      const res = await startDirectChat(userId);
      if (!res.ok) {
        setFeedbackKey(res.errorKey);
        return;
      }
      onOpenChat(res.id, name);
    } finally {
      setBusy(false);
    }
  };

  const confirm = (message: string, onConfirm: () => void) => {
    Alert.alert(message, undefined, [
      {text: t('communityApp.member.cancel'), style: 'cancel'},
      {text: t('communityApp.member.confirm'), style: 'destructive', onPress: onConfirm},
    ]);
  };

  const renderBody = () => {
    if (!entry || entry.status === 'loading') {
      return (
        <View style={{padding: spacing.xl, alignItems: 'center'}} testID="community-member-loading">
          <ActivityIndicator color={colors.bluePrimary} />
        </View>
      );
    }
    if (entry.status === 'notFound') {
      return (
        <EmptyState message={t('communityApp.member.notFound')} testID="community-member-notfound" />
      );
    }
    if (entry.status === 'error' || !entry.card) {
      return (
        <ErrorState
          message={t(entry.errorKey ?? 'communityApp.errors.generic')}
          retryLabel={t('common.retry')}
          onRetry={() => void memberDirectory.loadCard(ref)}
          testID="community-member-error"
        />
      );
    }
    const {member, self, contact, blockedByMe} = entry.card;
    const status = contact?.status ?? 'NONE';
    const statusLabel = self
      ? t('communityApp.member.statusSelf')
      : {
          NONE: t('communityApp.member.statusMember'),
          PENDING_OUTGOING: t('communityApp.member.status.pendingOutgoing'),
          PENDING_INCOMING: t('communityApp.member.status.pendingIncoming'),
          ACCEPTED: t('communityApp.member.status.accepted'),
        }[status];
    const relationId = contact?.relationId ?? null;

    return (
      <View style={{gap: spacing.md}} testID="community-member-ready">
        <View style={{alignItems: 'center', gap: spacing.sm}}>
          <MemberAvatar
            initials={initialsOf(member.displayName)}
            size="lg"
            src={member.avatarUrl ?? member.avatarThumbUrl}
            onImageError={refreshAfterImageError}
          />
          <Text style={{fontSize: 20, fontWeight: '700', color: colors.textPrimary}}>
            {member.displayName}
          </Text>
          <Text style={{fontSize: 14.5, color: colors.textSecondary}}>
            {member.publicPseudonym}
          </Text>
          <Text style={{fontSize: 12.5, color: colors.textMuted}}>{statusLabel}</Text>
        </View>

        {infoKey ? (
          <Text accessibilityRole="alert" style={{fontSize: 13, color: colors.success, textAlign: 'center'}}>
            {t(infoKey)}
          </Text>
        ) : null}
        {feedbackKey ? (
          <Text
            accessibilityRole="alert"
            style={{fontSize: 13, color: colors.error, textAlign: 'center'}}
            testID="community-member-feedback">
            {t(feedbackKey)}
          </Text>
        ) : null}

        {self ? (
          <View style={{gap: spacing.sm, alignItems: 'center'}}>
            <Text style={{fontSize: 13.5, color: colors.textSecondary}}>
              {t('communityApp.member.self')}
            </Text>
            <Button label={t('communityApp.member.editProfile')} onPress={onOpenProfile} />
          </View>
        ) : (
          <View style={{gap: spacing.sm}}>
            {blockedByMe ? (
              <>
                <Text style={{fontSize: 13.5, color: colors.textSecondary, textAlign: 'center'}}>
                  {t('communityApp.member.blockedByMe')}
                </Text>
                <Button
                  variant="secondary"
                  label={t('communityApp.member.unblock')}
                  onPress={() => run(() => unblockMemberAction(member.userId))}
                  disabled={busy}
                  testID="community-member-unblock"
                />
              </>
            ) : (
              <>
                {status === 'NONE' ? (
                  <Button
                    label={t('communityApp.member.add')}
                    onPress={() => run(() => requestContactAction(member.userId))}
                    disabled={busy}
                    loading={busy}
                    testID="community-member-add"
                  />
                ) : null}
                {status === 'PENDING_OUTGOING' && relationId ? (
                  <Button
                    variant="secondary"
                    label={t('communityApp.member.cancelRequest')}
                    onPress={() => run(() => cancelRequestAction(relationId))}
                    disabled={busy}
                    testID="community-member-cancel"
                  />
                ) : null}
                {status === 'PENDING_INCOMING' && relationId ? (
                  <View style={{flexDirection: 'row', gap: spacing.sm}}>
                    <Button
                      label={t('communityApp.member.accept')}
                      onPress={() => run(() => acceptRequestAction(relationId))}
                      disabled={busy}
                      testID="community-member-accept"
                    />
                    <Button
                      variant="secondary"
                      label={t('communityApp.member.reject')}
                      onPress={() => run(() => rejectRequestAction(relationId))}
                      disabled={busy}
                      testID="community-member-reject"
                    />
                  </View>
                ) : null}
                {status === 'ACCEPTED' ? (
                  <Button
                    label={t('communityApp.member.write')}
                    onPress={() => void write(member.userId, member.displayName)}
                    disabled={busy}
                    testID="community-member-write"
                  />
                ) : null}
                {status === 'ACCEPTED' ? (
                  <Button
                    variant="secondary"
                    label={t('communityApp.member.remove')}
                    onPress={() =>
                      confirm(
                        t('communityApp.member.confirmRemove', {name: member.displayName}),
                        () => void run(() => removeContactAction(member.userId)),
                      )
                    }
                    disabled={busy}
                    testID="community-member-remove"
                  />
                ) : null}
                <Button
                  variant="secondary"
                  label={t('communityApp.member.block')}
                  onPress={() =>
                    confirm(
                      t('communityApp.member.confirmBlock', {name: member.displayName}),
                      () => void run(() => blockMemberAction(member.userId)),
                    )
                  }
                  disabled={busy}
                  testID="community-member-block"
                />
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <CommunityGate onOpenProfile={onOpenProfile} onOpenSubscription={onOpenSubscription}>
      <ScrollView
        contentContainerStyle={{padding: spacing.lg, gap: spacing.md}}
        testID="screen-community-member">
        {renderBody()}
      </ScrollView>
    </CommunityGate>
  );
}
