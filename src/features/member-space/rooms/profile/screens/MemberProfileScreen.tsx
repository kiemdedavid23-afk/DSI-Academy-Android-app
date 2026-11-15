/**
 * Profil membre — données Worker Paiement uniquement (L3d).
 */

import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useNavigation} from '@react-navigation/native';
import {Text, useTheme, Icon} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {
  memberProfileStore,
  memberSubscriptionStore,
  referralStore,
} from '@shared/store';
import {MemberCard} from '../../../components/MemberCard';
import {referralLevel} from '@core/utils/referralLevel';
import {countryLabel} from '@core/data/countries';

function CopyRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (v: string) => void;
}) {
  const {colors, radii} = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.borderLight,
        gap: 8,
      }}>
      <View style={{flex: 1}}>
        <Text style={{fontSize: 12, color: colors.textMuted}}>{label}</Text>
        <Text style={{fontSize: 15.2, fontWeight: '600', color: colors.textPrimary}}>
          {value}
        </Text>
      </View>
      <Pressable
        onPress={() => onCopy(value)}
        accessibilityLabel={`copy ${label}`}
        style={{
          width: 38,
          height: 38,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.borderLight,
          backgroundColor: colors.bgSurfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name="CopyIcon" size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

export function MemberProfileScreen() {
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
  const ref = useSyncExternalStore(
    referralStore.subscribe,
    () => referralStore.getState(),
  );

  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    void memberProfileStore.load();
    void memberSubscriptionStore.load();
    void referralStore.load();
  }, []);

  const onCopy = async (v: string) => {
    try {
      Clipboard.setString(v);
      setCopied(v);
      setCopyError(false);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 4000);
    }
  };

  if (profile.status === 'loading' && !profile.data) {
    return (
      <View style={[styles.center, {padding: 24}]} testID="profile-skeleton">
        <ActivityIndicator color={colors.bluePrimary} />
        <Text style={{marginTop: 12, color: colors.textSecondary}}>
          {t('profile.loading')}
        </Text>
      </View>
    );
  }

  if (profile.status === 'error' && !profile.data) {
    return (
      <View style={[styles.center, {padding: 24}]} testID="profile-error">
        <Text style={{color: colors.error, fontWeight: '700'}}>
          {t('profile.errorTitle')}
        </Text>
        <Pressable
          onPress={() => void memberProfileStore.load({force: true})}
          style={[styles.btn, {backgroundColor: colors.bluePrimary, marginTop: 12}]}>
          <Text style={{color: colors.textOnPrimary, fontWeight: '600'}}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  const p = profile.data!;
  const actifs =
    typeof ref.data?.filleulsDirectsActifs === 'number'
      ? ref.data.filleulsDirectsActifs
      : null;
  const levelInfo =
    typeof actifs === 'number' ? referralLevel(actifs) : null;
  const levelLabel = levelInfo
    ? t(`referral.levels.${levelInfo.level}`, {
        defaultValue: levelInfo.level,
      })
    : '—';
  const subActive =
    (sub.data?.statut || '').toLowerCase() === 'active' ||
    (sub.data?.statut || '').toLowerCase() === 'actif';
  const statusKey = `profile.status.${p.statut}`;
  const statusLabel = t(statusKey, {defaultValue: String(p.statut)});
  const np = t('profile.notProvided');
  const pays =
    p.pays && p.pays.length === 2
      ? countryLabel(p.pays, lang as 'fr' | 'en')
      : p.pays || np;

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: 'transparent'}}
      contentContainerStyle={{padding: 16, paddingBottom: 32, gap: 20}}
      refreshControl={
        <RefreshControl
          refreshing={profile.status === 'loading'}
          onRefresh={() => {
            void memberProfileStore.load({force: true});
            void memberSubscriptionStore.load({force: true});
            void referralStore.load();
          }}
        />
      }
      testID="screen-profile">
      {/* Header */}
      <View
        style={[
          styles.card,
          {backgroundColor: glass.bg, borderColor: glass.border, borderRadius: radii.lg},
        ]}>
        <View style={{flexDirection: 'row', gap: 16, alignItems: 'center'}}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: radii.md,
              backgroundColor: colors.blueLight,
              borderWidth: 1,
              borderColor: colors.blueBorderSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon name="UserIcon" size={26} color={colors.bluePrimary} />
          </View>
          <View style={{flex: 1}}>
            <Text style={{fontSize: 21.6, fontWeight: '800', color: colors.textPrimary, lineHeight: 26}}>
              {t('profile.title')}
            </Text>
            <Text style={{fontSize: 13.6, color: colors.textSecondary}}>
              {t('profile.subtitle')}
            </Text>
          </View>
        </View>
      </View>

      {/* Héros */}
      <View
        style={{
          backgroundColor: colors.bgDarkPremium,
          borderColor: colors.goldBorder,
          borderWidth: 1,
          borderRadius: radii.lg,
          paddingVertical: 20,
          paddingHorizontal: 24,
          gap: 17.6,
        }}>
        <Text
          style={{
            fontFamily: 'Fraunces-SemiBold',
            fontSize: 25.6,
            color: colors.textOnDark,
            lineHeight: 29.4,
          }}>
          {`${p.prenom} ${p.nom}`.trim()}
        </Text>
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
          <View
            style={{
              paddingVertical: 5,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: colors.goldHalo14,
              borderWidth: 1,
              borderColor: colors.goldBorder,
            }}>
            <Text style={{color: colors.goldPrestige, fontSize: 13.1, letterSpacing: 0.4}}>
              {p.identifiantDsi}
            </Text>
          </View>
          <View
            style={{
              paddingVertical: 5,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor:
                p.statut === 'active'
                  ? colors.statusActiveOnDarkBg
                  : colors.statusInactiveOnDarkBg,
              borderWidth: 1,
              borderColor:
                p.statut === 'active'
                  ? colors.statusActiveOnDarkBorder
                  : colors.statusInactiveOnDarkBorder,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor:
                  p.statut === 'active'
                    ? colors.statusActiveOnDarkText
                    : colors.textOnDark,
              }}
            />
            <Text
              style={{
                color:
                  p.statut === 'active'
                    ? colors.statusActiveOnDarkText
                    : colors.textOnDark,
                fontSize: 12.8,
                fontWeight: '600',
              }}>
              {statusLabel}
            </Text>
          </View>
        </View>
      </View>

      <MemberCard
        profile={{
          identifiantDsi: p.identifiantDsi,
          nom: p.nom,
          prenom: p.prenom,
          codeParrainage: p.codeParrainagePersonnel,
          levelLabel: levelInfo ? levelLabel : null,
          language: lang as 'fr' | 'en',
        }}
        subscriptionActive={subActive}
      />

      {/* Chiffre clé — niveau seul */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.goldHalo12,
            borderColor: colors.goldBorder,
            borderRadius: radii.lg,
            minHeight: 80,
            padding: 16,
          },
        ]}>
        <Text style={{fontSize: 12, fontWeight: '500', color: colors.textMuted}}>
          {t('profile.level')}
        </Text>
        <Text
          style={{
            fontFamily: 'Fraunces-SemiBold',
            fontSize: 17.6,
            color: colors.textPrimary,
            marginTop: 4,
          }}>
          {levelLabel}
        </Text>
      </View>

      {/* Identité */}
      <View
        style={[
          styles.card,
          {backgroundColor: glass.bg, borderColor: glass.border, borderRadius: radii.lg, paddingHorizontal: 24, paddingVertical: 20},
        ]}>
        <Text style={{fontWeight: '700', marginBottom: 8, color: colors.textPrimary}}>
          {t('profile.personalTitle')}
        </Text>
        <CopyRow label={t('profile.lastName')} value={p.nom || np} onCopy={onCopy} />
        <CopyRow label={t('profile.firstName')} value={p.prenom || np} onCopy={onCopy} />
        <CopyRow label={t('profile.email')} value={p.email || np} onCopy={onCopy} />
        <CopyRow label={t('profile.whatsapp')} value={p.whatsapp || np} onCopy={onCopy} />
        <View style={{paddingVertical: 12}}>
          <Text style={{fontSize: 12, color: colors.textMuted}}>{t('profile.country')}</Text>
          <Text style={{fontSize: 15.2, fontWeight: '600', color: colors.textPrimary}}>
            {pays}
          </Text>
        </View>
      </View>

      {/* Compte DSI */}
      <View
        style={[
          styles.card,
          {backgroundColor: glass.bg, borderColor: glass.border, borderRadius: radii.lg, paddingHorizontal: 24, paddingVertical: 20},
        ]}>
        <Text style={{fontWeight: '700', marginBottom: 8, color: colors.textPrimary}}>
          {t('profile.dsiTitle')}
        </Text>
        <CopyRow label={t('profile.dsiId')} value={p.identifiantDsi} onCopy={onCopy} />
        <CopyRow
          label={t('profile.referralCode')}
          value={p.codeParrainagePersonnel || np}
          onCopy={onCopy}
        />
      </View>

      {copied ? (
        <Text style={{color: colors.success, fontSize: 13}}>{t('profile.copy')}</Text>
      ) : null}
      {copyError ? (
        <Text style={{color: colors.dangerText, fontSize: 13.1}}>{t('profile.copyError')}</Text>
      ) : null}

      {/* Raccourcis */}
      {(
        [
          {label: t('rooms.referral'), screen: 'MemberReferral', icon: 'ReferralIcon' as const},
          {label: t('rooms.subscription'), screen: 'MemberSubscription', icon: 'SubscriptionIcon' as const},
          {label: t('rooms.settings'), screen: 'MemberSettings', icon: 'SettingsIcon' as const},
        ] as const
      ).map(item => (
        <Pressable
          key={item.screen}
          onPress={() => navigation.navigate(item.screen)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 12,
            paddingHorizontal: 14.4,
            borderRadius: radii.md,
            backgroundColor: colors.bgSurfaceAlt,
            borderWidth: 1,
            borderColor: colors.borderLight,
          }}>
          <Icon name={item.icon} size={20} color={colors.textSecondary} />
          <Text style={{flex: 1, fontSize: 14.4, fontWeight: '600', color: colors.textPrimary}}>
            {item.label}
          </Text>
          <Icon name="ChevronRightIcon" size={18} color={colors.textMuted} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  card: {borderWidth: 1, padding: 16},
  btn: {paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8},
});
