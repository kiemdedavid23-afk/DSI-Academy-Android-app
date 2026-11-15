/**
 * Pièce Parrainage (L3b).
 */

import React, {useCallback, useEffect, useState, useSyncExternalStore} from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Share,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {Text, useTheme, Icon} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {
  referralStore,
  buildReferralInviteLink,
} from '@shared/store/referralStore';
import {referralLevel} from '@core/utils/referralLevel';
import {dsiToFcfa} from '@core/utils/dsi';
import {usePreferences} from '@shared/preferences';
import {bannerStore, getDisplayPricing} from '@shared/store';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(locale);
  } catch {
    return '—';
  }
}

export function MemberReferralScreen() {
  const {t, i18n} = useTranslation();
  const {colors, radii, glass} = useTheme();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';
  const fmt = (n: number) => new Intl.NumberFormat(locale).format(n);

  const st = useSyncExternalStore(
    cb => referralStore.subscribe(() => cb()),
    () => referralStore.getState(),
    () => referralStore.getState(),
  );
  const {reduceMotion} = usePreferences();
  const pricing = getDisplayPricing();

  const [rulesOpen, setRulesOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    void referralStore.load();
  }, []);

  useEffect(() => {
    if (copyError) {
      bannerStore.notify({tone: 'error', type: 'referral-copy', message: copyError});
    }
  }, [copyError]);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  const data = st.data;
  const loading = st.status === 'loading' && !data;
  const inviteLink = buildReferralInviteLink(data?.codeParrainagePersonnel);
  const levelInfo = referralLevel(data?.filleulsDirectsActifs ?? 0);

  const onCopy = useCallback(async () => {
    setCopyError(null);
    if (!inviteLink) return;
    try {
      Clipboard.setString(inviteLink);
      setCopied(true);
    } catch {
      setCopyError(t('referral.copyError'));
    }
  }, [inviteLink, t]);

  const onShare = useCallback(async () => {
    if (!inviteLink) return;
    try {
      await Share.share({
        message: `${t('referral.shareText')}\n${inviteLink}`,
      });
    } catch {
      /* user dismissed */
    }
  }, [inviteLink, t]);

  const toggleRules = () => {
    if (!reduceMotion) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setRulesOpen(o => !o);
  };

  if (loading) {
    return (
      <View style={[styles.center, {padding: 24}]} testID="referral-skeleton">
        <ActivityIndicator color={colors.bluePrimary} />
        <Text style={{marginTop: 12, color: colors.textSecondary}}>
          {t('referral.loading')}
        </Text>
      </View>
    );
  }

  if (st.status === 'error' && !data) {
    return (
      <View style={[styles.center, {padding: 24}]} testID="referral-error">
        <Text style={{color: colors.textSecondary, textAlign: 'center'}}>
          {typeof st.error === 'string' && st.error.includes('.')
            ? t(st.error)
            : String(st.error ?? t('referral.errorLoad'))}
        </Text>
        <Pressable
          onPress={() => void referralStore.load({force: true})}
          style={[styles.btn, {backgroundColor: colors.bgDarkPremium, marginTop: 16}]}>
          <Text style={{color: colors.goldPrestige, fontWeight: '600'}}>
            {t('common.retry')}
          </Text>
        </Pressable>
      </View>
    );
  }

  const code = data?.codeParrainagePersonnel ?? '—';
  const hasFilleuls = (data?.filleulsDirectsTotal ?? 0) > 0;

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: 'transparent'}}
      contentContainerStyle={{padding: 16, paddingBottom: 32, gap: 16}}
      refreshControl={
        <RefreshControl
          refreshing={st.status === 'loading'}
          onRefresh={() => void referralStore.load({force: true})}
        />
      }
      testID="screen-referral">
      {/* En-tête */}
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: radii.md,
            backgroundColor: colors.blueLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon name="ReferralIcon" size={26} color={colors.bluePrimary} />
        </View>
        <View style={{flex: 1}}>
          <Text
            style={{
              fontFamily: 'Fraunces-Bold',
              fontSize: 22,
              color: colors.textPrimary,
            }}>
            {t('referral.title')}
          </Text>
          <Text style={{color: colors.textSecondary, fontSize: 14}}>
            {t('referral.subtitle')}
          </Text>
        </View>
      </View>

      {/* Héros sombre */}
      <View
        style={{
          backgroundColor: colors.bgDarkPremium,
          borderRadius: radii.lg,
          padding: 20,
          gap: 10,
        }}>
        <Text style={{color: colors.goldPrestige, fontSize: 12, fontWeight: '700'}}>
          {t('referral.code')}
        </Text>
        <Text
          style={{
            fontFamily: 'Fraunces-Bold',
            fontSize: 28,
            color: colors.textOnDark,
            letterSpacing: 1,
          }}
          accessibilityLabel={t('referral.code')}>
          {code}
        </Text>
        <Text style={{color: colors.textOnDark, opacity: 0.85}}>
          {hasFilleuls
            ? `${fmt(data!.filleulsDirectsActifs)} / ${fmt(data!.filleulsDirectsTotal)} ${t('referral.statActive')}`
            : t('referral.heroEmpty')}
        </Text>
      </View>

      {/* Invitation */}
      <View
        style={{
          backgroundColor: glass.bg,
          borderColor: glass.border,
          borderWidth: 1,
          borderRadius: radii.lg,
          padding: 16,
          gap: 12,
        }}>
        <Text style={{fontWeight: '600', color: colors.textPrimary}}>
          {t('referral.linkLabel')}
        </Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.borderLight,
            borderRadius: radii.md,
            padding: 12,
            backgroundColor: colors.bgSurfaceAlt,
          }}>
          <Text
            selectable
            style={{color: colors.textSecondary, fontSize: 13}}
            numberOfLines={2}>
            {inviteLink || '—'}
          </Text>
        </View>
        <View style={{flexDirection: 'row', gap: 10}}>
          <Pressable
            onPress={() => void onCopy()}
            style={[
              styles.btn,
              {flex: 1, backgroundColor: colors.bgDarkPremium, flexDirection: 'row', gap: 8, justifyContent: 'center'},
            ]}
            accessibilityRole="button"
            accessibilityLabel={copied ? t('referral.copied') : t('referral.copy')}
            testID="referral-copy">
            <Icon
              name={copied ? 'CheckIcon' : 'CopyIcon'}
              size={18}
              color={colors.goldPrestige}
            />
            <Text style={{color: colors.goldPrestige, fontWeight: '700'}}>
              {copied ? t('referral.copied') : t('referral.copy')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void onShare()}
            style={[
              styles.btn,
              {
                flex: 1,
                backgroundColor: colors.blueLight,
                flexDirection: 'row',
                gap: 8,
                justifyContent: 'center',
              },
            ]}
            accessibilityRole="button"
            testID="referral-share">
            <Icon name="ShareIcon" size={18} color={colors.bluePrimary} />
            <Text style={{color: colors.bluePrimary, fontWeight: '700'}}>
              {t('referral.share')}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Progression */}
      <View
        style={{
          backgroundColor: glass.bg,
          borderColor: glass.border,
          borderWidth: 1,
          borderRadius: radii.lg,
          padding: 16,
          gap: 10,
        }}>
        <Text style={{fontWeight: '600', color: colors.textPrimary}}>
          {t('referral.progressTitle')}
        </Text>
        {!hasFilleuls ? (
          <Text style={{color: colors.textSecondary}}>{t('referral.progressEmpty')}</Text>
        ) : (
          <>
            <Text style={{color: colors.textSecondary, fontSize: 13}}>
              {fmt(data!.filleulsDirectsActifs)} {t('referral.statActive')} ·{' '}
              {fmt(data!.filleulsDirectsTotal)} {t('referral.statDirect')}
            </Text>
            <View
              style={{
                height: 10,
                borderRadius: 5,
                backgroundColor: colors.bgSurfaceAlt,
                overflow: 'hidden',
              }}
              accessibilityRole="progressbar"
              accessibilityValue={{
                min: 0,
                max: 100,
                now: Math.round(levelInfo.progress * 100),
              }}>
              <View
                style={{
                  width: `${Math.round(levelInfo.progress * 100)}%`,
                  height: '100%',
                  backgroundColor: colors.goldPrestige,
                }}
              />
            </View>
            <Text style={{color: colors.textMuted, fontSize: 12}}>
              {t('referral.progressCaption', {
                percent: Math.round(levelInfo.progress * 100),
              })}{' '}
              · {levelInfo.level}
              {levelInfo.nextThreshold != null
                ? ` → ${levelInfo.nextThreshold}`
                : ''}
            </Text>
          </>
        )}
      </View>

      {/* Récompenses stats Worker */}
      <View style={{flexDirection: 'row', gap: 8}}>
        {[
          {
            label: t('referral.statReward1'),
            value: fmt(data?.recompensesNiveau1Dsi ?? 0),
          },
          {
            label: t('referral.statReward2'),
            value: fmt(data?.recompensesNiveau2Dsi ?? 0),
          },
          {
            label: t('referral.statTotal'),
            value: fmt(data?.totalDsiParrainage ?? 0),
          },
        ].map(c => (
          <View
            key={c.label}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: radii.md,
              backgroundColor: glass.bg,
              borderWidth: 1,
              borderColor: glass.border,
            }}>
            <Text style={{fontSize: 11, color: colors.textSecondary}} numberOfLines={2}>
              {c.label}
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontFamily: 'Fraunces-Bold',
                fontSize: 18,
                color: colors.homeGold,
              }}>
              {c.value}
            </Text>
          </View>
        ))}
      </View>

      {/* Règles repliables */}
      <View
        style={{
          backgroundColor: glass.bg,
          borderColor: glass.border,
          borderWidth: 1,
          borderRadius: radii.lg,
          overflow: 'hidden',
        }}>
        <Pressable
          onPress={toggleRules}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
          }}
          accessibilityRole="button"
          accessibilityState={{expanded: rulesOpen}}>
          <Text style={{fontWeight: '700', color: colors.textPrimary}}>
            {t('referral.rulesTitle')}
          </Text>
          <View
            style={{
              transform: [{rotate: rulesOpen ? '180deg' : '0deg'}],
            }}>
            <Icon name="ChevronDownIcon" size={20} color={colors.textSecondary} />
          </View>
        </Pressable>
        {rulesOpen ? (
          <View style={{paddingHorizontal: 16, paddingBottom: 16, gap: 12}}>
            <View style={{gap: 4}}>
              <Text style={{fontWeight: '700', color: colors.bluePrimary}}>
                {t('referral.level1')}
              </Text>
              <Text style={{fontFamily: 'Fraunces-Bold', fontSize: 22, color: colors.homeGold}}>
                {fmt(pricing.referralRewardN1Dsi)} DSI
                <Text style={{fontSize: 14, color: colors.textSecondary}}>
                  {' '}
                  ({fmt(dsiToFcfa(pricing.referralRewardN1Dsi))} FCFA)
                </Text>
              </Text>
              <Text style={{color: colors.textSecondary, fontSize: 13}}>
                {t('referral.level1Desc')}
              </Text>
            </View>
            <View style={{gap: 4}}>
              <Text style={{fontWeight: '700', color: colors.bluePrimary}}>
                {t('referral.level2')}
              </Text>
              <Text style={{fontFamily: 'Fraunces-Bold', fontSize: 22, color: colors.homeGold}}>
                {fmt(pricing.referralRewardN2Dsi)} DSI
                <Text style={{fontSize: 14, color: colors.textSecondary}}>
                  {' '}
                  ({fmt(dsiToFcfa(pricing.referralRewardN2Dsi))} FCFA)
                </Text>
              </Text>
              <Text style={{color: colors.textSecondary, fontSize: 13}}>
                {t('referral.level2Desc')}
              </Text>
            </View>
            <Text style={{color: colors.textMuted, fontSize: 12}}>
              {t('referral.reminderText')}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Historique */}
      <View
        style={{
          backgroundColor: glass.bg,
          borderColor: glass.border,
          borderWidth: 1,
          borderRadius: radii.lg,
          padding: 16,
          gap: 10,
        }}>
        <Text
          style={{
            fontFamily: 'Fraunces-Bold',
            fontSize: 16,
            color: colors.textPrimary,
          }}>
          {t('referral.historyTitle')}
        </Text>
        {!data?.historique?.length ? (
          <Text style={{color: colors.textSecondary}}>{t('referral.emptyHistory')}</Text>
        ) : (
          data.historique.map((item, idx) => {
            const isN1 = item.type === 'gain_parrainage_n1';
            const isN2 = item.type === 'gain_parrainage_n2';
            const typeLabel = isN1
              ? t('referral.typeLevel1')
              : isN2
                ? t('referral.typeLevel2')
                : item.type || '—';
            return (
              <View
                key={`${item.date}-${idx}`}
                style={{
                  paddingVertical: 10,
                  borderBottomWidth:
                    idx < data.historique.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: colors.borderLight,
                  gap: 4,
                }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                  <View
                    style={{
                      backgroundColor: isN1
                        ? colors.blueLight
                        : isN2
                          ? colors.goldLight
                          : colors.bgSurfaceAlt,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: isN1
                          ? colors.bluePrimary
                          : isN2
                            ? colors.badgeActiveText
                            : colors.textSecondary,
                      }}>
                      {typeLabel}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontWeight: '700',
                      color: colors.homeGold,
                    }}>
                    {item.montant != null ? `+${fmt(item.montant)}` : '—'} DSI
                  </Text>
                </View>
                <Text style={{color: colors.textSecondary, fontSize: 12}}>
                  {item.identifiantDsiFilleul || '—'} · {formatDate(item.date, locale)}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
});
