import React from 'react';
import {Text, useTheme} from '@shared/designsystem';
import {APP_VERSION} from '@core/config/appInfo';

export function SettingsVersionFooter() {
  const {colors} = useTheme();
  return (
    <Text style={{textAlign: 'center', fontSize: 13, color: colors.textMuted}}>
      DSI Academy · v{APP_VERSION}
    </Text>
  );
}
