/**
 * Navigateur d'inscription (WebView). Aucun import @core/api|network|config.
 * Toute la logique passe par registerBrowserStore.
 */

import React, {useCallback, useEffect, useRef, useSyncExternalStore} from 'react';
import {
  Alert,
  BackHandler,
  StyleSheet,
  View,
} from 'react-native';
import {WebView, type WebViewNavigation} from 'react-native-webview';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  ErrorState,
  LoadingState,
  useTheme,
} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {registerBrowserStore} from '../store/registerBrowserStore';
import type {AuthStackParamList} from '@app/navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'RegisterBrowser'>;

export function RegisterBrowserScreen({navigation, route}: Props) {
  const {t} = useTranslation();
  const {colors} = useTheme();
  const mode = route.params?.mode ?? 'new';
  const webRef = useRef<WebView>(null);
  const canGoBackRef = useRef(false);

  const state = useSyncExternalStore(
    registerBrowserStore.subscribe,
    registerBrowserStore.getState,
    registerBrowserStore.getState,
  );

  useEffect(() => {
    void registerBrowserStore.prepare(mode);
    return () => {
      registerBrowserStore.reset();
    };
  }, [mode]);

  useEffect(() => {
    if (state.done) {
      const prefill = registerBrowserStore.consumePrefill();
      navigation.navigate('Login', {prefillIdentifiant: prefill || undefined});
    }
  }, [state.done, navigation]);

  const confirmLeave = useCallback(() => {
    Alert.alert(
      t('app.register.leaveTitle'),
      t('app.register.leaveMessage'),
      [
        {text: t('app.register.leaveStay'), style: 'cancel'},
        {
          text: t('app.register.leaveConfirm'),
          style: 'destructive',
          onPress: () => navigation.navigate('Login', {}),
        },
      ],
    );
  }, [navigation, t]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBackRef.current && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      confirmLeave();
      return true;
    });
    return () => sub.remove();
  }, [confirmLeave]);

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', e => {
      if (state.done) {
        return;
      }
      if (e.data.action.type === 'GO_BACK' || e.data.action.type === 'POP') {
        e.preventDefault();
        confirmLeave();
      }
    });
    return unsub;
  }, [navigation, confirmLeave, state.done]);

  const onShouldStart = useCallback((req: {url: string}): boolean => {
    return registerBrowserStore.handleShouldStart(req.url);
  }, []);

  const onMessage = useCallback(
    (event: {nativeEvent: {data: string; url?: string}}) => {
      const origin = event.nativeEvent.url ?? state.startUrl;
      registerBrowserStore.handleMessage(event.nativeEvent.data, origin);
    },
    [state.startUrl],
  );

  const onNavChange = useCallback((nav: WebViewNavigation) => {
    canGoBackRef.current = nav.canGoBack;
  }, []);

  const loadingLabel = t('app.register.loading');

  if (!state.startUrl) {
    return (
      <View style={[styles.fill, {backgroundColor: colors.bgApp}]}>
        <LoadingState accessibilityLabel={loadingLabel} fill />
      </View>
    );
  }

  return (
    <View style={[styles.fill, {backgroundColor: colors.bgApp}]}>
      {state.status === 'loading' ? (
        <View style={styles.overlay} pointerEvents="none">
          <LoadingState accessibilityLabel={loadingLabel} fill />
        </View>
      ) : null}

      {state.status === 'error' ? (
        <View style={styles.overlay}>
          <ErrorState
            title={t('app.register.loadErrorTitle')}
            message={t('app.register.loadErrorMessage')}
            retryLabel={t('app.register.retry')}
            onRetry={() => {
              registerBrowserStore.retry();
              webRef.current?.reload();
            }}
            testID="register-retry"
          />
        </View>
      ) : null}

      <WebView
        ref={webRef}
        testID="register-webview"
        source={{uri: state.startUrl}}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows
        originWhitelist={state.originWhitelist}
        mixedContentMode="never"
        allowFileAccess={false}
        allowsInlineMediaPlayback
        onShouldStartLoadWithRequest={onShouldStart}
        onOpenWindow={synthetic => {
          const url = synthetic.nativeEvent.targetUrl;
          if (url) {
            registerBrowserStore.handleShouldStart(url);
          }
        }}
        onMessage={onMessage}
        onNavigationStateChange={onNavChange}
        onLoadEnd={() => registerBrowserStore.markReady()}
        onError={() => registerBrowserStore.markError()}
        onHttpError={() => registerBrowserStore.markError()}
        injectedJavaScriptBeforeContentLoaded={
          registerBrowserStore.consumeInjectedScript() ?? undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1},
  webview: {flex: 1},
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});
