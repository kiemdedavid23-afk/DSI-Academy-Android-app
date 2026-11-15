/**
 * Carte membre — fidélité site (dégradé SVG + halo or).
 * Props locales uniquement (R-LAY-6).
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import Svg, {Defs, LinearGradient, RadialGradient, Rect, Stop, Circle} from 'react-native-svg';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';

export type MemberCardProfile = {
  identifiantDsi: string;
  nom: string;
  prenom: string;
  codeParrainage?: string | null;
  levelLabel?: string | null;
  language?: 'fr' | 'en';
};

export type MemberCardProps = {
  profile: MemberCardProfile;
  subscriptionActive: boolean;
};

export function MemberCard({profile, subscriptionActive}: MemberCardProps) {
  const {t} = useTranslation();
  const {colors} = useTheme();
  const fullName = `${profile.prenom} ${profile.nom}`.trim() || t('profile.memberDefault');
  const lang = (profile.language ?? 'fr').toUpperCase();

  return (
    <View style={styles.wrap} testID="member-card">
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="mcBg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#0f172a" />
            <Stop offset="45%" stopColor="#1e293b" />
            <Stop offset="100%" stopColor="#0f172a" />
          </LinearGradient>
          <RadialGradient id="mcHalo" cx="85%" cy="90%" rx="45%" ry="45%">
            <Stop offset="0%" stopColor="rgba(212,175,55,0.2)" />
            <Stop offset="70%" stopColor="rgba(212,175,55,0)" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" rx={16} fill="url(#mcBg)" />
        <Circle cx="100%" cy="100%" r={90} fill="url(#mcHalo)" />
      </Svg>
      <View style={styles.inner}>
        <View style={styles.top}>
          <Text style={styles.brand}>DSI ACADEMY</Text>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{t('premium.memberCardChip')}</Text>
          </View>
        </View>
        <View style={styles.body}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile.prenom?.[0] || profile.nom?.[0] || 'D').toUpperCase()}
              {(profile.nom?.[0] || '').toUpperCase()}
            </Text>
          </View>
          <View style={{flex: 1, gap: 4}}>
            <Text style={styles.name}>{fullName}</Text>
            <Text style={styles.meta}>
              {t('profile.dsiId')}{' '}
              <Text style={styles.metaVal}>{profile.identifiantDsi}</Text>
            </Text>
            {profile.levelLabel ? (
              <Text style={styles.meta}>
                {t('profile.level')}{' '}
                <Text style={styles.metaVal}>{profile.levelLabel}</Text>
              </Text>
            ) : null}
            {profile.codeParrainage ? (
              <Text style={styles.meta}>
                {t('profile.referralCode')}{' '}
                <Text style={styles.metaVal}>{profile.codeParrainage}</Text>
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.footer}>
          <View
            style={[
              styles.status,
              subscriptionActive ? styles.statusOn : styles.statusOff,
            ]}>
            <Text
              style={[
                styles.statusText,
                {color: subscriptionActive ? '#6ee7b7' : '#cbd5e1'},
              ]}>
              {subscriptionActive
                ? t('premium.active', {defaultValue: 'Actif'})
                : t('premium.inactive', {defaultValue: 'Inactif'})}
            </Text>
          </View>
          <Text style={styles.lang}>{lang}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    minHeight: 160,
  },
  inner: {paddingVertical: 21.6, paddingHorizontal: 22.4},
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  brand: {
    color: '#d4af37',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 2.24,
  },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 8.8,
    borderRadius: 999,
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
  },
  chipText: {
    color: '#fdf6e2',
    fontSize: 10.9,
    fontWeight: '700',
    letterSpacing: 0.96,
    textTransform: 'uppercase',
  },
  body: {flexDirection: 'row', gap: 16, alignItems: 'center'},
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(253,246,226,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  avatarText: {color: '#fdf6e2', fontWeight: '700', fontSize: 16},
  name: {
    color: '#f8fafc',
    fontSize: 18.4,
    fontWeight: '700',
    marginBottom: 4,
  },
  meta: {color: 'rgba(248,250,252,0.75)', fontSize: 13.6},
  metaVal: {color: '#fdf6e2', fontWeight: '600'},
  footer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 13.6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  status: {
    paddingVertical: 4,
    paddingHorizontal: 9.6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusOn: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderColor: 'rgba(16,185,129,0.35)',
  },
  statusOff: {
    backgroundColor: 'rgba(148,163,184,0.15)',
    borderColor: 'rgba(148,163,184,0.3)',
  },
  statusText: {fontSize: 12, fontWeight: '700'},
  lang: {
    color: '#d4af37',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.28,
  },
});
