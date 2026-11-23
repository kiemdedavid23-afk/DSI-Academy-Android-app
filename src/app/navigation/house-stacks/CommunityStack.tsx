/**
 * Pile Communauté. Les écrans ne connaissent pas la navigation : elle est
 * branchée ici. Lots livrés : accueil, trouver un membre, fiche membre,
 * contacts (C3), discussions, discussion, nouveau groupe (C4), espaces, espace,
 * nouvel espace et fil d'activité (C5), notifications, Support DSI et
 * réglages (C6). La création du
 * profil se fait dans l'espace membre.
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from '@shared/i18n';
import {CommunityActivityScreen} from '@features/community/screens/CommunityActivityScreen';
import {CommunityChatScreen} from '@features/community/screens/CommunityChatScreen';
import {CommunityChatsScreen} from '@features/community/screens/CommunityChatsScreen';
import {CommunityContactsScreen} from '@features/community/screens/CommunityContactsScreen';
import {CommunityCreateSpaceScreen} from '@features/community/screens/CommunityCreateSpaceScreen';
import {CommunityFindMemberScreen} from '@features/community/screens/CommunityFindMemberScreen';
import {CommunityHomeScreen} from '@features/community/screens/CommunityHomeScreen';
import {CommunityNotificationsScreen} from '@features/community/screens/CommunityNotificationsScreen';
import {CommunityMemberScreen} from '@features/community/screens/CommunityMemberScreen';
import {CommunityNewGroupScreen} from '@features/community/screens/CommunityNewGroupScreen';
import {CommunitySettingsScreen} from '@features/community/screens/CommunitySettingsScreen';
import {CommunitySpaceScreen} from '@features/community/screens/CommunitySpaceScreen';
import {CommunitySpacesScreen} from '@features/community/screens/CommunitySpacesScreen';
import {CommunitySupportScreen} from '@features/community/screens/CommunitySupportScreen';

export type CommunityStackParamList = {
  Home: undefined;
  Chats: undefined;
  /** `title` : nom affiché du pair, titre du groupe ou nom de l'espace, connu de l'écran appelant. */
  Chat: {id: string; title: string; type: 'direct' | 'group' | 'space'};
  NewGroup: undefined;
  Spaces: undefined;
  Space: {id: string};
  NewSpace: undefined;
  Activity: undefined;
  Notifications: undefined;
  Support: undefined;
  Settings: undefined;
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
              onOpenSpaces={() => navigation.navigate('Spaces')}
              onOpenActivity={() => navigation.navigate('Activity')}
              onOpenNotifications={() => navigation.navigate('Notifications')}
              onOpenSupport={() => navigation.navigate('Support')}
              onOpenSettings={() => navigation.navigate('Settings')}
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
              isGroup={route.params.type !== 'direct'}
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
      <Stack.Screen name="Spaces" options={{title: t('communityApp.titles.spaces')}}>
        {({navigation}) => {
          const parent = navigation.getParent();
          return (
            <CommunitySpacesScreen
              onOpenSpace={id => navigation.navigate('Space', {id})}
              onCreateSpace={() => navigation.navigate('NewSpace')}
              onOpenProfile={() => parent?.navigate('MemberSpace', {screen: 'MemberProfile'})}
              onOpenSubscription={() =>
                parent?.navigate('MemberSpace', {screen: 'MemberSubscription'})
              }
            />
          );
        }}
      </Stack.Screen>
      <Stack.Screen name="Space" options={{title: t('communityApp.titles.space')}}>
        {({route, navigation}) => {
          const parent = navigation.getParent();
          return (
            <CommunitySpaceScreen
              spaceId={route.params.id}
              onOpenChat={(id, title) => navigation.navigate('Chat', {id, title, type: 'space'})}
              onOpenProfile={() => parent?.navigate('MemberSpace', {screen: 'MemberProfile'})}
              onOpenSubscription={() =>
                parent?.navigate('MemberSpace', {screen: 'MemberSubscription'})
              }
            />
          );
        }}
      </Stack.Screen>
      <Stack.Screen name="NewSpace" options={{title: t('communityApp.titles.newSpace')}}>
        {({navigation}) => {
          const parent = navigation.getParent();
          return (
            <CommunityCreateSpaceScreen
              // L'espace remplace l'écran de création : retour = liste des espaces.
              onCreated={id => navigation.replace('Space', {id})}
              onOpenProfile={() => parent?.navigate('MemberSpace', {screen: 'MemberProfile'})}
              onOpenSubscription={() =>
                parent?.navigate('MemberSpace', {screen: 'MemberSubscription'})
              }
            />
          );
        }}
      </Stack.Screen>
      <Stack.Screen name="Activity" options={{title: t('communityApp.titles.activity')}}>
        {({navigation}) => {
          const parent = navigation.getParent();
          return (
            <CommunityActivityScreen
              onOpenProfile={() => parent?.navigate('MemberSpace', {screen: 'MemberProfile'})}
              onOpenSubscription={() =>
                parent?.navigate('MemberSpace', {screen: 'MemberSubscription'})
              }
            />
          );
        }}
      </Stack.Screen>
      <Stack.Screen name="Notifications" options={{title: t('communityApp.titles.notifications')}}>
        {({navigation}) => {
          const parent = navigation.getParent();
          return (
            <CommunityNotificationsScreen
              onOpenChat={(id, title, type) => navigation.navigate('Chat', {id, title, type})}
              onOpenSupport={() => navigation.navigate('Support')}
              onOpenProfile={() => parent?.navigate('MemberSpace', {screen: 'MemberProfile'})}
              onOpenSubscription={() =>
                parent?.navigate('MemberSpace', {screen: 'MemberSubscription'})
              }
            />
          );
        }}
      </Stack.Screen>
      <Stack.Screen name="Support" options={{title: t('communityApp.titles.support')}}>
        {({navigation}) => {
          const parent = navigation.getParent();
          return (
            <CommunitySupportScreen
              onOpenProfile={() => parent?.navigate('MemberSpace', {screen: 'MemberProfile'})}
              onOpenSubscription={() =>
                parent?.navigate('MemberSpace', {screen: 'MemberSubscription'})
              }
            />
          );
        }}
      </Stack.Screen>
      <Stack.Screen name="Settings" options={{title: t('communityApp.titles.settings')}}>
        {({navigation}) => {
          const parent = navigation.getParent();
          return (
            <CommunitySettingsScreen
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
