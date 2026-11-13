import type {TextStyle} from 'react-native';
import {fontFamily} from '../theme/fonts';
import type {Theme} from '../theme/ThemeProvider';
import type {TypographyVariant} from '../theme/typography';

/** Style de texte (famille, taille, interligne) d'une variante du thème. */
export function textStyle(
  theme: Theme,
  variant: TypographyVariant,
  italic = false,
): TextStyle {
  const role = theme.typography[variant];
  return {
    fontFamily: fontFamily(role.family, role.weight, italic),
    fontSize: role.size,
    lineHeight: role.lineHeight,
  };
}
