/**
 * Pile authentification (R-NAV-2).
 * Login réel (L1a) ; RegisterBrowser reste un placeholder jusqu'à L1b.
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from '@shared/i18n';
import {LoginScreen} from '@features/auth/login/screens/LoginScreen';
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
        component={LoginScreen}
        options={{title: t('connexion.title')}}
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
