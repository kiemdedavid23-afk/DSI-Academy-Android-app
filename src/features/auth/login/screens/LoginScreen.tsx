/**
 * Écran de connexion — mise en page calquée sur le site (ConnexionScreen).
 * Aucun import @core/api, @core/network, @core/config (R-LAY).
 */

import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  Button,
  Card,
  Text,
  TextField,
  useTheme,
} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {loginStore} from '../store/loginStore';
import {lastLoginIdentifier, sessionEndReason} from '@core/session';
import type {AuthStackParamList} from '@app/navigation/AuthStack';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;
type LoginRoute = RouteProp<AuthStackParamList, 'Login'>;

export function LoginScreen() {
  const {t} = useTranslation();
  const {colors, spacing, touch} = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<LoginRoute>();
  const state = useSyncExternalStore(
    loginStore.subscribe,
    loginStore.getState,
    loginStore.getState,
  );

  const prefill = route.params?.prefillIdentifiant ?? '';
  const [identifiant, setIdentifiant] = useState(prefill);
  const [motDePasse, setMotDePasse] = useState('');
  const [souvenir, setSouvenir] = useState(false);
  const [idError, setIdError] = useState(false);
  const [mdpError, setMdpError] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<string | null>(null);

  useEffect(() => {
    if (prefill) {
      setIdentifiant(prefill);
    }
  }, [prefill]);

  useEffect(() => {
    const reason = sessionEndReason.consume();
    if (reason === 'unauthorized' || reason === 'expired') {
      setSessionInfo(t('home.sessionExpired'));
    }
  }, [t]);

  useEffect(() => {
    return () => {
      loginStore.reset();
    };
  }, []);

  const loading = state.status === 'loading';

  const onSubmit = () => {
    const idPropre = identifiant.trim();
    const badId = !idPropre;
    const badMdp = !motDePasse;
    setIdError(badId);
    setMdpError(badMdp);
    if (badId || badMdp) {
      return;
    }
    lastLoginIdentifier.set(idPropre);
    void loginStore.submit(
      idPropre,
      motDePasse,
      souvenir,
      t('connexion.errorGeneric'),
    );
  };

  if (state.status === 'pendingPayment') {
    return (
      <ScrollView
        testID="screen-login-pending"
        contentContainerStyle={[
          styles.scroll,
          {padding: spacing.lg, backgroundColor: colors.bgApp},
        ]}
        keyboardShouldPersistTaps="handled">
        <Card>
          <Text variant="title" style={{marginBottom: spacing.sm}}>
            {t('inscription.payment.title')}
          </Text>
          <Text
            variant="body"
            color="secondary"
            style={{marginBottom: spacing.lg}}>
            {t('inscription.payment.subtitle')}
          </Text>
          <Button
            label={t('inscription.payment.pay')}
            onPress={() => navigation.navigate('RegisterBrowser', {mode: 'resume'})}
            testID="login-pending-pay"
          />
        </Card>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, {backgroundColor: colors.bgApp}]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        testID="screen-login"
        contentContainerStyle={[styles.scroll, {padding: spacing.lg}]}
        keyboardShouldPersistTaps="handled">
        <Text variant="overline" color="muted" style={{marginBottom: spacing.xs}}>
          {t('connexion.eyebrow')}
        </Text>
        <Text variant="title" style={{marginBottom: spacing.sm}}>
          {t('connexion.heading')}
        </Text>
        <Text
          variant="body"
          color="secondary"
          style={{marginBottom: spacing.lg}}>
          {t('connexion.subtitle')}
        </Text>

        <TextField
          label={t('connexion.idLabel')}
          value={identifiant}
          onChangeText={text => {
            setIdentifiant(text);
            setIdError(false);
          }}
          placeholder={t('connexion.idPlaceholder')}
          error={idError ? t('connexion.idError') : undefined}
          autoComplete="username"
          keyboardType="email-address"
          autoCapitalize="none"
          onSubmitEditing={() => {}}
          disabled={loading}
          testID="login-identifier"
        />

        <View style={{height: spacing.md}} />

        <TextField
          label={t('connexion.passwordLabel')}
          value={motDePasse}
          onChangeText={text => {
            setMotDePasse(text);
            setMdpError(false);
          }}
          placeholder={t('connexion.passwordPlaceholder')}
          error={mdpError ? t('connexion.passwordError') : undefined}
          secure
          showPasswordLabel={t('connexion.showPassword')}
          hidePasswordLabel={t('connexion.showPassword')}
          autoComplete="password"
          onSubmitEditing={onSubmit}
          disabled={loading}
          testID="login-password"
        />

        <View style={{height: spacing.md}} />

        <Pressable
          testID="login-remember"
          onPress={() => setSouvenir(v => !v)}
          disabled={loading}
          accessibilityRole="checkbox"
          accessibilityState={{checked: souvenir}}
          accessibilityLabel={t('connexion.rememberMe')}
          style={[
            styles.rememberRow,
            {minHeight: touch.min, gap: spacing.sm},
          ]}>
          <View
            style={[
              styles.checkbox,
              {
                borderColor: colors.borderLight,
                backgroundColor: souvenir
                  ? colors.bluePrimary
                  : colors.bgSurface,
              },
            ]}
          />
          <Text variant="bodySmall">{t('connexion.rememberMe')}</Text>
        </Pressable>

        <View style={{height: spacing.md}} />

        <Button
          label={loading ? t('connexion.submitting') : t('connexion.submit')}
          onPress={onSubmit}
          loading={loading}
          disabled={loading}
          testID="login-submit"
        />

        {sessionInfo ? (
          <Text
            variant="bodySmall"
            color="secondary"
            style={{marginTop: spacing.md}}
            testID="login-session-info">
            {sessionInfo}
          </Text>
        ) : null}

        {state.error ? (
          <Text
            variant="bodySmall"
            color="error"
            style={{marginTop: spacing.md}}
            testID="login-error">
            {state.error}
          </Text>
        ) : null}

        <Text
          variant="caption"
          color="muted"
          style={{textAlign: 'center', marginVertical: spacing.lg}}>
          ·
        </Text>

        <View style={styles.footerRow}>
          <Text variant="bodySmall" color="secondary">
            {t('connexion.noAccount')}{' '}
          </Text>
          <Pressable
            testID="login-create-account"
            onPress={() => navigation.navigate('RegisterBrowser', {mode: 'new'})}
            accessibilityRole="link"
            accessibilityLabel={t('connexion.createAccount')}
            style={{minHeight: touch.min, justifyContent: 'center'}}>
            <Text variant="bodySmall" color="link">
              {t('connexion.createAccount')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  scroll: {flexGrow: 1},
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderRadius: 4,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
