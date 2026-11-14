/**
 * Pile ShopStack — placeholder jusqu'à l'étape dédiée.
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from '@shared/i18n';
import {PlaceholderScreen} from '../PlaceholderScreen';

const Stack = createNativeStackNavigator();

export function ShopStack() {
  const {t} = useTranslation();
  return (
    <Stack.Navigator screenOptions={{headerShown: true, title: t('houses.shop')}}>
      <Stack.Screen
        name="Home"
        children={() => (
          <PlaceholderScreen titleKey="houses.shop" testID="screen-shop" />
        )}
      />
    </Stack.Navigator>
  );
}
