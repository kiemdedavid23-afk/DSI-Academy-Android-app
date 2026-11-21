/**
 * Espace vendeur : écran plein écran avec sa propre navigation (T5/D19).
 * Bande orange sous la barre d'état, barre du haut, contenu de l'onglet,
 * barre d'onglets propre (la barre principale de l'app est masquée). Retour
 * Android : revient à l'Aperçu, puis quitte l'espace.
 */

import React, {useCallback, useEffect, useState, useSyncExternalStore} from 'react';
import {BackHandler, StatusBar, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {sellerColors} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {memberProfileStore} from '@shared/store';
import {SellerTabBar} from '../components/SellerTabBar';
import type {SellerTabId} from '../components/SellerTabIcon';
import {SellerTopBar} from '../components/SellerTopBar';
import {avatarInitial} from '../logic/sellerFormat';
import {sellerOverviewStore} from '../store/sellerOverviewStore';
import {SellerMoreScreen} from './SellerMoreScreen';
import {SellerOverviewScreen} from './SellerOverviewScreen';
import {SellerSoonScreen} from './SellerSoonScreen';

export type SellerSpaceScreenProps = {
  /** Quitte l'espace vendeur (retour à la Marketplace). */
  onExit: () => void;
  onOpenNotifications: () => void;
  /** Mes retraits (espace membre). */
  onOpenWithdrawals: () => void;
  /** Ouvre un lien https fourni par le Worker (boutique publique). */
  onOpenUrl: (url: string) => void;
};

export function SellerSpaceScreen({
  onExit,
  onOpenNotifications,
  onOpenWithdrawals,
  onOpenUrl,
}: SellerSpaceScreenProps) {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<SellerTabId>('overview');
  const overview = useSyncExternalStore(
    cb => sellerOverviewStore.subscribe(() => cb()),
    sellerOverviewStore.getState,
  );
  const profile = useSyncExternalStore(
    cb => memberProfileStore.subscribe(() => cb()),
    memberProfileStore.getState,
  );

  useEffect(() => {
    void sellerOverviewStore.load();
    void memberProfileStore.load();
  }, []);

  const back = useCallback(() => {
    if (tab !== 'overview') {
      setTab('overview');
    } else {
      onExit();
    }
    return true;
  }, [tab, onExit]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', back);
    return () => sub.remove();
  }, [back]);

  const data = overview.data;
  const firstName = profile.data?.prenom?.trim() || null;
  const header = (
    <SellerTopBar
      storeName={data?.seller.storeName ?? ''}
      logoUrl={data?.seller.logoUrl ?? null}
      completionPercent={data ? data.profileCompletion.percent : null}
      initial={avatarInitial(firstName, data?.seller.storeName)}
      labels={{
        search: t('commerce.sellerSpace.top.search'),
        notifications: t('commerce.sellerSpace.top.notifications'),
        account: t('commerce.sellerSpace.top.account'),
        store: t('commerce.sellerSpace.top.store'),
      }}
      onSearch={() => setTab('products')}
      onNotifications={onOpenNotifications}
      onStore={() => setTab('more')}
      onAccount={() => setTab('more')}
    />
  );

  return (
    <View style={{flex: 1, backgroundColor: sellerColors.bg}} testID="screen-seller-space">
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={{backgroundColor: sellerColors.statusBar, height: insets.top}} />
      <View style={{flex: 1}}>
        {tab === 'overview' ? (
          <SellerOverviewScreen
            header={header}
            overview={data}
            status={overview.status}
            error={overview.error}
            firstName={firstName}
            onRetry={() => void sellerOverviewStore.load({force: true})}
            onCreateProduct={() => setTab('products')}
            onWithdraw={onOpenWithdrawals}
            onOpenStore={onOpenUrl}
          />
        ) : null}
        {tab === 'more' ? (
          <SellerMoreScreen
            header={header}
            onWithdrawals={onOpenWithdrawals}
            onExit={onExit}
          />
        ) : null}
        {tab === 'products' || tab === 'sales' || tab === 'analytics' ? (
          <SellerSoonScreen header={header} tab={tab} />
        ) : null}
      </View>
      <SellerTabBar active={tab} onChange={setTab} />
    </View>
  );
}

