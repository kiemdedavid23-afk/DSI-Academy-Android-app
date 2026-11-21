/**
 * Onglet Plus (lot S8) : en-tête du membre (initiale, nom, e-mail), « Voir ma
 * boutique », puis deux cartes de lignes : « Ma boutique » (Aperçu, Produits,
 * Ventes, Analyses, Avis) et « Mon compte vendeur » (Mon profil, Mes gains,
 * Mes retraits), enfin « Quitter ». Clients, Litiges, « Nouvelle boutique » et
 * l'assistant IA de la capture n'existent pas côté Worker ou sont hors
 * périmètre (D8) : non proposés.
 */

import React from 'react';
import {ScrollView, View} from 'react-native';
import {Text, useSellerColors, sellerMetrics} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import {SellerMenuIcon} from '../components/SellerMenuIcon';
import {SellerMenuCard, SellerMenuRow} from '../components/SellerMenuRow';
import {SellerPillButton} from '../components/SellerPillButton';
import {ACCOUNT_MENU, SHOP_MENU, type MoreAction, type MoreMenuItem} from '../logic/sellerMore';

const M = 'commerce.sellerSpace.more';

export type SellerMoreScreenProps = {
  header: React.ReactNode;
  /** Prénom et nom du membre ; vide tant qu'ils ne sont pas chargés. */
  memberName: string;
  memberEmail: string | null;
  initial: string;
  /** Lien public de la boutique fourni par le Worker ; null = bouton masqué. */
  storeUrl: string | null;
  onOpenUrl: (url: string) => void;
  onAction: (action: MoreAction) => void;
  onExit: () => void;
};

export function SellerMoreScreen({
  header,
  memberName,
  memberEmail,
  initial,
  storeUrl,
  onOpenUrl,
  onAction,
  onExit,
}: SellerMoreScreenProps) {
  const sellerColors = useSellerColors();
  const {t} = useTranslation();

  const rows = (items: readonly MoreMenuItem[]) =>
    items.map(item => (
      <SellerMenuRow
        key={item.id}
        icon={item.icon}
        title={t(`${M}.items.${item.id}.title`)}
        subtitle={t(`${M}.items.${item.id}.subtitle`)}
        onPress={() => onAction(item.action)}
        testID={`seller-more-${item.id}`}
      />
    ));

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: sellerColors.bg}}
      contentContainerStyle={{paddingBottom: 32}}
      testID="seller-more">
      {header}
      <View style={{gap: 16, padding: sellerMetrics.margin}}>
        <View style={{alignItems: 'center', flexDirection: 'row', gap: 16}}>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: sellerColors.surfaceMuted,
              borderRadius: 9999,
              height: 64,
              justifyContent: 'center',
              width: 64,
            }}>
            <Text variant="title" style={{color: sellerColors.accent}}>
              {initial}
            </Text>
          </View>
          <View style={{flex: 1}}>
            {memberName ? (
              <Text variant="display" numberOfLines={2} accessibilityRole="header" style={{color: sellerColors.ink}} testID="seller-more-name">
                {memberName}
              </Text>
            ) : null}
            {memberEmail ? (
              <Text variant="body" numberOfLines={1} style={{color: sellerColors.inkMuted}} testID="seller-more-email">
                {memberEmail}
              </Text>
            ) : null}
          </View>
        </View>

        {storeUrl ? (
          <SellerPillButton
            label={t(`${M}.viewStore`)}
            leading={<SellerMenuIcon id="external" color={sellerColors.ink} size={18} />}
            onPress={() => onOpenUrl(storeUrl)}
            testID="seller-more-view-store"
          />
        ) : null}

        <Text variant="bodyStrong" style={{color: sellerColors.inkMuted}}>
          {t(`${M}.sectionShop`)}
        </Text>
        <SellerMenuCard testID="seller-more-shop">{rows(SHOP_MENU)}</SellerMenuCard>

        <Text variant="bodyStrong" style={{color: sellerColors.inkMuted}}>
          {t(`${M}.sectionAccount`)}
        </Text>
        <SellerMenuCard testID="seller-more-account">{rows(ACCOUNT_MENU)}</SellerMenuCard>

        <SellerMenuCard>
          {[
            <SellerMenuRow
              key="quit"
              icon="quit"
              title={t(`${M}.quit`)}
              onPress={onExit}
              danger
              testID="seller-more-quit"
            />,
          ]}
        </SellerMenuCard>
      </View>
    </ScrollView>
  );
}
