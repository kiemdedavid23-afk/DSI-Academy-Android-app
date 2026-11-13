/**
 * Racine de navigation (R-NAV-1) : AuthStack ou MemberTabs selon la session.
 * Aucun appel réseau.
 */

import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {useHasSession} from '@core/session';
import {AuthStack} from './AuthStack';
import {MemberTabs} from './MemberTabs';
import {linking} from './linking';

export function RootNavigator() {
  const hasSession = useHasSession();

  return (
    <NavigationContainer linking={linking}>
      {hasSession ? <MemberTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
