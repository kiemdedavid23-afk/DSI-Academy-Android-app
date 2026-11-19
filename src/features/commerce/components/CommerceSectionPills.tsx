/** Sélecteur de section en pastilles (Découvrir · Explorer · Mes achats · Vendeur). */

import React from 'react';
import {Pressable, ScrollView} from 'react-native';
import {Text, useTheme} from '@shared/designsystem';
import {useTranslation} from '@shared/i18n';
import type {CommerceSection} from '../logic/commerceSections';

export type CommerceSectionPillsProps = {
  sections: readonly CommerceSection[];
  active: CommerceSection;
  onChange: (section: CommerceSection) => void;
};

export function CommerceSectionPills({sections, active, onChange}: CommerceSectionPillsProps) {
  const {t} = useTranslation();
  const {colors, spacing, radii} = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={t('commerce.shell.sectionsLabel')}
      contentContainerStyle={{gap: spacing.sm, paddingHorizontal: spacing.xl}}
      style={{flexGrow: 0}}>
      {sections.map(id => {
        const on = id === active;
        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            accessibilityRole="button"
            accessibilityState={{selected: on}}
            testID={`commerce-section-${id}`}
            style={{
              alignItems: 'center',
              backgroundColor: on ? colors.pillActiveBg : colors.bgSurface,
              borderColor: on ? colors.goldBorder : 'transparent',
              borderRadius: radii.pill,
              borderWidth: 1,
              height: 42,
              justifyContent: 'center',
              paddingHorizontal: 18,
            }}>
            <Text variant="bodySmall" color={on ? 'primary' : 'secondary'}>
              {t(`commerce.shell.sections.${id}`)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
