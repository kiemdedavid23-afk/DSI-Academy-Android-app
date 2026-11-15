/**
 * Carte membre — fidélité site (dégradé SVG + halo or).
 * Props locales uniquement (R-LAY-6).
 */

import React, {useMemo} from 'react';
import {View, StyleSheet} from 'react-native';
import Svg, {Defs, LinearGradient, RadialGradient, Rect, Stop, Circle} from 'react-native-svg';
import {Text, useTheme, type ColorTokens} from '@shared/designsystem';
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
  const styles = useMemo(() => createStyles(colors), [colors]);
  const fullName = `${profile.prenom} ${profile.nom}`.trim() || t('profile.memberDefault');
  const lang = (profile.language ?? 'fr').toUpperCase();

  return (
    <View style={styles.wrap} testID="member-card">
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="mcBg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={colors.memberCardBgStart} />
            <Stop offset="45%" stopColor={colors.memberCardBgMid} />
            <Stop offset="100%" stopColor={colors.memberCardBgStart} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" rx={16} fill="url(#mcBg)" />
      </Svg>
      <View pointerEvents="none" style={styles.halo}>
        <Svg width={140} height={140}>
          <Defs>
            <RadialGradient id="mcHalo" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={colors.memberCardHaloStart} />
              <Stop offset="70%" stopColor={colors.memberCardHaloEnd} />
            </RadialGradient>
          </Defs>
          <Circle cx={70} cy={70} r={70} fill="url(#mcHalo)" />
        </Svg>
      </View>
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
                {t('profile.level')}:{' '}
                <Text style={styles.metaVal}>{profile.levelLabel}</Text>
              </Text>
            ) : null}
            {profile.codeParrainage ? (
              <Text style={styles.meta}>
                {t('dashboard.referralCode')}:{' '}
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
                {
                  color: subscriptionActive
                    ? colors.memberCardStatusOnText
                    : colors.memberCardStatusOffText,
                },
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

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    wrap: {
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.memberCardBorder,
      minHeight: 160,
      backgroundColor: colors.memberCardBgStart,
      // 0 12 40 -16 rgba(15,23,42,.55) : approché par elevation sur Android
      shadowColor: colors.memberCardBgStart,
      elevation: 12,
    },
    halo: {position: 'absolute', right: -30, bottom: -40, width: 140, height: 140},
    inner: {paddingVertical: 21.6, paddingHorizontal: 22.4},
    top: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    brand: {
      color: colors.memberCardAccent,
      fontSize: 11.5,
      fontWeight: '800',
      letterSpacing: 1.61,
    },
    chip: {
      paddingVertical: 4,
      paddingHorizontal: 8.8,
      borderRadius: 999,
      backgroundColor: colors.memberCardChipBg,
      borderWidth: 1,
      borderColor: colors.memberCardChipBorder,
    },
    chipText: {
      color: colors.memberCardText,
      fontSize: 10.9,
      fontWeight: '700',
      letterSpacing: 0.65,
      textTransform: 'uppercase',
    },
    body: {flexDirection: 'row', gap: 16, alignItems: 'center'},
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.memberCardAvatarBorder,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.memberCardAvatarBg,
    },
    avatarText: {color: colors.memberCardText, fontWeight: '700', fontSize: 16},
    name: {
      color: colors.memberCardName,
      fontSize: 18.4,
      fontWeight: '700',
      marginBottom: 4,
    },
    meta: {color: colors.memberCardMeta, fontSize: 13.6},
    metaVal: {color: colors.memberCardText, fontWeight: '600'},
    footer: {
      marginTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.memberCardDivider,
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
      backgroundColor: colors.memberCardStatusOnBg,
      borderColor: colors.memberCardStatusOnBorder,
    },
    statusOff: {
      backgroundColor: colors.memberCardStatusOffBg,
      borderColor: colors.memberCardStatusOffBorder,
    },
    statusText: {fontSize: 12, fontWeight: '700'},
    lang: {
      color: colors.memberCardAccent,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.96,
    },
  });
