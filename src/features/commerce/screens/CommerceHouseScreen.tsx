/**
 * Coque commune Marketplace + Boutique : carte d'ambiance, sélecteur de section
 * en pastilles, puis le contenu de la section. Même coque pour les deux sources,
 * seuls les contenus et les sections changent (Boutique : pas de Vendeur).
 * Les écrans de section posent la coque en tête de leur liste (`shellHeader`).
 * Transition : Vendeur est un message
 * d'attente (lot 15).
 */

import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, View} from 'react-native';
import {EmptyState, Icon, Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {CommerceHero} from '../components/CommerceHero';
import {CommerceSectionPills} from '../components/CommerceSectionPills';
import {CommerceUnderTabs} from '../components/CommerceUnderTabs';
import {
  PURCHASES_TABS,
  resolveSection,
  sectionsFor,
  type CommerceSection,
  type PurchasesTab,
} from '../logic/commerceSections';
import {DEFAULT_SORT, type SortKey} from '../logic/explore';
import type {
  CommerceAccess,
  CommerceProduct,
  CommerceSource,
  MarketplaceSeller,
} from '../store/commerceTypes';
import {CommerceExploreScreen} from './CommerceExploreScreen';
import {CommerceFavoritesScreen} from './CommerceFavoritesScreen';
import {CommerceHomeScreen, type DiscoverTab} from './CommerceHomeScreen';
import {CommercePurchasesScreen} from './CommercePurchasesScreen';

export type CommerceHouseRequest = {section?: CommerceSection; tab?: PurchasesTab};

export type CommerceHouseScreenProps = {
  source: CommerceSource;
  /** Section et sous-onglet demandés par la navigation ; une nouvelle demande les remplace. */
  request?: CommerceHouseRequest;
  onOpenProduct: (product: CommerceProduct) => void;
  onOpenAccess: (access: CommerceAccess) => void;
  /** Marketplace seulement. */
  onOpenSeller?: (seller: MarketplaceSeller) => void;
  /** Boutique seulement (jusqu'au lot 16). */
  onOpenCart?: () => void;
  onOpenLibrary?: () => void;
};

export function CommerceHouseScreen({
  source,
  request,
  onOpenProduct,
  onOpenAccess,
  onOpenSeller,
  onOpenCart,
  onOpenLibrary,
}: CommerceHouseScreenProps) {
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const [section, setSection] = useState<CommerceSection>(resolveSection(source, request?.section));
  const [tab, setTab] = useState<PurchasesTab>(request?.tab ?? 'purchases');
  const [homeTab, setHomeTab] = useState<DiscoverTab>('home');
  const [exploreSort, setExploreSort] = useState<SortKey>(DEFAULT_SORT);

  useEffect(() => {
    if (request) {
      setSection(resolveSection(source, request.section));
      setTab(request.tab ?? 'purchases');
      setHomeTab('home');
      setExploreSort(DEFAULT_SORT);
    }
  }, [source, request]);

  const tabs = useMemo(
    () => PURCHASES_TABS.map(id => ({id, label: t(`commerce.shell.tabs.${id}`)})),
    [t],
  );
  const homeTabs = useMemo(
    () =>
      (['home', 'trending'] as const).map(id => ({id, label: t(`commerce.shell.homeTabs.${id}`)})),
    [t],
  );

  const action = (label: string, icon: 'StoreIcon', onPress: () => void, id: string) => (
    <Pressable
      key={id}
      onPress={onPress}
      accessibilityRole="button"
      testID={id}
      style={{
        alignItems: 'center',
        borderColor: colors.goldBorder,
        borderRadius: radii.pill,
        borderWidth: 1,
        flexDirection: 'row',
        gap: spacing.sm,
        minHeight: 40,
        paddingHorizontal: 14,
      }}>
      <Icon name={icon} size={18} color={colors.textPrimary} />
      <Text variant="bodySmall">{label}</Text>
    </Pressable>
  );

  const shellHeader = (
    <View style={{gap: spacing.md, paddingBottom: spacing.md, paddingTop: spacing.lg}}>
      <CommerceHero source={source} section={section} />
      <CommerceSectionPills
        sections={sectionsFor(source)}
        active={section}
        onChange={next => {
          setExploreSort(DEFAULT_SORT);
          setSection(next);
        }}
      />
      {source === 'shop' && onOpenCart ? (
        <View style={{flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xl}}>
          {action(t('commerce.cart.title'), 'StoreIcon', onOpenCart, 'shop-open-cart')}
        </View>
      ) : null}
      {section === 'discover' ? (
        <CommerceUnderTabs
          tabs={homeTabs}
          active={homeTab}
          onChange={setHomeTab}
          accessibilityLabel={t('commerce.shell.tabsLabel')}
        />
      ) : null}
      {section === 'purchases' ? (
        <CommerceUnderTabs
          tabs={tabs}
          active={tab}
          onChange={setTab}
          accessibilityLabel={t('commerce.shell.tabsLabel')}
        />
      ) : null}
    </View>
  );

  const goDiscover = () => setSection('discover');

  if (section === 'seller') {
    return (
      <ScrollView
        style={{flex: 1, backgroundColor: colors.bgApp}}
        contentContainerStyle={{paddingBottom: spacing.xxxl}}
        testID={`screen-${source}-seller`}>
        {shellHeader}
        <EmptyState message={t('commerce.shell.sellerSoon')} testID="commerce-seller-soon" />
      </ScrollView>
    );
  }
  if (section === 'purchases') {
    if (tab === 'codes') {
      return (
        <ScrollView
          style={{flex: 1, backgroundColor: colors.bgApp}}
          contentContainerStyle={{paddingBottom: spacing.xxxl}}
          testID={`screen-${source}-codes`}>
          {shellHeader}
          <EmptyState
            icon="GiftIcon"
            message={t('commerce.shell.codesSoon')}
            testID="commerce-codes-soon"
          />
        </ScrollView>
      );
    }
    return tab === 'favorites' ? (
      <CommerceFavoritesScreen
        source={source}
        onOpenProduct={onOpenProduct}
        onDiscover={goDiscover}
        shellHeader={shellHeader}
      />
    ) : (
      <CommercePurchasesScreen
        source={source}
        mode={tab === 'history' ? 'history' : 'purchases'}
        onOpenLibrary={onOpenLibrary}
        onDiscover={goDiscover}
        onOpenAccess={onOpenAccess}
        shellHeader={shellHeader}
      />
    );
  }
  if (section === 'discover') {
    return (
      <CommerceHomeScreen
        source={source}
        tab={homeTab}
        shellHeader={shellHeader}
        onOpenProduct={onOpenProduct}
        onSeeAllTrending={() => setHomeTab('trending')}
        onSeeAllNew={() => {
          setExploreSort('newest');
          setSection('explore');
        }}
      />
    );
  }
  return (
    <CommerceExploreScreen
      key={`${section}-${exploreSort}`}
      source={source}
      initialSort={exploreSort}
      onOpenProduct={onOpenProduct}
      onOpenSeller={onOpenSeller}
      shellHeader={shellHeader}
    />
  );
}
