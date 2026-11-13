# Fiche L0c — Design system

> Étape 0, lot 3 sur 4. Lis `docs/CONTRAT-GROK.md` et `docs/DESIGN-TOKENS.md` avant de commencer. Ta première réponse suit le §4 du contrat (reformulation, fichiers, questions), sans code. Départ : le dépôt fourni avec cette fiche, où le lot correctif L0-fix est déjà téléversé.

## 1. Objectif

Livrer le design system de l'app : le thème (clair et sombre), les polices embarquées, les composants de base, les composants d'états et la première série d'icônes. Après ce lot, un écran n'écrit plus jamais une couleur, une taille de texte, un rayon ou une ombre : il les lit dans le thème (R-DS-1). Les textes affichés arrivent en L0d (`shared/i18n`) : aucun composant ne contient de texte français, tout passe par des props.

Tout vit dans `src/shared/designsystem/`. Aucun appel réseau, aucun store, aucun endpoint.

## 2. Sources

**Site à lire avant d'écrire :**
- `src/assets/styles/global.css` (tokens, thème sombre, `reduce-motion`)
- `src/shared/ui/Skeleton.jsx`, `Skeleton.css`, `SkeletonBlocks.jsx`, `SkeletonBlocks.css`, `useSkeletonGate.js` (squelettes : forme, durée, comportement)
- `src/shared/ui/Icons.jsx` (les icônes SVG)
- `src/shared/preferences/preferencesStore.js` (réglages `reduceMotion` et thème)
- Pour boutons, champs et états vides ou en erreur, repère les classes dans : `src/houses/member-space/components/DashboardCards.css`, `src/houses/member-space/rooms/home/MemberHomeScreen.css`, `src/shared/community-profile/CommunityProfileForm.css`, `src/houses/content/ui/ContentLists.css`. Cite les fichiers réellement lus dans `LIVRAISON.md`.
- `index.html` (lien Google Fonts : les graisses réellement chargées).

**Document de référence :** `docs/DESIGN-TOKENS.md` v1.1, la source des valeurs. Une valeur absente du site et de ce document n'est pas inventée : tu poses la question.

**Règles d'ARCHITECTURE :** R-DS-1 à R-DS-7, R-UI-1, R-UI-2, R-LAY-1 à R-LAY-3, R-PLAT-3, R-DEP-1, R-DEP-2, R-TEST-1, R-TEST-LOC (les tests sont dans `__tests__/`, jamais à côté du code), R-TREE-1, R-TREE-2.

## 3. Ce que tu observes dans le site (à respecter)

- Charte v3.0 : 70 % neutres, 20 % sombre, 5 % or. L'or est rare.
- Le thème sombre est un `data-theme="dark"` ; les polices sont chargées depuis Google Fonts (Fraunces, Manrope, IBM Plex Mono) : l'app les embarque.
- « Réduire les animations » coupe toutes les transitions. L'app honore aussi le réglage d'accessibilité Android (DESIGN-TOKENS §12).
- Les CSS d'écran écrivent leurs couleurs sémantiques en dur : elles sont ici des tokens (DESIGN-TOKENS §5).
- **À ne pas reproduire :** les rayons hors 6, 10 et 16 (ramener au plus proche), les tailles hors de la liste du §6 de DESIGN-TOKENS, l'or clair crème en sombre, le texte discret `#94A3B8` comme seule porteuse d'information.

## 4. Périmètre : ce que tu livres

