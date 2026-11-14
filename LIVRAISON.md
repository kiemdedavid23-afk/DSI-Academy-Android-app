# LIVRAISON — L1b (navigateur d'inscription)

**Rien n'a pu être exécuté ici** (pas de npm install / CI / APK).

## Dépendances

| Paquet | Version | Note |
|--------|---------|------|
| `react-native-webview` | **17.0.2** | Existe sur npm (2026-11-04). Exige RN ≥ 0.80 / New Architecture. Compatible RN 0.88.1. **Native → APK vert.** |
| Onglet externe | *aucune* | `Linking.openURL` (try/catch). R-WEB-3 appliquée via navigateur externe système, pas Custom Tabs. |

## Fichiers créés

- `src/features/auth/register/logic/siteUrl.ts`
- `src/features/auth/register/logic/navigationFilter.ts`
- `src/features/auth/register/logic/registrationMessage.ts`
- `src/features/auth/register/logic/draftInjection.ts`
- `src/features/auth/register/logic/lastLoginIdentifier.ts`
- `src/features/auth/register/logic/prefillIdentifier.ts`
- `src/features/auth/register/store/registerBrowserStore.ts`
- `src/features/auth/register/screens/RegisterBrowserScreen.tsx`
- `src/shared/i18n/locales/app.fr.json`
- `src/shared/i18n/locales/app.en.json`
- `__mocks__/react-native-webview.js`
- `__tests__/webHost.tests.ts`
- `__tests__/registerNavigationFilter.tests.ts`
- `__tests__/registerMessage.tests.ts`
- `__tests__/registerDraft.tests.ts`
- `__tests__/registerBrowserStore.tests.ts`
- `__tests__/appI18nParity.tests.ts`
- `docs/fiches/L1b.md`

## Fichiers modifiés

- `package.json` — react-native-webview@17.0.2
- `src/core/config/serviceRegistry.ts` — `isSiteUrl`
- `src/shared/i18n/index.ts` — fusion app.fr / app.en
- `src/app/navigation/AuthStack.tsx` — RegisterBrowser réel + params
- `src/features/auth/login/screens/LoginScreen.tsx` — mode new/resume, prefill, rememberLoginIdentifier

## Supprimés

- `src/features/auth/registration-browser/.gitkeep` (dossier placeholder)

## Textes neufs (app.*)

| Clé | fr |
|-----|-----|
| app.register.title | Inscription |
| app.register.leaveTitle | Quitter l'inscription ? |
| app.register.leaveMessage | Vous pourrez reprendre plus tard… |
| app.register.leaveStay | Rester |
| app.register.leaveConfirm | Quitter |
| app.register.loadErrorTitle | Chargement impossible |
| app.register.loadErrorMessage | Vérifiez votre connexion… |
| app.register.retry | Réessayer |

Parité fr/en testée (`appI18nParity.tests.ts`).

## Ordre d’exécution

1. Lockfile  
2. CI  
3. **build-apk** (webview natif)

## [À CONFIRMER]

1. Étape S site : embed, postMessage identifiant email/WhatsApp, pas DSI-
2. R-WEB-3 via navigateur externe (pas Custom Tabs) accepté durablement
3. `inscription.title` absent des locales site → titre via `app.register.title`
