/**
 * Icônes vectorielles (R-DS-6). Chemins repris du site :
 * src/shared/ui/Icons.jsx et src/houses/member-space/RoomIcons.jsx.
 * viewBox 24, trait 1,8, extrémités arrondies.
 * EyeIcon et EyeOffIcon (Font Awesome sur le site) redessinées dans le même style
 * [À CONFIRMER sur APK].
 */

export type IconShape =
  | {type: 'path'; d: string}
  | {type: 'circle'; cx: number; cy: number; r: number}
  | {
      type: 'rect';
      x: number;
      y: number;
      width: number;
      height: number;
      rx?: number;
    };

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
  /** Accueil / tableau de bord — RoomIcons.home */
  HomeIcon: [
    {type: 'rect', x: 3.5, y: 3.5, width: 17, height: 17, rx: 3},
    {type: 'path', d: 'M8 16v-4M12 16V8M16 16v-6'},
  ],
  /** DSI / holdings — RoomIcons dsi-holdings */
  DsiIcon: [
    {type: 'circle', cx: 12, cy: 12, r: 8.5},
    {type: 'circle', cx: 12, cy: 12, r: 5},
    {type: 'path', d: 'M12 9.5v5'},
  ],
  /** Abonnement — RoomIcons.subscription */
  SubscriptionIcon: [
    {type: 'rect', x: 3, y: 5.5, width: 18, height: 13, rx: 2.5},
    {type: 'path', d: 'M3 10h18M7 15h3'},
  ],
  /** Retraits — RoomIcons.withdrawals */
  WithdrawalsIcon: [
    {type: 'path', d: 'M12 15V4M8 8l4-4 4 4'},
    {type: 'path', d: 'M4.5 15v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3'},
  ],
  /** Paiements — RoomIcons.payments */
  PaymentsIcon: [
    {
      type: 'path',
      d: 'M6 3.5h12v17l-2.5-1.7-2 1.7-1.5-1.7-1.5 1.7-2-1.7L6 20.5v-17Z',
    },
    {type: 'path', d: 'M9 8.5h6M9 12h6'},
  ],
  /** Parrainage — RoomIcons.referral */
  ReferralIcon: [
    {type: 'circle', cx: 9.5, cy: 8, r: 3.5},
    {type: 'path', d: 'M3 20c0-3.4 2.9-5.5 6.5-5.5 1.3 0 2.5.3 3.5.9'},
    {type: 'path', d: 'M18 14v6M15 17h6'},
  ],
  /** Paramètres — RoomIcons.settings */
  SettingsIcon: [
    {type: 'path', d: 'M4 7h9M17 7h3M4 17h3M11 17h9'},
    {type: 'circle', cx: 15, cy: 7, r: 2},
    {type: 'circle', cx: 9, cy: 17, r: 2},
  ],
} as const satisfies Record<string, readonly IconShape[]>;

export type IconName = keyof typeof iconShapes;

export const ICON_NAMES = Object.keys(iconShapes) as IconName[];
