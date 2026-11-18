/**
 * Accès à un produit acheté dans l'app (lien du vendeur, Marketplace).
 * https uniquement ; cookies non conservés ; pas de nouvelles fenêtres.
 */

import React, {useCallback} from 'react';
import {View} from 'react-native';
import {WebView} from 'react-native-webview';
import {ErrorState, LoadingState, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {HTTPS_ORIGIN_WHITELIST, isAllowedLinkUrl} from '../logic/linkFilter';

export type CommerceLinkScreenProps = {
  url: string;
  onClose?: () => void;
};

export function CommerceLinkScreen({url, onClose}: CommerceLinkScreenProps) {
  const {t} = useTranslation();
  const {colors} = useTheme();
  const onShouldStart = useCallback(
    (req: {url: string}) => isAllowedLinkUrl(req.url),
    [],
  );

  if (!isAllowedLinkUrl(url)) {
    return (
      <View style={{flex: 1, backgroundColor: colors.bgApp}}>
        <ErrorState
          message={t('mp.orders.accessErrors.unknown')}
          retryLabel={t('common.close')}
          onRetry={onClose ?? (() => undefined)}
          testID="commerce-link-invalid"
        />
      </View>
    );
  }

  return (
    <View style={{flex: 1, backgroundColor: colors.bgApp}} testID="screen-commerce-link">
      <WebView
        source={{uri: url}}
        originWhitelist={HTTPS_ORIGIN_WHITELIST}
        mixedContentMode="never"
        javaScriptEnabled
        incognito
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={onShouldStart}
        startInLoadingState
        renderLoading={() => <LoadingState accessibilityLabel={t('content.loading')} />}
      />
    </View>
  );
}
