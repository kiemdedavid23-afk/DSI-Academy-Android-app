/**
 * Pile Académie (L4d) : hub → Bibliothèque (découverte) → fiche détail.
 * Les écrans ne connaissent pas la navigation : elle est branchée ici.
 */

import React, {useCallback} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from '@shared/i18n';
import {MemberHeader} from '@features/member-space/shell/components/MemberHeader';
import {AcademyHubScreen} from '@features/academy/screens/AcademyHubScreen';
import {LibraryDiscoverScreen} from '@features/content/screens/LibraryDiscoverScreen';
import {ReaderFrame} from '@features/content/components/ReaderFrame';
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

/** En-tête de marque (icône, DSI Academy, mot d'accueil, cloche, heure). */
function brandHeader(welcomeKey: string, navigation: any) {
  return () => (
    <MemberHeader
      showMenu={false}
      bellFirst
      welcomeKey={welcomeKey}
      onOpenDrawer={() => {}}
      onOpenNotifications={() =>
        navigation.getParent()?.navigate('MemberSpace', {screen: 'MemberNotifications'})
      }
    />
  );
}

export function AcademyStack() {
  const {t} = useTranslation();
  return (
    <Stack.Navigator screenOptions={{headerShown: true}}>
      <Stack.Screen
        name="AcademyHub"
        options={({navigation}) => ({
          title: t('houses.academy'),
          header: brandHeader('houses.welcome.academy', navigation),
        })}>
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
        options={({route, navigation}) => ({
          title: t(`houses.${route.params?.house ?? 'library'}`),
          header: brandHeader(
            `houses.welcome.${route.params?.house ?? 'library'}`,
            navigation,
          ),
        })}>
        {({route, navigation}) => (
          <LibraryDiscoverScreen
            key={route.params?.house ?? 'library'}
            house={route.params?.house}
            onOpenItem={item => navigation.navigate('ContentDetail', {id: item.id})}
            onOpenId={id => navigation.navigate('ContentDetail', {id})}
            onSwitchHouse={house => navigation.replace('LibraryDiscover', {house})}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="ContentDetail"
        options={{title: t('app.catalogue.detailTitle')}}>
        {({route, navigation}) => (
          <ContentDetailScreen
            id={route.params.id}
            onBack={() => navigation.goBack()}
            onOpenItem={item => navigation.replace('ContentDetail', {id: item.id})}
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
        options={({route}) => ({title: route.params.title, headerShown: false})}>
        {({route, navigation}) => (
          <ReaderFrame title={route.params.title} onBack={() => navigation.goBack()}>
            <TextReaderScreen id={route.params.id} title={route.params.title} />
          </ReaderFrame>
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
        options={({route}) => ({title: route.params.title, headerShown: false})}>
        {({route, navigation}) => (
          <PlayerScreen
            id={route.params.id}
            title={route.params.title}
            thumbnailUrl={route.params.thumbnailUrl}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
