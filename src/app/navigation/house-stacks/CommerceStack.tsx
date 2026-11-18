/**
 * Pile commune Boutique + Marketplace (L8b) : catalogue → fiche, et favoris.
 * Une seule pile pour les deux maisons (décision D2) ; seule la source change.
 * Les écrans ne connaissent pas la navigation : elle est branchée ici.
 */

import React from 'react';
import {Pressable} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {Icon, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {CommerceDiscoverScreen} from '@features/commerce/screens/CommerceDiscoverScreen';
import {CommerceFavoritesScreen} from '@features/commerce/screens/CommerceFavoritesScreen';
import {CommerceProductScreen} from '@features/commerce/screens/CommerceProductScreen';
import type {
  CommerceProduct,
  CommerceSource,
} from '@features/commerce/store/commerceTypes';

export type CommerceStackParamList = {
  Discover: undefined;
  Product: {id: string; product?: CommerceProduct};
  Favorites: undefined;
};

const Stack = createNativeStackNavigator<CommerceStackParamList>();

export function CommerceStack({source}: {source: CommerceSource}) {
  const {t} = useTranslation();
  const {colors, touch} = useTheme();

  return (
    <Stack.Navigator screenOptions={{headerShown: true}}>
      <Stack.Screen
        name="Discover"
        options={({navigation}) => ({
          title: t(source === 'shop' ? 'houses.shop' : 'houses.marketplace'),
          headerRight: () => (
            <Pressable
              onPress={() => navigation.navigate('Favorites')}
              accessibilityRole="button"
              accessibilityLabel={t('commerce.favorites')}
              testID={`${source}-open-favorites`}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: touch.min,
                minWidth: touch.min,
              }}>
              <Icon name="BookmarkIcon" size={22} color={colors.textPrimary} />
            </Pressable>
          ),
        })}>
        {({navigation}) => (
          <CommerceDiscoverScreen
            source={source}
            onOpenProduct={product =>
              navigation.navigate('Product', {id: product.id, product})
            }
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Product" options={{title: t('app.catalogue.detailTitle')}}>
        {({route}) => (
          <CommerceProductScreen
            source={source}
            id={route.params.id}
            seed={route.params.product ?? null}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Favorites" options={{title: t('commerce.favorites')}}>
        {({navigation}) => (
          <CommerceFavoritesScreen
            source={source}
            onOpenProduct={product =>
              navigation.navigate('Product', {id: product.id, product})
            }
            onDiscover={() => navigation.navigate('Discover')}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
