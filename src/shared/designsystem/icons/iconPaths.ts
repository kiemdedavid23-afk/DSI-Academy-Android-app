/**
 * Icônes vectorielles de la première série (R-DS-6). Chemins repris de
 * src/shared/ui/Icons.jsx du site : viewBox 24, trait 1,8, extrémités arrondies.
 * EyeIcon et EyeOffIcon (Font Awesome sur le site) sont redessinées dans le même style
 * [À CONFIRMER sur APK].
 */

export type IconShape =
  | {type: 'path'; d: string}
  | {type: 'circle'; cx: number; cy: number; r: number};

export const ICON_VIEWBOX = 24;
export const ICON_STROKE_WIDTH = 1.8;

export const iconShapes = {
  WarningIcon: [
    {type: 'path', d: 'M12 4 2.8 19.5h18.4L12 4Z'},
    {type: 'path', d: 'M12 10v4.5M12 17.2v.1'},
  ],
  RefreshIcon: [
    {type: 'path', d: 'M20 11a8 8 0 0 0-14.3-4.6L4 8.5'},
    {type: 'path', d: 'M4 4v4.5h4.5'},
    {type: 'path', d: 'M4 13a8 8 0 0 0 14.3 4.6L20 15.5'},
    {type: 'path', d: 'M20 20v-4.5h-4.5'},
  ],
  XIcon: [{type: 'path', d: 'M6 6l12 12M18 6L6 18'}],
  ChevronLeftIcon: [{type: 'path', d: 'M14.5 6l-6 6 6 6'}],
  ChevronRightIcon: [{type: 'path', d: 'M9.5 6l6 6-6 6'}],
  ChevronDownIcon: [{type: 'path', d: 'M6 9.5l6 6 6-6'}],
  CheckIcon: [{type: 'path', d: 'M5 12.5l4.5 4.5L19 7.5'}],
  SearchIcon: [
    {type: 'circle', cx: 11, cy: 11, r: 6.5},
    {type: 'path', d: 'M16 16l4.5 4.5'},
  ],
  UserIcon: [
    {type: 'circle', cx: 12, cy: 8, r: 3.5},
    {type: 'path', d: 'M5 19.5c0-3.6 3.1-6 7-6s7 2.4 7 6'},
  ],
  BellIcon: [
    {type: 'path', d: 'M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 1.5h-15L6 16.5z'},
    {type: 'path', d: 'M10 20.5a2 2 0 0 0 4 0'},
  ],
  EyeIcon: [
    {
      type: 'path',
      d: 'M2.5 12s3.6-6.5 9.5-6.5S21.5 12 21.5 12s-3.6 6.5-9.5 6.5S2.5 12 2.5 12Z',
    },
    {type: 'circle', cx: 12, cy: 12, r: 3},
  ],
  EyeOffIcon: [
    {
      type: 'path',
      d: 'M2.5 12s3.6-6.5 9.5-6.5S21.5 12 21.5 12s-3.6 6.5-9.5 6.5S2.5 12 2.5 12Z',
    },
    {type: 'circle', cx: 12, cy: 12, r: 3},
    {type: 'path', d: 'M4.5 4.5l15 15'},
  ],
} as const satisfies Record<string, readonly IconShape[]>;

export type IconName = keyof typeof iconShapes;

export const ICON_NAMES = Object.keys(iconShapes) as IconName[];
