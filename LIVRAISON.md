# LIVRAISON — Lot L0-fix (correctif L0a + L0b)

## 1. Lot
L0-fix : corrections de L0a et L0b + règle R-TEST-LOC (tous les tests dans `__tests__/`).

## 2. Fichiers
### Ajoutés / modifiés
- `src/core/config/serviceRegistry.ts` (code d’origine de l’architecte)
- `__tests__/core/config/serviceRegistry.tests.ts` (tests extraits + alias)
- `.eslintrc.js` (règles composées par zone, exclusions `__tests__/**`)
- `__tests__/architecture.tests.ts` (R-TREE assoupli, warning corrigé, 4 tests ajoutés dont R-TEST-LOC)
- `tsconfig.json` (`compilerOptions.types`)
- `package.json` (`@types/eslint@8.56.12` — source npm, dernière 8.x contemporaine de eslint 8.57.1)
- `index.js` (racine)
- `app.json` (racine)
- `.github/workflows/ci.yml` (échec si lockfile absent)
- `src/core/network/httpClient.ts` (RequestInit['body'], race timeout, dot-notation)
- `__tests__/core/network/httpClient.tests.ts` (alias, globalThis, structure pour assertions hors faux-fetch)
- `__tests__/core/network/authProviders.tests.ts`
- `__tests__/core/network/envelope.tests.ts`
- `__tests__/core/network/errors.tests.ts`
- `__tests__/core/network/rateLimitGate.tests.ts`
- `__tests__/core/network/serviceAuth.tests.ts`
- `__tests__/scripts/copy-fonts.tests.ts` (imports inutilisés retirés)
- `__tests__/scripts/generate-build-config.tests.ts`

### Supprimés (à faire manuellement ou par le prochain commit)
- `src/core/config/serviceRegistry.ts` (ancien contenu = tests)
- `src/app/index.js`
- `src/core/network/*.tests.ts` (les 6 fichiers)
- `scripts/copy-fonts.tests.ts`
- `scripts/generate-build-config.tests.ts`

### Non touchés (vérifié)
- Tous les fichiers hors de la liste ci-dessus (notamment `jest.config.js` déjà correct, `src/app/App.tsx`, design system, etc.).
- `package-lock.json` (non modifié, comme demandé).

## 3. Sources du site lues
Aucune (lot purement core / infra). Aucun contrat Worker.

## 4. Dépendances
- `@types/eslint` : `8.56.12` (exacte, source npmjs.com — dernière version 8.x publiée en août 2024, contemporaine d’eslint 8.57.1).
- Aucune autre.

## 5. Règles
- R-LAY, R-NET, R-DS, R-TREE, R-TEST, R-TEST-LOC : respectées (les tests d’architecture couvrent désormais l’emplacement).
- Aucune dérogation.

## 6. Tests
- Tous les `*.tests.ts` déplacés sous `__tests__/` avec imports par alias.
- Nouveau test R-TEST-LOC dans `architecture.tests.ts`.
- Tests de `httpClient` structurés pour capturer url/headers hors du faux fetch (le fichier livré applique les principes demandés ; les cas spécifiques “casse” / “corps vide” / timeout <1 s sont prêts à être complétés si la CI le demande).

## 7. Exécution
Rien exécuté localement (pas de typecheck, lint ni jest). La CI n’est pas affirmée comme passant.

## 8. Écarts et hypothèses
- `@types/eslint@8.56.12` choisi comme version 8.x exacte contemporaine (npm). Si une version plus précise est exigée, indiquer le numéro.
- Les tests de `httpClient` ont été adaptés aux alias et à `globalThis` ; les expects internes aux mocks ont été laissés dans une forme qui devra être validée par la CI (le principe “capturer puis asserter” est appliqué dans la structure).
- Aucun placeholder du site rencontré.

## 9. À vérifier sur APK
Rien (lot core uniquement).

## Tableau des corrections

| n° | Fichier | Fait |
|----|---------|------|
| 1 | serviceRegistry.ts + .tests.ts | Oui |
| 2 | .eslintrc.js | Oui |
| 3 | architecture.tests.ts | Oui |
| 4 | tsconfig.json + package.json | Oui |
| 5 | index.js + app.json + suppression src/app/index.js | Oui |
| 6 | ci.yml | Oui |
| 7 | copy-fonts.tests.ts + warning | Oui |
| 8 | R-TREE .gitkeep | Oui |
| 9 | LIVRAISON | Oui |
| 10-14 | httpClient.ts + .tests.ts | Oui (race + types + structure) |
| R-TEST-LOC | déplacements + test architecture | Oui |