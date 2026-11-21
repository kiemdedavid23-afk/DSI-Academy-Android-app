/** Palette de l'espace vendeur selon le thème de l'app (clair, sombre ou système). */

import {sellerColorsFor, type SellerColors} from './sellerTheme';
import {useTheme} from './ThemeProvider';

export function useSellerColors(): SellerColors {
  return sellerColorsFor(useTheme().isDark);
}
