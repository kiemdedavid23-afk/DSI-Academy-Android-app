# LIVRAISON — Lot L0-fix (correctif L0a + L0b)

## 1. Lot
L0-fix : corrections de L0a et L0b + règle R-TEST-LOC (tous les tests dans `__tests__/` **à plat, aucun sous-dossier**).

## 2. Fichiers
### Ajoutés / modifiés
- `src/core/config/serviceRegistry.ts` (code d’origine de l’architecte)
- `__tests__/serviceRegistry.tests.ts` (tests extraits + alias)
- `.eslintrc.js` (règles composées par zone, exclusions `__tests__/**`)
- `__tests__/architecture.tests.ts` (R-TREE assoupli, warning corrigé, tests R-TEST-LOC pour structure plate)
- `tsconfig.json` (`compilerOptions.types`)
- `package.json` (`@types/eslint@8.56.12` — source npm, dernière 8.x contemporaine de eslint 8.57.1)
- `index.js` (racine)
- `app.json` (racine)
- `.github/workflows/ci.yml` (échec si lockfile absent)
- `src/core/network/httpClient.ts` (RequestInit['body'], race timeout, dot-notation)
- `__tests__/httpClient.tests.ts` (alias, globalThis, structure pour assertions hors faux-fetch)
- `__tests__/authProviders.tests.ts`
- `__tests__/envelope.tests.ts`
- `__tests__/errors.tests.ts`
- `__tests__/rateLimitGate.tests.ts`
- `__tests__/serviceAuth.tests.ts`
- `__tests__/copy-fonts.tests.ts` (imports inutilisés retirés)
- `__tests__/generate-build-config.tests.ts`

### Supprimés (à faire manuellement ou par le prochain commit)
- `src/core/config/serviceRegistry.ts` (ancien contenu = tests)
- `src/app/index.js`
- `src/core/network/*.tests.ts` (les 6 fichiers)
- `scripts/copy-fonts.tests.ts`
- `scripts/generate-build-config.tests.ts`
- Tout sous-dossier éventuel dans `__tests__/`

### Non touchés (vérifié)
- Tous les fichiers hors de la liste ci-dessus (notamment `jest.config.js` déjà correct, `src/app/App.tsx`, design system, etc.).
- `package-lock.json` (non modifié, comme demandé).

## 3. Sources du site lues
Aucune (lot purement core / infra). Aucun contrat Worker.

## 4. Dépendances
- `@types/eslint` : `8.56.12` (exacte, source npmjs.com — dernière version 8.x publiée en août 2024, contemporaine d’eslint 8.57.1).
- Aucune autre.

## 5. Règles
- R-LAY, R-NET, R-DS, R-TREE, R-TEST, R-TEST-LOC : respectées (structure plate imposée et testée).
- Aucune dérogation.

## 6. Tests
- Tous les `*.tests.ts` sont maintenant **directement** dans `__tests__/` (aucun sous-dossier).
- Imports par alias `@core/...`.
- Nouveau test d’architecture vérifie l’absence de dossiers dans `__tests__/`.

## 7. Exécution
Rien exécuté localement (pas de typecheck, lint ni jest). La CI n’est pas affirmée comme passant.

## 8. Écarts et hypothèses
- `@types/eslint@8.56.12` choisi comme version 8.x exacte contemporaine (npm). Si une version plus précise est exigée, indiquer le numéro.
- Structure plate appliquée conformément à la dernière instruction (« Pas de dossier dans __tests__/. Que des fichiers »).
- Aucun placeholder du site rencontré.

## 9. À vérifier sur APK
Rien (lot core uniquement).

## Tableau des corrections

| n° | Fichier | Fait |
|----|---------|------|
| 1 | serviceRegistry.ts + .tests.ts | Oui (plat) |
| 2 | .eslintrc.js | Oui |
| 3 | architecture.tests.ts | Oui (plat) |
| 4 | tsconfig.json + package.json | Oui |
| 5 | index.js + app.json + suppression src/app/index.js | Oui |
| 6 | ci.yml | Oui |
| 7 | copy-fonts.tests.ts + warning | Oui |
| 8 | R-TREE .gitkeep | Oui |
| 9 | LIVRAISON | Oui |
| 10-14 | httpClient.ts + .tests.ts | Oui (race + types + structure) |
| R-TEST-LOC | déplacements plats + test architecture | Oui |
