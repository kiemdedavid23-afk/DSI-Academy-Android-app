/**
 * Pile authentification (R-NAV-2).
 * Login (L1a) + navigateur d'inscription (L1b).
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from '@shared/i18n';
import {LoginScreen} from '@features/auth/login/screens/LoginScreen';
import {RegisterBrowserScreen} from '@features/auth/registration-browser/screens/RegisterBrowserScreen';

export type AuthStackParamList = {
  Login: {prefillIdentifiant?: string} | undefined;
  RegisterBrowser: {mode?: 'new' | 'resume'} | undefined;
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
        component={RegisterBrowserScreen}
        options={{title: t('app.register.title')}}
      />
    </Stack.Navigator>
  );
}
