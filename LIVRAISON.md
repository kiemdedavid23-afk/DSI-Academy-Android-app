# LIVRAISON — L0d (outils transverses)

Lot : i18n, cache des stores (Zustand), préférences persistées, squelette de navigation.
**Rien n'a pu être exécuté ici** (pas de `npm install`, pas de CI, pas d'APK) : la CI décide.

## A. Fichiers créés

| Fichier | Rôle |
|---|---|
| `src/shared/i18n/locales/fr.json` | Copie exacte du site |
| `src/shared/i18n/locales/en.json` | Copie exacte du site |
| `src/shared/i18n/locales/community.fr.json` | Copie exacte du site |
| `src/shared/i18n/locales/community.en.json` | Copie exacte du site |
| `src/shared/i18n/locales/communityProfile.fr.json` | Copie exacte du site |
| `src/shared/i18n/locales/communityProfile.en.json` | Copie exacte du site |
| `src/shared/i18n/index.ts` | Init i18next, API `useTranslation` / `changeLanguage` / `getLanguage` |
| `src/shared/store/createResourceStore.ts` | Fabrique Zustand `{ data, status, error, updatedAt }` + TTL / dédoublonnage |
| `src/shared/store/storeRegistry.ts` | Registre purgeable ; s'abonne à `sessionStore.onSessionCleared` |
| `src/shared/store/index.ts` | Exports |
| `src/core/storage/kvStorage.ts` | Couche AsyncStorage non sensible |
| `src/core/storage/index.ts` | Exports |
| `src/core/session/sessionStore.ts` | Session minimale + `onSessionCleared` (core n'importe pas shared) |
| `src/core/session/index.ts` | Exports |
| `src/core/config/featureFlags.ts` | `welcomeScreen: false`, `devGallery: false` |
| `src/shared/preferences/preferencesStore.ts` | Langue, thème, reduceMotion, showAmountsXof persistés |
| `src/shared/preferences/index.ts` | Exports |
| `src/app/navigation/RootNavigator.tsx` | AuthStack ou MemberTabs selon session |
| `src/app/navigation/AuthStack.tsx` | Connexion + Inscription navigateur (placeholders) |
| `src/app/navigation/MemberTabs.tsx` | 5 onglets + pile Plus |
| `src/app/navigation/PlaceholderScreen.tsx` | Écran titre i18n uniquement |
| `src/app/navigation/linking.ts` | Table des liens profonds minimale |
| `src/app/providers/AppProviders.tsx` | Thème + hydratation + i18n + navigation |
| `__tests__/i18n.tests.ts` | Clés fr/en, interpolation, fallback, changeLanguage |
| `__tests__/store.cache.tests.ts` | TTL, cache, dédoublonnage, invalidation, erreur+cache, purge |
| `__tests__/preferences.tests.ts` | Lecture/écriture, invalides, défauts |
| `__tests__/session.purge.tests.ts` | `clearSession` → purge des stores |
| `__mocks__/@react-native-async-storage/async-storage.js` | Mock mémoire |
| `__mocks__/react-native-svg.js` | Mock mis à jour (Rect) |

## B. Fichiers modifiés

| Fichier | Changement |
|---|---|
| `package.json` | Dépendances exactes ajoutées (voir C) |
| `tsconfig.json` | `resolveJsonModule: true` |
| `src/app/App.tsx` | Branche sur `AppProviders` |
| `src/shared/designsystem/theme/themePreferences.ts` | Commentaire : API inchangée, persistance via preferencesStore |
| `src/shared/designsystem/icons/iconPaths.ts` | Icônes RoomIcons du site + type `rect` |
| `src/shared/designsystem/icons/Icon.tsx` | Support `Rect` |
| `__tests__/designsystem.icons.tests.tsx` | Liste ICON_NAMES étendue (icônes RoomIcons) |

## C. Dépendances ajoutées (versions exactes)

| Paquet | Version | Native ? | Justification |
|---|---|---|---|
| `i18next` | **25.5.2** | non | Moteur i18n identique au site |
| `react-i18next` | **15.4.1** | non | Hooks React |
| `intl-pluralrules` | **2.0.1** | non | Polyfill pluriels Hermes (i18next ≥ 24) |
| `zustand` | **5.0.8** | non | R-DEP-4 |
| `@react-native-async-storage/async-storage` | **2.2.0** | **oui** | Stockage non sensible |
| `@react-navigation/native` | **7.1.14** | non | Navigation |
| `@react-navigation/native-stack` | **7.3.21** | non | Piles |
| `@react-navigation/bottom-tabs` | **7.4.2** | non | Onglets |
| `react-native-screens` | **4.16.0** | **oui** | Peer React Navigation |
| `react-native-gesture-handler` | **2.28.0** | **oui** | Peer React Navigation / RN 0.88 |

## D. Fichiers à supprimer (aucun dans ce lot)

Aucun.

## E. Ordre d'exécution après téléversement

1. **Lockfile** (`npm install` / `npm ci` selon workflow) — nouvelles dépendances.
2. **CI** (typecheck, lint, jest).
3. **build-apk** — obligatoire pour valider les dépendances natives (AsyncStorage, screens, gesture-handler) (R-DEP-2).

## F. Navigation retenue

Onglets bas : Accueil · DSI · Notifications · Profil · Plus (icône Settings du site).
Dans Plus (pile) : Abonnement, Retraits, Historique paiements, Parrainage, Paramètres.

## G. Purge à la déconnexion (correction R-LAY-1)

- `core/session` expose `onSessionCleared(listener)`.
- `shared/store/storeRegistry` s'abonne et appelle `purgeAll()`.
- Les préférences ne sont pas purgées.
- Test : `__tests__/session.purge.tests.ts`.

## H. Exceptions et [À CONFIRMER]

1. **Bootstrap LoadingState** : libellé d'accessibilité `"Chargement…"` en dur uniquement tant que i18n n'est pas encore initialisé (fenêtre de quelques ms). Documenté dans `AppProviders.tsx`.
2. **Onglet Plus** : utilise `SettingsIcon` (chemins RoomIcons.settings du site) — aucune icône inventée.
3. **Galerie** : conservée derrière `featureFlags.devGallery = false`.
4. **Session** : toujours absente en L0d (`hasSession() === false`).
5. **Versions npm** : à confirmer par le lockfile si une version exacte est refusée par le registre.
6. **react-native-gesture-handler / screens** : APK vert requis avant de considérer le lot clos (R-DEP-2).
7. **Skeleton / LoadingState** : non modifiés (consigne).

## I. Auto-contrôle

- Aucun import `core/api` / `core/network` dans screens.
- Aucune URL http(s) en dur.
- Aucune couleur / taille brute dans features/navigation (tokens thème).
- Aucun `.tsx` dans `core`.
- Tests à plat dans `__tests__/`.
- core n'importe pas shared.
