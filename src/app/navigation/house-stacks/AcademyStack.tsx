/**
 * Pile Académie (L4d) : hub → Bibliothèque (découverte) → fiche détail.
 * Les écrans ne connaissent pas la navigation : elle est branchée ici.
 */

import React, {useCallback} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from '@shared/i18n';
import {AcademyHubScreen} from '@features/academy/screens/AcademyHubScreen';
import {LibraryDiscoverScreen} from '@features/content/screens/LibraryDiscoverScreen';
import {TextReaderScreen} from '@features/content/screens/TextReaderScreen';
import {FormationScreen} from '@features/content/screens/FormationScreen';
import {formationStore} from '@features/content/store/formationStore';
import {PlayerScreen} from '@features/content/screens/PlayerScreen';
import type {DiscoverHouse} from '@features/content/store/houseStores';
import {ContentDetailScreen} from '@features/content/screens/ContentDetailScreen';

export type AcademyStackParamList = {
  AcademyHub: undefined;
  LibraryDiscover: {house?: DiscoverHouse} | undefined;
  ContentDetail: {id: number};
  Reader: {id: number; title: string};
  Formation: {id: number; title: string};
  Player: {id: number; title: string; thumbnailUrl: string | null};
};

/** Au retour d'un module, la progression de la formation est relue. */
function FormationRoute(props: React.ComponentProps<typeof FormationScreen>) {
  useFocusEffect(
    useCallback(() => {
      void formationStore.refreshProgress();
    }, []),
  );
  return <FormationScreen {...props} />;
}

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
              if (house === 'library' || house === 'audio' || house === 'videos' || house === 'formations') {
                navigation.navigate('LibraryDiscover', {house});
              }
            }}
            onContinue={id => navigation.navigate('ContentDetail', {id})}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="LibraryDiscover"
        options={({route}) => ({
          title: t(`houses.${route.params?.house ?? 'library'}`),
        })}>
        {({route, navigation}) => (
          <LibraryDiscoverScreen
            house={route.params?.house}
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
            onRead={(id, title, type, thumbnailUrl) =>
              type === 'training'
                ? navigation.navigate('Formation', {id, title})
                : type === 'audio' || type === 'video'
                ? navigation.navigate('Player', {id, title, thumbnailUrl: thumbnailUrl ?? null})
                : navigation.navigate('Reader', {id, title})
            }
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
      <Stack.Screen
        name="Formation"
        options={({route}) => ({title: route.params.title})}>
        {({route, navigation}) => (
          <FormationRoute
            id={route.params.id}
            title={route.params.title}
            onOpenModule={m =>
              m.type === 'book'
                ? navigation.navigate('Reader', {id: m.contentId, title: m.title})
                : navigation.navigate('Player', {id: m.contentId, title: m.title, thumbnailUrl: null})
            }
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Player"
        options={({route}) => ({title: route.params.title})}>
        {({route}) => (
          <PlayerScreen
            id={route.params.id}
            title={route.params.title}
            thumbnailUrl={route.params.thumbnailUrl}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
