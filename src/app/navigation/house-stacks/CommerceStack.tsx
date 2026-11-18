/**
 * Pile commune Boutique + Marketplace : catalogue → fiche, favoris, mes achats,
 * accès au produit acheté. Une seule pile pour les deux maisons (décision D2) ;
 * seule la source change. Les écrans ne connaissent pas la navigation : elle
 * est branchée ici.
 */

import React from 'react';
import {Linking, Pressable, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {Icon, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {CartAction} from '@features/commerce/components/CartAction';
import {PurchaseAction} from '@features/commerce/components/PurchaseAction';
import {CommerceDiscoverScreen} from '@features/commerce/screens/CommerceDiscoverScreen';
import {CommerceFavoritesScreen} from '@features/commerce/screens/CommerceFavoritesScreen';
import {CommerceLinkScreen} from '@features/commerce/screens/CommerceLinkScreen';
import {CommerceProductScreen} from '@features/commerce/screens/CommerceProductScreen';
import {CommercePurchasesScreen} from '@features/commerce/screens/CommercePurchasesScreen';
import {ShopCartScreen} from '@features/commerce/screens/ShopCartScreen';
import type {
  CommerceAccess,
  CommerceProduct,
  CommerceSource,
} from '@features/commerce/store/commerceTypes';

export type CommerceStackParamList = {
  Discover: undefined;
  Product: {id: string; product?: CommerceProduct};
  Favorites: undefined;
  Purchases: undefined;
  Cart: undefined;
  Link: {url: string};
};

const Stack = createNativeStackNavigator<CommerceStackParamList>();

/** Ouvre un produit acheté : lien du vendeur dans l'app, fichier hors de l'app. */
function openAccess(access: CommerceAccess, onWebview: (url: string) => void) {
  if (access.mode === 'webview') {
    onWebview(access.url);
  } else {
    void Linking.openURL(access.url);
  }
}

export function CommerceStack({source}: {source: CommerceSource}) {
  const {t} = useTranslation();
  const {colors, touch} = useTheme();

  const headerButton = (
    label: string,
    icon: 'BookmarkIcon' | 'BagIcon' | 'StoreIcon',
    onPress: () => void,
    testID: string,
  ) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: touch.min,
        minWidth: touch.min,
      }}>
      <Icon name={icon} size={22} color={colors.textPrimary} />
    </Pressable>
  );

  return (
    <Stack.Navigator screenOptions={{headerShown: true}}>
      <Stack.Screen
        name="Discover"
        options={({navigation}) => ({
          title: t(source === 'shop' ? 'houses.shop' : 'houses.marketplace'),
          headerRight: () => (
            <View style={{flexDirection: 'row'}}>
              {source === 'shop'
                ? headerButton(
                    t('commerce.cart.title'),
                    'StoreIcon',
                    () => navigation.navigate('Cart'),
                    'shop-open-cart',
                  )
                : null}
              {headerButton(
                t('mp.member.purchases'),
                'BagIcon',
                () => navigation.navigate('Purchases'),
                `${source}-open-purchases`,
              )}
              {headerButton(
                t('commerce.favorites'),
                'BookmarkIcon',
                () => navigation.navigate('Favorites'),
                `${source}-open-favorites`,
              )}
            </View>
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
        {({route, navigation}) => (
          <CommerceProductScreen
            source={source}
            id={route.params.id}
            seed={route.params.product ?? null}
            // Boutique : l'achat passe par le panier (L8d). Marketplace : achat direct.
            renderAction={
              source === 'shop'
                ? product => (
                    <CartAction
                      product={product}
                      onOpenCart={() => navigation.navigate('Cart')}
                    />
                  )
                : product => (
                    <PurchaseAction
                      source={source}
                      product={product}
                      onOpenDsi={() =>
                        navigation
                          .getParent()
                          ?.navigate('MemberSpace', {screen: 'MemberDsiHoldings'})
                      }
                      onOpenSubscription={() =>
                        navigation
                          .getParent()
                          ?.navigate('MemberSpace', {screen: 'MemberSubscription'})
                      }
                      onOpenPurchases={() => navigation.navigate('Purchases')}
                      onOpenAccess={access =>
                        openAccess(access, url => navigation.navigate('Link', {url}))
                      }
                    />
                  )
            }
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
      <Stack.Screen name="Purchases" options={{title: t('mp.member.purchases')}}>
        {({navigation}) => (
          <CommercePurchasesScreen
            source={source}
            onDiscover={() => navigation.navigate('Discover')}
            onOpenAccess={access =>
                        openAccess(access, url => navigation.navigate('Link', {url}))
                      }
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Cart" options={{title: t('commerce.cart.title')}}>
        {({navigation}) => (
          <ShopCartScreen
            sheet={{
              onOpenDsi: () =>
                navigation
                  .getParent()
                  ?.navigate('MemberSpace', {screen: 'MemberDsiHoldings'}),
              onOpenSubscription: () =>
                navigation
                  .getParent()
                  ?.navigate('MemberSpace', {screen: 'MemberSubscription'}),
              onOpenPurchases: () => navigation.navigate('Purchases'),
              onOpenAccess: access =>
                openAccess(access, url => navigation.navigate('Link', {url})),
            }}
            onDiscover={() => navigation.navigate('Discover')}
            onOpenProduct={product =>
              navigation.navigate('Product', {id: product.id, product})
            }
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Link" options={{title: t('mp.orders.open')}}>
        {({route, navigation}) => (
          <CommerceLinkScreen url={route.params.url} onClose={() => navigation.goBack()} />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
