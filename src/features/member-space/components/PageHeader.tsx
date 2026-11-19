/**
 * En-tête de page commun aux écrans de l'Espace membre :
 * carte verre (opaque) avec pastille d'icône à gauche, titre + sous-titre à droite.
 * Évite d'écrire le titre directement sur la photo de fond (illisible).
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text, Icon, useTheme} from '@shared/designsystem';

type IconName = React.ComponentProps<typeof Icon>['name'];

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: IconName;
};

export function PageHeader({title, subtitle, icon}: PageHeaderProps) {
  const {colors, radii, glass} = useTheme();
  return (
    <View
      style={[
        styles.card,
        {backgroundColor: glass.bg, borderColor: glass.border, borderRadius: radii.lg},
      ]}>
      {icon ? (
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: colors.blueLight,
              borderColor: colors.blueBorderSoft,
              borderRadius: radii.md,
            },
          ]}>
          <Icon name={icon} size={26} color={colors.bluePrimary} />
        </View>
      ) : null}
      <View style={styles.texts}>
        <Text style={[styles.title, {color: colors.textPrimary}]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, {color: colors.textSecondary}]}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {flex: 1, gap: 2},
  title: {fontFamily: 'Fraunces-Bold', fontSize: 22, lineHeight: 28},
  subtitle: {fontSize: 14, lineHeight: 20},
});
