import React, {useEffect, useSyncExternalStore} from 'react';
import {View, ScrollView, Pressable, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {memberProfileStore, memberSubscriptionStore} from '@shared/store';
import {countryLabel} from '@core/data/countries';

export function SettingsAccountView({onBack}: {onBack: () => void}) {
  const {t, i18n} = useTranslation();
  const {colors, radii, glass} = useTheme();
  const navigation = useNavigation<any>();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'fr';
  const profile = useSyncExternalStore(
    cb => memberProfileStore.subscribe(() => cb()),
    () => memberProfileStore.getState(),
  );
  const sub = useSyncExternalStore(
    cb => memberSubscriptionStore.subscribe(() => cb()),
    () => memberSubscriptionStore.getState(),
  );

  useEffect(() => {
    void memberProfileStore.load();
    void memberSubscriptionStore.load();
  }, []);

  const p = profile.data;
  const np = t('profile.notProvided');

  return (
    <ScrollView contentContainerStyle={{padding: 16, gap: 16, paddingBottom: 32}}>
      <Pressable
        onPress={onBack}
        style={{
          alignSelf: 'flex-start',
          paddingVertical: 7.2,
          paddingLeft: 8,
          paddingRight: 12.8,
          borderRadius: radii.md,
          backgroundColor: glass.bg,
          borderWidth: 1,
          borderColor: glass.border,
        }}>
        <Text style={{fontSize: 13.6, fontWeight: '600', color: colors.textPrimary}}>
          ← {t('settings.back')}
        </Text>
      </Pressable>
      <Text style={{fontSize: 19.2, fontWeight: '800', color: colors.textPrimary}}>
        {t('settings.account.title')}
      </Text>
      <Text style={{fontSize: 13.1, color: colors.textSecondary}}>
        {t('common.readOnly')}
      </Text>
      <View
        style={{
          backgroundColor: glass.bg,
          borderColor: glass.border,
          borderWidth: 1,
          borderRadius: radii.lg,
          padding: 16,
          gap: 10,
        }}>
        {[
          [t('profile.lastName'), p?.nom || np],
          [t('profile.firstName'), p?.prenom || np],
          [t('profile.email'), p?.email || np],
          [t('profile.whatsapp'), p?.whatsapp || np],
          [
            t('profile.country'),
            p?.pays ? countryLabel(p.pays, lang as 'fr' | 'en') : np,
          ],
          [t('profile.dsiId'), p?.identifiantDsi || np],
        ].map(([l, v]) => (
          <View key={String(l)}>
            <Text style={{fontSize: 12, color: colors.textMuted}}>{l}</Text>
            <Text style={{fontSize: 15.2, fontWeight: '600', color: colors.textPrimary}}>
              {v}
            </Text>
          </View>
        ))}
      </View>
      <Pressable
        onPress={() => navigation.navigate('MemberProfile')}
        style={[styles.link, {borderColor: colors.borderLight}]}>
        <Text style={{color: colors.bluePrimary, fontWeight: '600'}}>
          {t('settings.viewProfile')}
        </Text>
      </Pressable>
      <View
        style={{
          backgroundColor: glass.bg,
          borderColor: glass.border,
          borderWidth: 1,
          borderRadius: radii.lg,
          padding: 16,
          gap: 8,
        }}>
        <Text style={{fontWeight: '700', color: colors.textPrimary}}>
          {t('rooms.subscription')}
        </Text>
        <Text style={{color: colors.textSecondary}}>
          {sub.data?.statut || '—'} · {sub.data?.dateFin || '—'}
        </Text>
        <Pressable onPress={() => navigation.navigate('MemberSubscription')}>
          <Text style={{color: colors.bluePrimary, fontWeight: '600'}}>
            {t('settings.manageSubscription', {defaultValue: 'Gérer mon abonnement'})}
          </Text>
        </Pressable>
      </View>
      <View style={{opacity: 0.55, gap: 8}}>
        <Text style={{color: colors.textMuted}}>{t('settings.contactSupport', {defaultValue: 'Contacter le support'})} — {t('common.comingSoon')}</Text>
        <Text style={{color: colors.dangerText}}>
          {t('settings.deleteAccount', {defaultValue: 'Supprimer mon compte'})} — {t('common.comingSoon')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  link: {padding: 12, borderWidth: 1, borderRadius: 8, alignItems: 'center'},
});
