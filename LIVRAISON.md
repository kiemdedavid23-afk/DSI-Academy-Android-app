# LIVRAISON — L1a (session sécurisée + connexion)

**Rien n'a pu être exécuté ici** (pas de `npm install`, pas de CI, pas d'APK).

## Bibliothèque sécurisée

| | |
|---|---|
| Paquet | `react-native-keychain` |
| Version exacte | **11.0.0** |
| Pourquoi pas 10.0.0 | Les notes v11 exigent RN **0.82+**, New Architecture (TurboModules), React **19.1.1+**, Node **20.19.4+**, Android **API 24+**. Notre projet : RN 0.88.1, React 19.3, Node ≥ 24 → **11.0.0** est la version déclarée compatible. |
| API | `setGenericPassword` / `getGenericPassword` / `resetGenericPassword` avec **`service` distinct** par clé logique (`app.dsiacademy.secure.member_session` vs `…registration_tracking`). **Aucune option biométrique.** |
| minSdk | 24 (exigé par la lib et le projet) |
| R-DEP-2 | Dépendance native → **build-apk vert** obligatoire |

## Fichiers créés

| Fichier |
|---|
| `src/core/api/endpoints/payment/auth.types.ts` |
| `src/core/api/endpoints/payment/auth.mapper.ts` |
| `src/core/api/endpoints/payment/auth.api.ts` |
| `contracts/payment/auth.connexion.connecte.json` |
| `contracts/payment/auth.connexion.connecte.accessProof-null.json` |
| `contracts/payment/auth.connexion.pending_payment.direct.json` |
| `contracts/payment/auth.connexion.pending_payment.hosted.json` |
| `contracts/payment/auth.connexion.refuse.json` |
| `contracts/payment/auth.connexion.suspendu.json` |
| `contracts/payment/auth.connexion.http400.json` |
| `src/core/storage/secureStorage.ts` |
| `src/core/session/registrationTracking.ts` |
| `src/features/auth/login/store/loginStore.ts` |
| `src/features/auth/login/screens/LoginScreen.tsx` |
| `__mocks__/react-native-keychain.js` |
| `__tests__/auth.mapper.tests.ts` |
| `__tests__/auth.api.tests.ts` |
| `__tests__/secureStorage.tests.ts` |
| `__tests__/session.tests.ts` |
| `__tests__/registrationTracking.tests.ts` |
| `__tests__/loginStore.tests.ts` |
| `__tests__/LoginScreen.tests.tsx` |
| `docs/fiches/L1a.md` |

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `package.json` | `react-native-keychain@11.0.0` |
| `src/core/session/sessionStore.ts` | Session complète, expiresAt, hydrate, souvenir, HTTP auth |
| `src/core/session/index.ts` | Exports registrationTracking |
| `src/core/storage/index.ts` | Export secure* |
| `src/app/navigation/AuthStack.tsx` | LoginScreen réel |
| `src/app/providers/AppProviders.tsx` | hydrate session + préférences avant nav |

## Fichiers supprimés

- `src/core/session/.gitkeep`
- `src/core/storage/.gitkeep`
- `src/core/api/endpoints/payment/.gitkeep`

## Ordre d’exécution

1. Lockfile (`npm install` / `npm ci`)
2. CI (typecheck, lint, jest)
3. **build-apk** (Keychain natif)

## Points [À CONFIRMER] / notes

1. Keychain 11.0.0 + New Architecture sur l’APK de CI.
2. Libellés `connexion.idLabel` (email / WhatsApp) — l’identifiant DSI n’est pas accepté par le Worker ; aucun format imposé côté app.
3. Texte pending : `inscription.payment.title` / `subtitle` / `pay` uniquement.
4. Aucun jeton / mot de passe dans les logs (aucun `console.log` ajouté).
5. Tests existants session.purge conservés (API `setSessionPresent` / `clearSession` / `onSessionCleared`).

## Auto-contrôle

- Écrans : pas d’import `@core/api` / `@core/network` / `@core/config`
- Chemins relatifs uniquement dans auth.api
- Tests à plat dans `__tests__/`
- core n’importe pas shared
