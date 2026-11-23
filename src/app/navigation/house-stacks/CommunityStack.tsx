/**
 * Pile Communauté. Les écrans ne connaissent pas la navigation : elle est
 * branchée ici. Lots livrés : accueil, trouver un membre, fiche membre,
 * contacts (C3). La création du profil se fait dans l'espace membre.
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from '@shared/i18n';
import {CommunityContactsScreen} from '@features/community/screens/CommunityContactsScreen';
import {CommunityFindMemberScreen} from '@features/community/screens/CommunityFindMemberScreen';
import {CommunityHomeScreen} from '@features/community/screens/CommunityHomeScreen';
import {CommunityMemberScreen} from '@features/community/screens/CommunityMemberScreen';

export type CommunityStackParamList = {
  Home: undefined;
  Find: undefined;
  Contacts: undefined;
  Member: {ref: string};
};

const Stack = createNativeStackNavigator<CommunityStackParamList>();

export function CommunityStack() {
  const {t} = useTranslation();
  return (
    <Stack.Navigator screenOptions={{headerShown: true}}>
      <Stack.Screen name="Home" options={{title: t('houses.community')}}>
        {({navigation}) => {
          const parent = navigation.getParent();
          return (
            <CommunityHomeScreen
              onOpenFind={() => navigation.navigate('Find')}
              onOpenContacts={() => navigation.navigate('Contacts')}
              onOpenProfile={() => parent?.navigate('MemberSpace', {screen: 'MemberProfile'})}
              onOpenSubscription={() =>
                parent?.navigate('MemberSpace', {screen: 'MemberSubscription'})
              }
            />
          );
        }}
      </Stack.Screen>
      <Stack.Screen name="Find" options={{title: t('communityApp.titles.find')}}>
        {({navigation}) => {
          const parent = navigation.getParent();
          return (
            <CommunityFindMemberScreen
              onOpenMember={ref => navigation.navigate('Member', {ref})}
              onOpenProfile={() => parent?.navigate('MemberSpace', {screen: 'MemberProfile'})}
              onOpenSubscription={() =>
                parent?.navigate('MemberSpace', {screen: 'MemberSubscription'})
              }
            />
          );
        }}
      </Stack.Screen>
      <Stack.Screen name="Contacts" options={{title: t('communityApp.titles.contacts')}}>
        {({navigation}) => {
          const parent = navigation.getParent();
          return (
            <CommunityContactsScreen
              onOpenMember={ref => navigation.navigate('Member', {ref})}
              onOpenFind={() => navigation.navigate('Find')}
              onOpenProfile={() => parent?.navigate('MemberSpace', {screen: 'MemberProfile'})}
              onOpenSubscription={() =>
                parent?.navigate('MemberSpace', {screen: 'MemberSubscription'})
              }
            />
          );
        }}
      </Stack.Screen>
      <Stack.Screen name="Member" options={{title: t('communityApp.titles.member')}}>
        {({route, navigation}) => {
          const parent = navigation.getParent();
          return (
            <CommunityMemberScreen
              memberRef={route.params.ref}
              onOpenProfile={() => parent?.navigate('MemberSpace', {screen: 'MemberProfile'})}
              onOpenSubscription={() =>
                parent?.navigate('MemberSpace', {screen: 'MemberSubscription'})
              }
            />
          );
        }}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
