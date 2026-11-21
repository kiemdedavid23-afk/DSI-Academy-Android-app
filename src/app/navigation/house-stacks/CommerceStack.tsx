/**
 * Pile commune Boutique + Marketplace : catalogue → fiche, favoris, mes achats,
 * accès au produit acheté. Une seule pile pour les deux maisons (décision D2) ;
 * seule la source change. Les écrans ne connaissent pas la navigation : elle
 * est branchée ici.
 */

import React from 'react';
import {Linking} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from '@shared/i18n';
import {MemberHeader} from '@features/member-space/shell/components/MemberHeader';
import {MarketplaceProductExtras} from '@features/commerce/components/MarketplaceProductExtras';
import {CartAction} from '@features/commerce/components/CartAction';
import {PurchaseAction} from '@features/commerce/components/PurchaseAction';
import {
  CommerceHouseScreen,
  type CommerceHouseRequest,
} from '@features/commerce/screens/CommerceHouseScreen';
import {CommerceLinkScreen} from '@features/commerce/screens/CommerceLinkScreen';
import {CommerceProductScreen} from '@features/commerce/screens/CommerceProductScreen';
import {MarketplaceSellerScreen} from '@features/commerce/screens/MarketplaceSellerScreen';
import {SellerSpaceScreen} from '@features/commerce/seller/screens/SellerSpaceScreen';
import {ShopCartScreen} from '@features/commerce/screens/ShopCartScreen';
import {ShopLibraryScreen} from '@features/commerce/screens/ShopLibraryScreen';
import type {
  CommerceAccess,
  CommerceProduct,
  CommerceSource,
  MarketplaceSeller,
} from '@features/commerce/store/commerceTypes';

export type CommerceStackParamList = {
  /** Coque : section (et sous-onglet de Mes achats) à afficher. */
  Discover: CommerceHouseRequest | undefined;
  Product: {id: string; product?: CommerceProduct};
  Cart: undefined;
  Library: undefined;
  Seller: {memberId: string; seller?: MarketplaceSeller};
  Link: {url: string};
  /** Espace vendeur : plein écran, sa propre navigation (Marketplace seulement). */
  SellerSpace: undefined;
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

  return (
    <Stack.Navigator screenOptions={{headerShown: true}}>
      <Stack.Screen
        name="Discover"
        options={({navigation}) => ({
          title: t(source === 'shop' ? 'houses.shop' : 'houses.marketplace'),
          header: () => (
            <MemberHeader
              showMenu={false}
              bellFirst
              welcomeKey={source === 'shop' ? 'houses.welcome.shop' : 'houses.welcome.marketplace'}
              onOpenDrawer={() => {}}
              onOpenNotifications={() =>
                navigation.getParent()?.navigate('MemberSpace', {screen: 'MemberNotifications'})
              }
            />
          ),
        })}>
        {({route, navigation}) => (
          <CommerceHouseScreen
            source={source}
            request={route.params}
            onOpenProduct={product =>
              navigation.navigate('Product', {id: product.id, product})
            }
            onOpenAccess={access =>
              openAccess(access, url => navigation.navigate('Link', {url}))
            }
            onOpenSeller={
              source === 'marketplace'
                ? seller => navigation.navigate('Seller', {memberId: seller.memberId, seller})
                : undefined
            }
            onOpenSellerSpace={
              source === 'marketplace' ? () => navigation.navigate('SellerSpace') : undefined
            }
            onOpenCart={source === 'shop' ? () => navigation.navigate('Cart') : undefined}
            onOpenLibrary={source === 'shop' ? () => navigation.navigate('Library') : undefined}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Product" options={{title: t('app.catalogue.detailTitle')}}>
        {({route, navigation}) => (
          <CommerceProductScreen
            source={source}
            id={route.params.id}
            seed={route.params.product ?? null}
            // Boutique : l'achat passe par le panier (L8d). Marketplace : barre d'achat fixe.
            renderAction={
              source === 'shop'
                ? product => (
                    <CartAction
                      product={product}
                      onOpenCart={() => navigation.navigate('Cart')}
                    />
                  )
                : product => (
                    <MarketplaceProductExtras
                      product={product}
                      onOpenSeller={memberId => navigation.navigate('Seller', {memberId})}
                      onOpenProduct={p => navigation.push('Product', {id: p.id, product: p})}
                    />
                  )
            }
            renderBar={
              source === 'shop'
                ? undefined
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
                      onOpenPurchases={() => navigation.navigate('Discover', {section: 'purchases'})}
                      onOpenAccess={access =>
                        openAccess(access, url => navigation.navigate('Link', {url}))
                      }
                    />
                  )
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
              onOpenPurchases: () => navigation.navigate('Discover', {section: 'purchases'}),
              onOpenLibrary: () => navigation.navigate('Library'),
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
      <Stack.Screen name="Library" options={{title: t('commerce.library.title')}}>
        {({navigation}) => (
          <ShopLibraryScreen
            onDiscover={() => navigation.navigate('Discover')}
            onOpenAccess={access =>
              openAccess(access, url => navigation.navigate('Link', {url}))
            }
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Seller" options={{title: t('mp.pd.storeTitle')}}>
        {({route, navigation}) => (
          <MarketplaceSellerScreen
            memberId={route.params.memberId}
            seed={route.params.seller ?? null}
            onOpenProduct={product =>
              navigation.navigate('Product', {id: product.id, product})
            }
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="SellerSpace" options={{headerShown: false}}>
        {({navigation}) => (
          <SellerSpaceScreen
            onExit={() => navigation.goBack()}
            onOpenNotifications={() =>
              navigation
                .getParent()
                ?.navigate('MemberSpace', {screen: 'MemberNotifications'})
            }
            onOpenWithdrawals={() =>
              navigation
                .getParent()
                ?.navigate('MemberSpace', {screen: 'MemberWithdrawals'})
            }
            onOpenUrl={url => void Linking.openURL(url)}
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
