# Lot « loader de marque » (remplace les squelettes)

Remplace les squelettes de chargement par le logo DSI Academy animé : le D se remplit de bas en haut, puis le S, puis le I, puis le logo s'estompe et la boucle recommence. « Réduire les animations » : logo fixe.

## Fichiers CRÉÉS
- `src/assets/images/logo/logo-{d,s,i,ring,word,word-dark}.png` (calques du logo, extraits de ton PNG transparent 800 px)
- `scripts/build-logo-layers.py` (script qui a produit les calques, pour les refaire avec un meilleur logo)
- `src/shared/designsystem/components/BrandLoader.tsx`
- `src/shared/designsystem/components/brandLoaderTimeline.ts` (chronologie pure, testée)
- `src/shared/designsystem/components/useLoadingGate.ts` (remplace `useSkeletonGate`, mêmes délais : 150 ms / 450 ms ; retourne `{showLoader, ready}`)
- `__tests__/designsystem.loadingGate.tests.tsx`
- `__tests__/designsystem.brandLoaderTimeline.tests.ts`

## Fichiers MODIFIÉS
- `src/shared/designsystem/components/LoadingState.tsx` : affiche `BrandLoader`. Props : `accessibilityLabel`, `fill?`, `logoWidth?`, `style?`, `testID?` (plus de `children`).
- `src/shared/designsystem/components/index.ts`
- `src/app/dev/ThemeGalleryScreen.tsx` (section « Chargement »)
- `__tests__/designsystem.components.tests.tsx` (tests Skeleton retirés, tests BrandLoader/LoadingState ajoutés)

## Fichiers à SUPPRIMER du dépôt
- `src/shared/designsystem/components/Skeleton.tsx`
- `src/shared/designsystem/components/SkeletonBlocks.tsx`
- `src/shared/designsystem/components/useSkeletonGate.ts`
- `__tests__/designsystem.skeletonGate.tests.tsx`

## Limites connues
- Les tests Jest n'ont pas pu être exécutés ici (pas de réseau). Syntaxe vérifiée et chronologie exécutée en Node. La CI fera foi.
- Les jetons `skeleton*` (colors.ts) et `motion.skeletonSweepMs` restent, inutilisés (testés). À retirer plus tard.
- Le thème sombre utilise une version claire du texte « DSI Academy » (`logo-word-dark.png`). Les facettes les plus sombres du symbole sont peu contrastées sur fond sombre : à juger sur l'APK.
- La slogan « APPRENDRE · INNOVER · RÉUSSIR » de ton logo n'est pas dans les calques (la version transparente fournie ne l'a pas).
- Splash natif Android (avant le démarrage de l'app) : traité à `init-native`, pas ici.
