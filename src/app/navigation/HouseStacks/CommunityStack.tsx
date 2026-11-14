/**
 * Pile CommunityStack — placeholder jusqu'à l'étape dédiée.
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from '@shared/i18n';
import {PlaceholderScreen} from '../PlaceholderScreen';

const Stack = createNativeStackNavigator();

export function CommunityStack() {
  const {t} = useTranslation();
  return (
    <Stack.Navigator screenOptions={{headerShown: true, title: t('houses.community')}}>
      <Stack.Screen
        name="Home"
        children={() => (
          <PlaceholderScreen titleKey="houses.community" testID="screen-community" />
        )}
      />
    </Stack.Navigator>
  );
}
