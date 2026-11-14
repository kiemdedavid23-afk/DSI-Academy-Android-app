/**
 * Pile MarketplaceStack — placeholder jusqu'à l'étape dédiée.
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from '@shared/i18n';
import {PlaceholderScreen} from '../PlaceholderScreen';

const Stack = createNativeStackNavigator();

export function MarketplaceStack() {
  const {t} = useTranslation();
  return (
    <Stack.Navigator screenOptions={{headerShown: true, title: t('houses.marketplace')}}>
      <Stack.Screen
        name="Home"
        children={() => (
          <PlaceholderScreen titleKey="houses.marketplace" testID="screen-marketplace" />
        )}
      />
    </Stack.Navigator>
  );
}
