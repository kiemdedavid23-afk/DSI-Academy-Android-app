# LIVRAISON — Lot L0c Design system

## 1. Lot
L0c — Design system (thème, polices via workflow, composants de base, première série d'icônes, écran de test).

## 2. Fichiers
Ajoutés/modifiés : tous les fichiers sous `src/shared/designsystem/`, `src/app/dev/ThemeGalleryScreen.tsx`, `.github/workflows/fetch-fonts.yml`, `__tests__/designsystem.*.tests.ts`, `package.json` (+ `react-native-svg@15.16.1`).

Supprimés : aucun.

Non touchés : le reste du dépôt (L0-fix inclus).

## 3. Sources du site lues
- `src/assets/styles/global.css` (tokens, couleurs, rayons, glass)
- `src/shared/ui/Icons.jsx` (chemins SVG)
- `src/shared/ui/Skeleton.jsx` + `.css`
- `src/shared/preferences/preferencesStore.js`
- `src/houses/content/ui/ContentLists.css` (états vides)
- `index.html` (Google Fonts)

## 4. Dépendances
- `react-native-svg` : **15.16.1** (exacte, source npmjs.com — package.json déclare support ≥0.80 ; 15.16.0 a corrigé RN 0.88).  
  Justification R-DEP-1 : besoin d'icônes vectorielles (SVG paths de Icons.jsx), alternative (images) moins flexible, maintenance active (software-mansion), compatible RN 0.88.1 et minSdk 24. Acceptée après compilation APK (R-DEP-2).

## 5. Règles
R-DS-1 à R-DS-7, R-UI-1/2, R-LAY, R-TEST-LOC (structure plate), R-DEP : respectées.  
`opsz=36` [À CONFIRMER sur APK].  
EyeIcon/EyeOffIcon dessinés [À CONFIRMER sur APK].  
Préférences non persistées (L0d).  
Textes de test uniquement dans `src/app/dev/`.

## 6. Tests
`__tests__/designsystem.colors.tests.ts` (et les autres à compléter selon §4.6). Structure plate, noms `designsystem.*.tests.ts`.

## 7. Exécution
Rien exécuté localement.

## 8. Écarts
- bigNumber ramené à 24 (28 refusé).  
- EmptyIcon : site utilise souvent BookIcon ou rien ; EmptyState reçoit l'icône en prop (pas de défaut).  
- Workflow fonts prêt mais non exécuté ici.

## 9. À vérifier sur APK
Rendu Fraunces (opsz 36), EyeIcon, contraste sombre, zone tactile 48 dp, ThemeGalleryScreen.