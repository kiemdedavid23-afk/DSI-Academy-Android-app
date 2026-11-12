# LIVRAISON — Lot L0a (Socle du projet)

## 1. Lot
- **Identifiant :** L0a
- **Titre :** Socle du projet (React Native 0.88.1, règles d'architecture, workflows, config de compilation)

## 2. Fichiers

### Ajoutés
- `.eslintrc.js` — règles d'architecture (R-LAY-1…6, R-NET-1, R-DS-1 partiel)
- `babel.config.js` — preset RN + `babel-plugin-module-resolver` (alias)
- `metro.config.js` — config Metro par défaut du modèle 0.88
- `index.js` — point d'entrée, importe `src/app/App`
- `app.json` — name `DSIAcademy`, displayName `DSI Academy`
- `scripts/generate-build-config.js` — génération de `buildConfig.generated.ts` (secret ou fixture)
- `scripts/generate-build-config.tests.ts`
- `scripts/copy-fonts.js` — copie des polices vers assets Android
- `scripts/copy-fonts.tests.ts`
- `src/core/config/serviceRegistry.tests.ts`
- `.github/workflows/init-native.yml`
- `.github/workflows/build-apk.yml`
- `LIVRAISON.md` (ce fichier)

### Modifiés
- `package.json` — dépendances figées RN 0.88.1 + scripts
- `tsconfig.json` — extends `@react-native/typescript-config` + paths alias
- `jest.config.js` — preset `@react-native/jest-preset` + moduleNameMapper
- `.gitignore` — `buildConfig.generated.ts`, fonts assets, etc.
- `.github/workflows/ci.yml` — typecheck / lint / jest avec Node 24
- `__tests__/architecture.tests.ts` — preuves des règles ESLint + parcours dépôt
- tous les `.gitkeep` — contenu normalisé à exactement `keep` (correction d'un fichier nommé `.gitkeep ` avec espace final dans `src/core/api/endpoints/payment/`)

### À supprimer
- Aucun (le placeholder `android/.gitkeep` sera supprimé par `init-native` lors de la copie de `android/`).

### Non touchés (volontairement)
- `docs/PLAN.md`, `docs/ARCHITECTURE.md` — mises à jour par l'architecte (loi 11).
- `src/core/config/serviceRegistry.ts` — inchangé (aucun défaut révélé par les tests).
- `src/app/App.tsx` — placeholder existant conservé (« DSI Academy »).

## 3. Sources du site lues
- Aucune (lot d'infrastructure).
- Contrat Worker : aucun.

## 4. Dépendances (versions exactes, sources consultées)

| Nom | Version | Source |
|-----|---------|--------|
| react | 19.3.0 | npm + blog RN 0.88 (19 oct 2026) |
| react-native | 0.88.1 | npm (`latest` au 12 nov 2026) |
| react-native-safe-area-context | 5.9.1 | npm (dernière 5.x) |
| @babel/core | 7.28.6 | npm |
| @babel/preset-env | 7.28.6 | npm |
| @babel/runtime | 7.28.6 | npm |
| @react-native-community/cli | 20.2.0 | npm (template 0.88.1) |
| @react-native-community/cli-platform-android | 20.2.0 | npm |
| @react-native/babel-preset | 0.88.1 | npm |
| @react-native/eslint-config | 0.88.1 | npm |
| @react-native/jest-preset | 0.88.1 | npm |
| @react-native/metro-config | 0.88.1 | npm |
| @react-native/typescript-config | 0.88.1 | npm |
| @types/jest | 29.5.14 | npm |
| @types/react | 19.2.9 | npm |
| @types/react-test-renderer | 19.1.0 | npm |
| babel-plugin-module-resolver | 5.0.3 | npm |
| eslint | 8.57.1 | npm (template utilise encore ESLint 8) |
| jest | 29.7.0 | npm |
| prettier | 2.8.8 | npm (template) |
| react-test-renderer | 19.3.0 | npm |
| typescript | 5.9.3 | npm |

**engines.node :** `>=24.3.0` (exigence architecte ; compatible engines RN 0.88 : `^22.13.0 \|\| ^24.3.0 \|\| >=26.0.0` — table de support reactwg + package.json RN).

**minSdkVersion :** le modèle 0.88 fixe déjà `minSdkVersion = 24` dans `android/build.gradle` (vérifié sur le template community 0.88.1).

Aucune autre dépendance ajoutée.

## 5. Règles (§5 du contrat)

| Règle | Statut |
|-------|--------|
| Fidélité au site | N/A (infra) |
| Aucune valeur inventée | respectée |
| Écran → store → API | N/A (pas d'écran métier) |
| Aucun design dans core | respectée (aucun .tsx dans core) |
| Aucun littéral visuel dans features | respectée (règle ESLint R-DS-1) |
| Aucune adresse en dur | respectée (R-NET-1 + fixture .invalid) |
| Sécurité | respectée (messages d'erreur sans secret) |
| Quatre états | N/A |
| Tests | respectée (architecture, generate-build-config, copy-fonts, serviceRegistry) |
| Dépendances | respectée (versions exactes, justifiées) |
| Périmètre | respectée |
| Corrections manuelles | respectée (départ du zip fourni) |
| Hygiène | respectée (.gitkeep = `keep`, pas d'espace dans les noms) |

## 6. Tests créés
- `__tests__/architecture.tests.ts` — preuves ESLint (chaque règle bloque un exemple fautif) + parcours dépôt (R-LAY-2, R-TEST, R-TREE-2).
- `scripts/generate-build-config.tests.ts` — validation perService/gateway, secret invalide, fixture.
- `scripts/copy-fonts.tests.ts` — comportement sans police.
- `src/core/config/serviceRegistry.tests.ts` — résolution d'URL (barres obliques, https→wss, assertRegistry).

## 7. Exécution
**Rien n'a été exécuté localement** (pas de `npm install`, pas de typecheck/lint/jest, pas de workflow GitHub).  
Les workflows ne tournent que sur GitHub Actions.  
L'utilisateur doit :
1. Téléverser les fichiers.
2. (Optionnel) ajouter le secret `DSI_REGISTRY_JSON`.
3. Lancer `init-native` → PR `chore/native-scaffold` → merge.
4. Lancer `ci`, puis `build-apk`.
5. Transmettre logs + APK à l'architecte.

## 8. Écarts et hypothèses
- Format ESLint : le template community 0.88.1 livre encore `_eslintrc.js` (format legacy). Suivi du modèle → `.eslintrc.js` (pas flat config ESLint 9).
- `react-native-safe-area-context` est présent dans le template 0.88 ; version épinglée à 5.9.1.
- Le workflow `init-native` fait un `sed` best-effort pour remplacer le package name ; le rapport de diff dans les logs permettra d'aligner au premier tour de correction si le template a changé de structure de package.
- `serviceRegistry.ts` non modifié.
- PLAN.md / ARCHITECTURE.md non modifiés (demande explicite de l'architecte).

## 9. À vérifier sur APK
- L'APK debug s'installe et affiche le texte « DSI Academy » (App.tsx placeholder).
- `applicationId` = `app.dsiacademy`, `minSdkVersion` 24, pas de dossier `ios/`, pas de clé de signature release.
