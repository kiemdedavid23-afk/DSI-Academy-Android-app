/**
 * Pile Académie (L4d) : hub → Bibliothèque (découverte) → fiche détail.
 * Les écrans ne connaissent pas la navigation : elle est branchée ici.
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from '@shared/i18n';
import {AcademyHubScreen} from '@features/academy/screens/AcademyHubScreen';
import {LibraryDiscoverScreen} from '@features/content/screens/LibraryDiscoverScreen';
import {ContentDetailScreen} from '@features/content/screens/ContentDetailScreen';

export type AcademyStackParamList = {
  AcademyHub: undefined;
  LibraryDiscover: undefined;
  ContentDetail: {id: number};
};

const Stack = createNativeStackNavigator<AcademyStackParamList>();

export function AcademyStack() {
  const {t} = useTranslation();
  return (
    <Stack.Navigator screenOptions={{headerShown: true}}>
      <Stack.Screen
        name="AcademyHub"
        options={{title: t('houses.academy')}}>
        {({navigation}) => (
          <AcademyHubScreen
            onOpenHouse={house => {
              if (house === 'library') {
                navigation.navigate('LibraryDiscover');
              }
            }}
            onContinue={id => navigation.navigate('ContentDetail', {id})}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="LibraryDiscover"
        options={{title: t('houses.library')}}>
        {({navigation}) => (
          <LibraryDiscoverScreen
            onOpenItem={item => navigation.navigate('ContentDetail', {id: item.id})}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="ContentDetail"
        options={{title: t('app.catalogue.detailTitle')}}>
        {({route}) => <ContentDetailScreen id={route.params.id} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