### 4.1 Thème : `src/shared/designsystem/theme/`
- `colors.ts` : deux jeux complets `lightColors` et `darkColors`, **mêmes clés** (surfaces, textes, or, bleu, bleu actif/lien, bordure, sémantiques erreur, succès, alerte, information avec texte, fond et bordure). Valeurs exactes de DESIGN-TOKENS §1 à §5. Fonds et bordures sémantiques et or clair en sombre : couleur à 16 % (fond) et 35 % (bordure) posée sur la surface, avec une fonction `withAlpha`.
- `typography.ts` : familles (`royal` = Fraunces, `sans` = Manrope, `mono` = IBM Plex Mono), tailles autorisées (la liste du §6, rien d'autre), rôles nommés (corps, légende, titres…), interligne du corps 1,5. Les rôles sont construits sur la liste des tailles ; **propose le tableau des rôles dans ta première réponse (question 1) avant de coder**.
- `spacing.ts` (xs 4 à xxxl 32), `radii.ts` (6, 10, 16, pilule, rond), `elevation.ts` (1, 2/4, 6/8 dp selon DESIGN-TOKENS §8), `glass.ts` (fond semi-opaque et bordure ; **sans flou** dans ce lot : la bibliothèque de flou est choisie à l'étape 2), `touch.ts` (zone tactile minimale 48 dp), `motion.ts`.
- `ThemeProvider` et `useTheme()` : retourne `colors`, `mode` (`'light' | 'dark'`), `spacing`, `radii`, `typography`, `elevation`, `glass`, `reduceMotion` (booléen) et `isDark`.
- Préférence de thème : `'system' | 'light' | 'dark'` (défaut `system`, via `useColorScheme`). Préférence « réduire les animations » : booléen ; `reduceMotion` vaut vrai si **l'un des deux** est actif (réglage app, ou `AccessibilityInfo.isReduceMotionEnabled` avec écoute des changements). Les préférences vivent dans un petit module d'état en mémoire (`themePreferences.ts`, lecture par `useSyncExternalStore`). **Pas de Zustand dans ce lot, pas de persistance** : le stockage arrive avec la session et le cache (L0d et étape 1). Signale-le dans `LIVRAISON.md`.

### 4.2 Polices : `src/assets/fonts/`
- Embarquées dans l'APK, une police par graisse et par style, licence SIL OFL (joindre le fichier de licence de chaque famille). Graisses : Fraunces 400, 500, 600, 700 et italiques 400, 500, 600 ; Manrope 400, 500, 600, 700, 800 ; IBM Plex Mono 500.
- **Tu ne peux pas télécharger de polices.** Tu livres un workflow manuel `.github/workflows/fetch-fonts.yml` (`workflow_dispatch`, `permissions: contents: write`) qui, sur le runner : récupère les fichiers sources dans le dépôt officiel `google/fonts` (dossiers `ofl/fraunces`, `ofl/manrope`, `ofl/ibmplexmono` ; vérifie les noms de fichiers exacts, échoue clairement s'ils ont changé), installe `fonttools` avec pip, génère les coupes statiques avec `fonttools varLib.instancer`, nomme les fichiers pour Android (`Manrope-Regular.ttf`, `Manrope-Bold.ttf`, `Fraunces-SemiBoldItalic.ttf`…, le nom du fichier sans extension est le `fontFamily`), copie les licences, vérifie que chaque fichier attendu existe et n'est pas vide, puis fait un commit sur `main` (`git add src/assets/fonts`). Pour Fraunces, fixe `opsz` à **36** (titres), `SOFT` et `WONK` à 0 **[À CONFIRMER sur APK]** : dis dans ta réponse si ce choix te paraît correct.
- `src/shared/designsystem/theme/fonts.ts` : table `fontFamily(role, graisse, italique)` qui retourne le nom exact de fichier. Un test vérifie que chaque nom listé correspond à un nom attendu par le workflow.
- Le script `copy-fonts` (L0a) copie déjà `src/assets/fonts` vers les assets Android au build ; vérifie qu'il le fait bien pour des `.ttf`, sans modifier son comportement sauf défaut prouvé.

### 4.3 Composants de base : `src/shared/designsystem/components/`
Tous lisent `useTheme()`. Aucune valeur visuelle en dur ailleurs que dans `theme/`. Chaque élément cliquable fait au moins 48 dp (`hitSlop` si le visuel est plus petit), a un `accessibilityRole` et un `accessibilityLabel` fourni par l'appelant.
- `Text` : prop `variant` (rôles de `typography.ts`), couleur par rôle (`primary`, `secondary`, `muted`, `onDark`, `link`, `error`…), `maxFontSizeMultiplier` à 1,3. Fraunces uniquement pour les variantes titre, salutation et grand chiffre (R-DS-2), jamais sous 14 sp.
- `Button` : variantes `primary`, `secondary`, `ghost`, états `disabled` et `loading`, Manrope uniquement, minimum 48 dp, appui visible (survol/appui du §8). Un bouton désactivé ou en chargement n'appelle pas `onPress`.
- `Card` : variantes `default`, `accent` (fond or clair, bordure or : élément actif ou favori), `glass` (sans flou), élévation et rayon du thème.
- `TextField` : libellé, valeur, aide, message d'erreur, état désactivé, option mot de passe (afficher/masquer avec l'icône œil si disponible, sinon prop pour fournir l'icône). Manrope uniquement.
- `Skeleton` et blocs de squelette : forme et durée repris de `Skeleton.jsx` et `Skeleton.css` ; **aucun mouvement quand `reduceMotion` est vrai** (bloc fixe).
- Composants d'états (R-UI-2, un seul jeu pour toute l'app) : `LoadingState` (squelettes), `EmptyState` (icône, titre, texte, action optionnelle), `ErrorState` (icône, titre, texte, bouton « réessayer » optionnel). Tous les textes et libellés viennent de props.
- `index.ts` exporte l'API publique ; les autres couches importent `@shared/designsystem`.

### 4.4 Icônes : `src/shared/designsystem/icons/`
- Une icône vectorielle par icône réellement utilisée, qui prend la couleur du texte de son contexte (jamais de couleur en dur, DESIGN-TOKENS §11). Source : les chemins SVG de `Icons.jsx`.
- **Première série limitée** à ce que ce lot et le squelette de navigation (L0d) utilisent : erreur/alerte (`WarningIcon`), vide (à choisir), actualiser, œil (afficher/masquer le mot de passe), fermer (`XIcon`), chevrons, coche, recherche, utilisateur, cloche. Propose la liste finale dans ta première réponse (question 2). Les autres viendront à l'étape qui en a besoin.
- Technique : **`react-native-svg`** est le choix attendu. C'est une dépendance native : justifie-la selon R-DEP-1 (besoin, alternatives, maintenance, compatibilité RN 0.88.1 et `minSdk 24`), version exacte vérifiée sur npm, sans `^`. Elle n'est acceptée qu'après une compilation APK réussie (R-DEP-2). Mets les chemins SVG dans un fichier de données (`iconPaths.ts`) et un composant `Icon` unique (`name`, `size`, `color` optionnelle).

### 4.5 Écran de test du thème (temporaire) : `src/app/dev/ThemeGalleryScreen.tsx`
- `App.tsx` enveloppe l'app dans `ThemeProvider` et affiche cet écran.
- Il montre : palette (toutes les couleurs nommées), chaque variante de texte avec Fraunces et Manrope, boutons (tous les états), carte `default`, `accent` et `glass`, champ (normal, erreur, mot de passe), squelette, états vide et erreur, quelques icônes, et trois boutons pour la préférence de thème (système, clair, sombre) plus un interrupteur « réduire les animations ».
- Il sert à comparer l'app au site sur la première APK (DESIGN-TOKENS §13). Il sera retiré ou masqué en L0d ou à l'étape 2 : signale-le.
- Les textes de cet écran sont des libellés de test en dur, **uniquement dans ce fichier de `src/app/dev/`** : `LIVRAISON.md` le signale comme exception temporaire.

### 4.6 Tests (dans `__tests__/shared/designsystem/`, nommés `*.tests.ts` ou `*.tests.tsx`)
- Couleurs : chaque valeur du §1 à §5 de DESIGN-TOKENS est présente dans les jeux clair et sombre ; mêmes clés dans les deux jeux ; `withAlpha` (cas limites).
- Typographie : toutes les tailles sont dans la liste autorisée ; aucune variante Fraunces sous 14 sp ; interligne du corps 1,5.
- Rayons : seulement 6, 10, 16, pilule, rond. Espacement et élévations conformes au document.
- `fonts.ts` : chaque nom de police correspond à un fichier attendu par `fetch-fonts.yml`.
- Fraunces n'est jamais utilisée par `Button` ni `TextField` (rendu avec `react-test-renderer`).
- `ThemeProvider` : mode clair, sombre et système ; `reduceMotion` vrai si l'un des deux est actif ; écoute des changements.
- Composants (rendu clair et sombre, sans erreur) : `Button` désactivé et en chargement n'appelle pas `onPress` ; zone tactile ≥ 48 dp ; rôles d'accessibilité ; `TextField` affiche l'erreur ; `Skeleton` immobile si `reduceMotion` ; `EmptyState` et `ErrorState` affichent leurs props et le bouton « réessayer » appelle son action.
- Test d'architecture ajouté si pertinent : aucun littéral de couleur ni de taille dans `src/app/` hors de `src/app/dev/`.

## 5. Hors périmètre

Textes français et i18n (L0d), outil de cache des stores (L0d), navigation et écrans métier (L0d et après), Zustand et persistance des préférences (L0d, étape 1), bibliothèque de flou (étape 2), avatar de membre, toutes les icônes du site, mode Fraunces variable.

## 6. Questions attendues (avec recommandation)

1. Tableau des rôles typographiques construit sur la liste des tailles (nom du rôle, famille, taille, graisse, usage dans le site), à valider avant de coder.
2. Liste finale des icônes de la première série.
3. `opsz` de Fraunces et coupes statiques : confirmer 36 ou proposer mieux.
4. Comportement de `AccessibilityInfo.isReduceMotionEnabled` et de la lecture des polices embarquées sur Android avec RN 0.88 (à vérifier dans la documentation).
5. Choix de `react-native-svg` : version exacte compatible RN 0.88.1.
6. Tout autre point que tu rencontres.

## 7. Critères d'acceptation

1. `ci.yml` : typecheck, lint et jest verts.
2. Le workflow `fetch-fonts` s'exécute et dépose toutes les polices attendues dans `src/assets/fonts` (vérifié par l'architecte dans le zip).
3. Le workflow `build-apk` compile avec `react-native-svg` ; l'APK affiche l'écran de test en clair et en sombre.
4. Aucun littéral visuel hors de `shared/designsystem/theme` et de `src/app/dev/` ; aucun texte français dans les composants.
5. Chaque point du §4.6 est couvert par un test dans `__tests__/shared/designsystem/`.
6. Une seule nouvelle dépendance (`react-native-svg`), exacte, justifiée. `package-lock.json` non touché : l'utilisateur relance le workflow Lockfile.
7. `LIVRAISON.md` : valeurs `[À CONFIRMER]` utilisées, exceptions temporaires (textes de test, préférences non persistées), fichiers lus du site, écarts avec le site.