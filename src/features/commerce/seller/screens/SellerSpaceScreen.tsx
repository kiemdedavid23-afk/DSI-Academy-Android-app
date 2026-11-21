/**
 * Espace vendeur : écran plein écran avec sa propre navigation (T5/D19).
 * Bande orange sous la barre d'état, barre du haut, contenu de l'onglet,
 * barre d'onglets propre (la barre principale de l'app est masquée). Retour
 * Android : revient à l'Aperçu, puis quitte l'espace.
 */

import React, {useCallback, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {BackHandler, StatusBar, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSellerColors} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {memberProfileStore} from '@shared/store';
import {SellerTabBar} from '../components/SellerTabBar';
import type {SellerTabId} from '../components/SellerTabIcon';
import {SellerTopBar} from '../components/SellerTopBar';
import {avatarInitial} from '../logic/sellerFormat';
import {memberFullName, type MoreAction, type MoreView} from '../logic/sellerMore';
import {sellerOverviewStore} from '../store/sellerOverviewStore';
import {SellerAnalyticsScreen} from './SellerAnalyticsScreen';
import {SellerEarningsScreen} from './SellerEarningsScreen';
import {SellerMoreScreen} from './SellerMoreScreen';
import {SellerOverviewScreen} from './SellerOverviewScreen';
import {SellerProductsScreen} from './SellerProductsScreen';
import {SellerProfileScreen} from './SellerProfileScreen';
import {SellerProductWizard} from './SellerProductWizard';
import {SellerReviewsScreen} from './SellerReviewsScreen';
import {SellerSalesScreen} from './SellerSalesScreen';

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
  const sellerColors = useSellerColors();
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<SellerTabId>('overview');
  /** Création (`new`) ou modification (identifiant) d'un produit ; null = liste. */
  const [wizard, setWizard] = useState<{editId: string | null} | null>(null);
  /** Sous-écran de l'onglet Plus (profil, avis, gains) ; null = le menu. */
  const [moreView, setMoreView] = useState<MoreView | null>(null);
  const wizardBack = useRef<(() => boolean) | null>(null);
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
    if (wizard) {
      if (wizardBack.current) {
        return wizardBack.current();
      }
      setWizard(null);
      return true;
    }
    if (tab === 'more' && moreView) {
      setMoreView(null);
      return true;
    }
    if (tab !== 'overview') {
      setTab('overview');
    } else {
      onExit();
    }
    return true;
  }, [tab, wizard, moreView, onExit]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', back);
    return () => sub.remove();
  }, [back]);

  const data = overview.data;
  const firstName = profile.data?.prenom?.trim() || null;
  const initial = avatarInitial(firstName, data?.seller.storeName);

  const openTab = (id: SellerTabId) => {
    setWizard(null);
    setMoreView(null);
    setTab(id);
  };
  const onMoreAction = (action: MoreAction) => {
    if (action.kind === 'tab') {
      openTab(action.tab);
    } else if (action.kind === 'view') {
      setMoreView(action.view);
    } else {
      onOpenWithdrawals();
    }
  };
  const header = (
    <SellerTopBar
      storeName={data?.seller.storeName ?? ''}
      logoUrl={data?.seller.logoUrl ?? null}
      completionPercent={data ? data.profileCompletion.percent : null}
      initial={initial}
      labels={{
        search: t('commerce.sellerSpace.top.search'),
        notifications: t('commerce.sellerSpace.top.notifications'),
        account: t('commerce.sellerSpace.top.account'),
        store: t('commerce.sellerSpace.top.store'),
      }}
      onSearch={() => openTab('products')}
      onNotifications={onOpenNotifications}
      onStore={() => openTab('more')}
      onAccount={() => openTab('more')}
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
            onCreateProduct={() => {
              setTab('products');
              setWizard({editId: null});
            }}
            onWithdraw={onOpenWithdrawals}
            onOpenStore={onOpenUrl}
          />
        ) : null}
        {tab === 'more' && !moreView ? (
          <SellerMoreScreen
            header={header}
            memberName={memberFullName(profile.data?.prenom, profile.data?.nom)}
            memberEmail={profile.data?.email ?? null}
            initial={initial}
            storeUrl={data?.seller.storeUrl || null}
            onOpenUrl={onOpenUrl}
            onAction={onMoreAction}
            onExit={onExit}
          />
        ) : null}
        {tab === 'more' && moreView === 'profile' ? (
          <SellerProfileScreen header={header} initial={initial} onBack={() => setMoreView(null)} />
        ) : null}
        {tab === 'more' && moreView === 'reviews' ? (
          <SellerReviewsScreen header={header} onBack={() => setMoreView(null)} />
        ) : null}
        {tab === 'more' && moreView === 'earnings' ? (
          <SellerEarningsScreen
            header={header}
            onBack={() => setMoreView(null)}
            onWithdraw={onOpenWithdrawals}
          />
        ) : null}
        {tab === 'products' && wizard ? (
          <SellerProductWizard
            header={header}
            editId={wizard.editId}
            onClose={() => setWizard(null)}
            registerBack={fn => {
              wizardBack.current = fn;
            }}
          />
        ) : null}
        {tab === 'products' && !wizard ? (
          <SellerProductsScreen
            header={header}
            onCreate={() => setWizard({editId: null})}
            onEdit={id => setWizard({editId: id})}
          />
        ) : null}
        {tab === 'sales' ? <SellerSalesScreen header={header} /> : null}
        {tab === 'analytics' ? <SellerAnalyticsScreen header={header} /> : null}
      </View>
      <SellerTabBar
        active={tab}
        onChange={openTab}
      />
    </View>
  );
}

