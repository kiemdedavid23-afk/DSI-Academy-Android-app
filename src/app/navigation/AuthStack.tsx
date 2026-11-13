/**
 * Pile authentification (R-NAV-2).
 * Connexion et inscription (placeholder navigateur) : écrans vides pour L0d.
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from '@shared/i18n';
import {PlaceholderScreen} from './PlaceholderScreen';

export type AuthStackParamList = {
  Login: undefined;
  RegisterBrowser: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  const {t} = useTranslation();

  return (
    <Stack.Navigator screenOptions={{headerShown: true}}>
      <Stack.Screen
        name="Login"
        options={{title: t('connexion.title')}}
        children={() => (
          <PlaceholderScreen titleKey="connexion.title" testID="screen-login" />
        )}
      />
      <Stack.Screen
        name="RegisterBrowser"
        options={{title: t('inscription.title')}}
        children={() => (
          <PlaceholderScreen
            titleKey="inscription.title"
            testID="screen-register"
          />
        )}
      />
    </Stack.Navigator>
  );
}
