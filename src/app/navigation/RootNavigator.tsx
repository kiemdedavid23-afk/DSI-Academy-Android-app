/**
 * Racine de navigation (R-NAV-1) : AuthStack ou MemberTabs selon la session.
 * Aucun appel réseau.
 * Hors session, la bannière de notification est montée ici (l'espace membre
 * a la sienne dans son shell) : les messages du Worker s'affichent aussi sur
 * l'écran de connexion. 56 = hauteur de l'en-tête natif.
 */

import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {useHasSession} from '@core/session';
import {AuthStack} from './AuthStack';
import {MemberTabs} from './MemberTabs';
import {linking} from './linking';
import {ShellBanner} from '@features/member-space/shell/components/ShellBanner';

export function RootNavigator() {
  const hasSession = useHasSession();

  return (
    <SafeAreaProvider>
      <NavigationContainer linking={linking}>
        {hasSession ? <MemberTabs /> : <AuthStack />}
      </NavigationContainer>
      {hasSession ? null : <ShellBanner topOffset={56} />}
    </SafeAreaProvider>
  );
}
