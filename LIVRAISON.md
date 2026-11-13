# LIVRAISON — Lot correctif L0-fix + L0c complet (réalisé par l'architecte)

Ce lot corrige L0a/L0b (L0-fix) et livre L0c (design system) complet, sans stub.
**Rien n'a pu être exécuté ici** (pas de `npm install`, pas de CI) : la CI décide.
Contrôlé sans CI : syntaxe de tous les fichiers TS/TSX, typage strict des modules purs
du thème, et exécution réelle des modules purs (couleurs, typographie, polices, jetons).

## A. L0-fix

| N° | Correction | Fichier(s) |
|---|---|---|
| 1 | Syntaxe de `architecture.tests.ts` (guillemets) ; fichier réécrit, 30 tests dont ceux des règles R-LAY-1/3/4/5/6, R-NET-1, R-DS-1 composées, et du dépôt (tests à plat, noms, `.gitkeep`) | `__tests__/architecture.tests.ts` |
| 2 | Chemin des scripts dans les tests : `../scripts/` | `__tests__/generate-build-config.tests.ts`, `__tests__/copy-fonts.tests.ts` |
| 3 | `scripts/copy-fonts.js` recréé (absent du dépôt) ; tests avec dossiers temporaires | `scripts/copy-fonts.js` |
| 4 | Registre gateway : préfixe normalisé des deux côtés (`/shop/` donne `/shop`) | `src/core/config/serviceRegistry.ts` |
| 5 | Tests `httpClient` : aucun `expect` dans un faux `fetch` (capture puis assertion) ; cas `accessProof` ; `new Response(null, {status: 204})` | `__tests__/httpClient.tests.ts` |
| 6 | `ci.yml` et `build-apk.yml` : `npm ci` seulement, erreur claire sans lockfile | `.github/workflows/ci.yml`, `build-apk.yml` |
| 7 | `index.js` à la racine avec `AppRegistry.registerComponent` | `index.js` |
| 8 | `.eslintrc.js` réécrit : une seule règle par zone (les overrides ne fusionnent pas) | `.eslintrc.js` |
| 9 | Règle `.gitkeep` : contenu libre (petit fichier), plus de `.gitkeep` dans un dossier non vide | `__tests__/architecture.tests.ts` |

## B. L0c

| Élément | Fichier(s) |
|---|---|
| Thème : `ThemeProvider`, `useTheme`, `buildTheme`, `resolveMode`, `resolveReduceMotion`, préférences en mémoire | `src/shared/designsystem/theme/` |
| Couleurs exactes (clair, sombre, bleu actif, sémantiques, squelettes) | `theme/colors.ts` |
| Typographie : type fermé, interligne en pixels, rôles construits sur l'usage du site | `theme/typography.ts` |
| Polices : erreur si coupe inconnue, `EXPECTED_FONT_FILES` | `theme/fonts.ts` |
| Rayons, espacements, élévations, verre, zone tactile, mouvement | `theme/*.ts` |
| Composants : Text, Button, Card, TextField, Skeleton, SkeletonBlocks, useSkeletonGate, LoadingState, EmptyState, ErrorState | `components/` |
| Icônes : 12 icônes, chemins du site | `icons/` |
| Workflow `fetch-fonts` + script Python (`fonttools`) | `.github/workflows/fetch-fonts.yml`, `scripts/fetch-fonts.py` |
| Écran de test temporaire et `App.tsx` enveloppé dans `ThemeProvider` | `src/app/App.tsx`, `src/app/dev/ThemeGalleryScreen.tsx` |
| Simulation de `react-native-svg` pour Jest | `__mocks__/react-native-svg.js` |
| 7 fichiers de tests du design system (à plat) | `__tests__/designsystem.*.tests.ts(x)` |
| Dépendance : `react-native-svg` 15.15.4 | `package.json` |

## C. Fichiers à supprimer dans le dépôt (ce zip ne peut pas supprimer)

- `src/core/network/authProviders.tests.ts`
- `src/core/network/envelope.tests.ts`
- `src/core/network/errors.tests.ts`
- `src/core/network/httpClient.tests.ts`
- `src/core/network/rateLimitGate.tests.ts`
- `src/core/network/serviceAuth.tests.ts`
- `scripts/copy-fonts.tests.ts`
- `scripts/generate-build-config.tests.ts`
- `src/app/index.js`
- `src/shared/designsystem/components/.gitkeep`
- `src/shared/designsystem/icons/.gitkeep`
- `src/shared/designsystem/theme/.gitkeep`

## D. Ordre d'exécution après téléversement

1. Lockfile (nouvelle dépendance `react-native-svg`).
2. fetch-fonts (dépose 13 polices et 3 licences ; supprime `src/assets/fonts/.gitkeep`).
3. CI.
4. init-native si pas déjà fait, puis build-apk.

## E. À confirmer ou à surveiller

- `react-native-svg` 15.15.4 : version citée par la documentation (compatible React Native 0.78+). Si npm refuse la version, Lockfile échoue clairement. Justification R-DEP-1 : seule bibliothèque de dessin vectoriel standard pour React Native, maintenue par Software Mansion, requise pour les icônes du site et le reflet des squelettes. Acceptée définitivement après la compilation APK (R-DEP-2).
- Fraunces : `opsz` 36, `SOFT` 0, `WONK` 0 [À CONFIRMER sur APK].
- EyeIcon et EyeOffIcon dessinées dans le style du site (Font Awesome sur le site) [À CONFIRMER sur APK].
- Élévations et verre sans flou : valeurs de départ [À CONFIRMER sur appareil].
- Polices : tailles hors liste ramenées à la plus proche (23, 27, 28 → 22/26, 44 → 38).
- Préférences de thème et animations : en mémoire, sans persistance (L0d / étape 1).
- Libellés français en dur : uniquement `src/app/dev/ThemeGalleryScreen.tsx` (temporaire).
- Dossiers `Rooms` et `HouseStacks` : majuscule non conforme à R-TREE-1, non touchés (l'utilisateur décide).
