/**
 * Coque commune Marketplace + Boutique : carte d'ambiance, sélecteur de section
 * en pastilles, puis le contenu de la section. Même coque pour les deux sources,
 * seuls les contenus et les sections changent (Boutique : pas de Vendeur).
 * Les écrans de section posent la coque en tête de leur liste (`shellHeader`).
 * Transition : Découvrir et Explorer affichent encore le catalogue d'origine
 * (refaits aux lots 12 et 13), Mes achats n'a que Mes achats et Favoris (lot 14),
 * Vendeur est un message d'attente (lot 15).
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
import type {CommerceAccess, CommerceProduct, CommerceSource} from '../store/commerceTypes';
import {CommerceDiscoverScreen} from './CommerceDiscoverScreen';
import {CommerceFavoritesScreen} from './CommerceFavoritesScreen';
import {CommercePurchasesScreen} from './CommercePurchasesScreen';

export type CommerceHouseRequest = {section?: CommerceSection; tab?: PurchasesTab};

export type CommerceHouseScreenProps = {
  source: CommerceSource;
  /** Section et sous-onglet demandés par la navigation ; une nouvelle demande les remplace. */
  request?: CommerceHouseRequest;
  onOpenProduct: (product: CommerceProduct) => void;
  onOpenAccess: (access: CommerceAccess) => void;
  /** Marketplace seulement. */
  onOpenTrending?: () => void;
  onOpenSellers?: () => void;
  /** Boutique seulement (jusqu'au lot 16). */
  onOpenCart?: () => void;
  onOpenLibrary?: () => void;
};

export function CommerceHouseScreen({
  source,
  request,
  onOpenProduct,
  onOpenAccess,
  onOpenTrending,
  onOpenSellers,
  onOpenCart,
  onOpenLibrary,
}: CommerceHouseScreenProps) {
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  const [section, setSection] = useState<CommerceSection>(resolveSection(source, request?.section));
  const [tab, setTab] = useState<PurchasesTab>(request?.tab ?? 'purchases');

  useEffect(() => {
    if (request) {
      setSection(resolveSection(source, request.section));
      setTab(request.tab ?? 'purchases');
    }
  }, [source, request]);

  const tabs = useMemo(
    () => PURCHASES_TABS.map(id => ({id, label: t(`commerce.shell.tabs.${id}`)})),
    [t],
  );

  const action = (label: string, icon: 'StoreIcon' | 'BookIcon', onPress: () => void, id: string) => (
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
        onChange={setSection}
      />
      {source === 'shop' && (onOpenCart || onOpenLibrary) ? (
        <View style={{flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xl}}>
          {onOpenCart ? action(t('commerce.cart.title'), 'StoreIcon', onOpenCart, 'shop-open-cart') : null}
          {onOpenLibrary
            ? action(t('commerce.library.title'), 'BookIcon', onOpenLibrary, 'shop-open-library')
            : null}
        </View>
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
        onDiscover={goDiscover}
        onOpenAccess={onOpenAccess}
        shellHeader={shellHeader}
      />
    );
  }
  return (
    <CommerceDiscoverScreen
      key={section}
      source={source}
      onOpenProduct={onOpenProduct}
      onOpenTrending={onOpenTrending}
      onOpenSellers={onOpenSellers}
      shellHeader={shellHeader}
    />
  );
}
