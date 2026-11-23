/**
 * Contacts (reprend site : CommunityContactsPage.jsx) : demandes reçues et
 * envoyées, contacts, retrait. « Écrire » arrive avec les discussions.
 */

import React, {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {ActivityIndicator, Alert, RefreshControl, ScrollView, View} from 'react-native';
import {useTranslation} from '@shared/i18n';
import {Button, EmptyState, ErrorState, Text, useTheme} from '@shared/designsystem';
import {communityErrorKey} from '@shared/community';
import {CommunityGate} from '../components/CommunityGate';
import {PersonRow} from '../components/PersonRow';
import {
  acceptRequestAction,
  cancelRequestAction,
  rejectRequestAction,
  removeContactAction,
  type ContactActionResult,
} from '../store/contactActions';
import {contactsStore} from '../store/contactsStore';
import {startDirectChat} from '../store/conversationActions';

type Props = {
  onOpenMember: (ref: string) => void;
  onOpenChat: (id: string, title: string) => void;
  onOpenFind: () => void;
  onOpenProfile: () => void;
  onOpenSubscription: () => void;
};

export function CommunityContactsScreen({
  onOpenMember,
  onOpenChat,
  onOpenFind,
  onOpenProfile,
  onOpenSubscription,
}: Props) {
  const {t, i18n} = useTranslation();
  const {colors, spacing} = useTheme();
  const state = useSyncExternalStore(
    cb => contactsStore.subscribe(() => cb()),
    () => contactsStore.getState(),
  );
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [feedbackKey, setFeedbackKey] = useState('');
  const [infoKey, setInfoKey] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    void contactsStore.load({force: true});
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = async (key: string, fn: () => Promise<ContactActionResult>) => {
    if (busyKey) {
      return;
    }
    setBusyKey(key);
    setFeedbackKey('');
    setInfoKey('');
    const res = await fn();
    if (!mounted.current) {
      return;
    }
    setBusyKey(null);
    if (!res.ok) {
      setFeedbackKey(res.errorKey);
    } else if (res.infoKey) {
      setInfoKey(res.infoKey);
    }
  };

  const write = async (userId: string, name: string) => {
    if (busyKey) {
      return;
    }
    setBusyKey(`write-${userId}`);
    setFeedbackKey('');
    setInfoKey('');
    const res = await startDirectChat(userId);
    if (!mounted.current) {
      return;
    }
    setBusyKey(null);
    if (!res.ok) {
      setFeedbackKey(res.errorKey);
      return;
    }
    onOpenChat(res.id, name);
  };

  const confirmRemove = (userId: string, name: string) => {
    Alert.alert(t('communityApp.contacts.confirmRemove', {name}), undefined, [
      {text: t('communityApp.contacts.cancel'), style: 'cancel'},
      {
        text: t('communityApp.contacts.confirm'),
        style: 'destructive',
        onPress: () => void run(`rm-${userId}`, () => removeContactAction(userId)),
      },
    ]);
  };

  const data = state.data;
  const dateFmt = (ms: number) =>
    new Date(ms).toLocaleDateString(i18n.language, {day: 'numeric', month: 'short', year: 'numeric'});

  const renderBody = () => {
    if (!data) {
      if (state.status === 'error') {
        return (
          <ErrorState
            message={t(communityErrorKey(state.error))}
            retryLabel={t('common.retry')}
            onRetry={() => void contactsStore.load({force: true})}
            testID="community-contacts-error"
          />
        );
      }
      return (
        <View style={{padding: spacing.xl, alignItems: 'center'}} testID="community-contacts-loading">
          <ActivityIndicator color={colors.bluePrimary} />
        </View>
      );
    }
    const {contacts, incoming, outgoing} = data;
    const nothing = contacts.length + incoming.length + outgoing.length === 0;
    const heading = (key: string) => (
      <Text style={{fontSize: 15, fontWeight: '700', color: colors.textPrimary}}>{t(key)}</Text>
    );
    const busy = busyKey !== null;
    return (
      <View style={{gap: spacing.md}}>
        <View style={{flexDirection: 'row'}}>
          <Button
            variant="secondary"
            label={t('communityApp.contacts.find')}
            onPress={onOpenFind}
            testID="community-contacts-find"
          />
        </View>
        {infoKey ? (
          <Text accessibilityRole="alert" style={{fontSize: 13, color: colors.success}}>
            {t(infoKey)}
          </Text>
        ) : null}
        {feedbackKey ? (
          <Text
            accessibilityRole="alert"
            style={{fontSize: 13, color: colors.error}}
            testID="community-contacts-feedback">
            {t(feedbackKey)}
          </Text>
        ) : null}
        {nothing ? (
          <EmptyState
            title={t('communityApp.contacts.emptyTitle')}
            message={t('communityApp.contacts.emptyText')}
            testID="community-contacts-empty"
          />
        ) : null}

        {incoming.length > 0 ? (
          <View style={{gap: spacing.sm}}>
            {heading('communityApp.contacts.requestsIn')}
            {incoming.map(r => (
              <PersonRow
                key={r.relationId}
                peer={r.peer}
                onPress={() => onOpenMember(r.peer.pseudonym || r.peer.userId)}
                testID={`community-request-in-${r.relationId}`}
                actions={
                  <>
                    <Button
                      label={t('communityApp.contacts.accept')}
                      onPress={() => run(`a-${r.relationId}`, () => acceptRequestAction(r.relationId))}
                      disabled={busy}
                    />
                    <Button
                      variant="secondary"
                      label={t('communityApp.contacts.reject')}
                      onPress={() => run(`r-${r.relationId}`, () => rejectRequestAction(r.relationId))}
                      disabled={busy}
                    />
                  </>
                }
              />
            ))}
          </View>
        ) : null}

        {outgoing.length > 0 ? (
          <View style={{gap: spacing.sm}}>
            {heading('communityApp.contacts.requestsOut')}
            {outgoing.map(r => (
              <PersonRow
                key={r.relationId}
                peer={r.peer}
                onPress={() => onOpenMember(r.peer.pseudonym || r.peer.userId)}
                testID={`community-request-out-${r.relationId}`}
                actions={
                  <Button
                    variant="secondary"
                    label={t('communityApp.contacts.cancelRequest')}
                    onPress={() => run(`c-${r.relationId}`, () => cancelRequestAction(r.relationId))}
                    disabled={busy}
                  />
                }
              />
            ))}
          </View>
        ) : null}

        {contacts.length > 0 ? (
          <View style={{gap: spacing.sm}}>
            {heading('communityApp.contacts.mine')}
            {contacts.map(c => (
              <PersonRow
                key={c.relationId}
                peer={c.peer}
                subtitle={
                  c.contactSince
                    ? t('communityApp.contacts.since', {date: dateFmt(c.contactSince)})
                    : null
                }
                onPress={() => onOpenMember(c.peer.pseudonym || c.peer.userId)}
                testID={`community-contact-${c.peer.userId}`}
                actions={
                  <>
                    <Button
                      label={t('communityApp.contacts.write')}
                      onPress={() => void write(c.peer.userId, c.peer.displayName)}
                      disabled={busy}
                      testID={`community-contact-write-${c.peer.userId}`}
                    />
                    <Button
                      variant="secondary"
                      label={t('communityApp.contacts.remove')}
                      onPress={() => confirmRemove(c.peer.userId, c.peer.displayName)}
                      disabled={busy}
                    />
                  </>
                }
              />
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <CommunityGate onOpenProfile={onOpenProfile} onOpenSubscription={onOpenSubscription}>
      <ScrollView
        contentContainerStyle={{padding: spacing.lg, gap: spacing.md}}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await contactsStore.load({force: true});
              if (mounted.current) {
                setRefreshing(false);
              }
            }}
          />
        }
        testID="screen-community-contacts">
        {renderBody()}
      </ScrollView>
    </CommunityGate>
  );
}
