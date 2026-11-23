/**
 * Pile Communauté. Les écrans ne connaissent pas la navigation : elle est
 * branchée ici. Lots livrés : accueil, trouver un membre, fiche membre,
 * contacts (C3), discussions, discussion, nouveau groupe (C4). La création du
 * profil se fait dans l'espace membre.
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from '@shared/i18n';
import {CommunityChatScreen} from '@features/community/screens/CommunityChatScreen';
import {CommunityChatsScreen} from '@features/community/screens/CommunityChatsScreen';
import {CommunityContactsScreen} from '@features/community/screens/CommunityContactsScreen';
import {CommunityFindMemberScreen} from '@features/community/screens/CommunityFindMemberScreen';
import {CommunityHomeScreen} from '@features/community/screens/CommunityHomeScreen';
import {CommunityMemberScreen} from '@features/community/screens/CommunityMemberScreen';
import {CommunityNewGroupScreen} from '@features/community/screens/CommunityNewGroupScreen';

export type CommunityStackParamList = {
  Home: undefined;
  Chats: undefined;
  /** `title` : nom affiché du pair ou titre du groupe, connu de l'écran appelant. */
  Chat: {id: string; title: string; type: 'direct' | 'group'};
  NewGroup: undefined;
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
              onOpenChats={() => navigation.navigate('Chats')}
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
      <Stack.Screen name="Chats" options={{title: t('communityApp.titles.chats')}}>
        {({navigation}) => {
          const parent = navigation.getParent();
          return (
            <CommunityChatsScreen
              onOpenChat={(id, title, type) => navigation.navigate('Chat', {id, title, type})}
              onOpenFind={() => navigation.navigate('Find')}
              onNewGroup={() => navigation.navigate('NewGroup')}
              onOpenProfile={() => parent?.navigate('MemberSpace', {screen: 'MemberProfile'})}
              onOpenSubscription={() =>
                parent?.navigate('MemberSpace', {screen: 'MemberSubscription'})
              }
            />
          );
        }}
      </Stack.Screen>
      <Stack.Screen name="Chat" options={({route}) => ({title: route.params.title})}>
        {({route, navigation}) => {
          const parent = navigation.getParent();
          return (
            <CommunityChatScreen
              conversationId={route.params.id}
              isGroup={route.params.type === 'group'}
              onOpenProfile={() => parent?.navigate('MemberSpace', {screen: 'MemberProfile'})}
              onOpenSubscription={() =>
                parent?.navigate('MemberSpace', {screen: 'MemberSubscription'})
              }
            />
          );
        }}
      </Stack.Screen>
      <Stack.Screen name="NewGroup" options={{title: t('communityApp.titles.newGroup')}}>
        {({navigation}) => {
          const parent = navigation.getParent();
          return (
            <CommunityNewGroupScreen
              // Le groupe remplace l'écran de création : retour = liste des discussions.
              onCreated={(id, title) =>
                navigation.replace('Chat', {id, title, type: 'group'})
              }
              onOpenFind={() => navigation.navigate('Find')}
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
              onOpenChat={(id, title) => navigation.navigate('Chat', {id, title, type: 'direct'})}
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
              onOpenChat={(id, title) => navigation.navigate('Chat', {id, title, type: 'direct'})}
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
