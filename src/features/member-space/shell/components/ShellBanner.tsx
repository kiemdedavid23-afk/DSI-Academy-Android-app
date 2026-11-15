/**
 * Branche la bannière in-app (design system, pure) sur bannerStore.
 * Le store garde des clés i18n : la traduction se fait ici, au rendu.
 */

import React, {useCallback, useMemo, useSyncExternalStore} from 'react';
import {InAppBanner, type InAppBannerData} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {bannerStore} from '@shared/store';

type Props = {
  topOffset?: number;
};

export function ShellBanner({topOffset = 0}: Props) {
  const {t} = useTranslation();
  const payload = useSyncExternalStore(
    bannerStore.subscribe,
    bannerStore.get,
    bannerStore.get,
  );

  const banner = useMemo<InAppBannerData | null>(
    () =>
      payload
        ? {
            id: payload.id,
            tone: payload.tone,
            title: payload.titleText ?? (payload.titleKey ? t(payload.titleKey) : ''),
            message:
              payload.messageText ??
              (payload.messageKey ? t(payload.messageKey) : ''),
            dismissible: payload.dismissible,
            autoHideMs: payload.autoHideMs,
          }
        : null,
    [payload, t],
  );

  const onDismiss = useCallback((id: string) => bannerStore.dismiss(id), []);

  return (
    <InAppBanner
      banner={banner}
      onDismiss={onDismiss}
      dismissLabel={t('common.close')}
      topOffset={topOffset}
    />
  );
}
