/**
 * Pile Académie (L4d) : hub → Bibliothèque (découverte) → fiche détail.
 * Les écrans ne connaissent pas la navigation : elle est branchée ici.
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from '@shared/i18n';
import {AcademyHubScreen} from '@features/academy/screens/AcademyHubScreen';
import {LibraryDiscoverScreen} from '@features/content/screens/LibraryDiscoverScreen';
import {TextReaderScreen} from '@features/content/screens/TextReaderScreen';
import {ContentDetailScreen} from '@features/content/screens/ContentDetailScreen';

export type AcademyStackParamList = {
  AcademyHub: undefined;
  LibraryDiscover: undefined;
  ContentDetail: {id: number};
  Reader: {id: number; title: string};
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
        {({route, navigation}) => (
          <ContentDetailScreen
            id={route.params.id}
            onRead={(id, title) => navigation.navigate('Reader', {id, title})}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Reader"
        options={({route}) => ({title: route.params.title})}>
        {({route}) => (
          <TextReaderScreen id={route.params.id} title={route.params.title} />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
