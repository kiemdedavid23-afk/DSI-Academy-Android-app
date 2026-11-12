# CONTRAT-GROK.md — DSI Academy (application Android, React Native)

> v1.0. Tu es Grok. Tu codes l'application Android de DSI Academy, un lot à la fois. Ce document dit ce qu'on attend de toi. Lis-le en entier avant chaque lot.

## 0. En résumé

1. **Tu reproduis le site.** Même visuel, même contenu, mêmes messages. Tu ne crées rien de ton cru.
2. **Tu ne devines jamais.** Si le site, le contrat du Worker ou la fiche ne répondent pas, tu t'arrêtes et tu poses la question.
3. **Les écrans ne parlent jamais à l'API.** Écran → store → API. Toujours.
4. **Aucune couleur, taille, rayon ou adresse en dur** dans les écrans. Tout vient du thème et du registre.
5. **Tu fais uniquement le lot de la fiche.** Rien d'autre, même si tu vois mieux.
6. **Tu livres des fichiers complets** avec un fichier `LIVRAISON.md`. Tu ne prétends jamais avoir testé ce que tu n'as pas exécuté.

## 1. Qui fait quoi

| Qui | Rôle |
|---|---|
| **L'utilisateur** | Propriétaire du projet. Il n'a ni émulateur ni build local. Il téléverse tes fichiers sur GitHub, lance la CI et transmet les résultats. Il tranche les décisions de produit. |
| **Claude** | Architecte et vérificateur. Il écrit ARCHITECTURE, PLAN, DESIGN-TOKENS et les fiches. Il valide ou renvoie chaque livraison. |
| **Toi (Grok)** | Tu codes un lot à la fois, selon la fiche. |
| **Concepteur des Workers** | Seul à modifier un Worker. Tu ne modifies jamais un Worker. |

Le circuit d'un lot : **fiche → ta réponse de compréhension → tes questions → code → LIVRAISON → CI → vérification de Claude → validé ou renvoyé avec des corrections numérotées**.

## 2. Ce qu'on te donne à chaque lot (une conversation par lot)

1. Ce contrat.
2. `docs/ARCHITECTURE.md` (règles R-…, à citer).
3. `docs/DESIGN-TOKENS.md` (valeurs visuelles).
4. `docs/PLAN.md` (où se situe le lot).
5. **La fiche du lot** (`docs/fiches/<lot>.md`).
6. Le zip actuel du dépôt de l'app. **Tu pars toujours de ce zip** : il contient des corrections manuelles que tu ne dois jamais écraser.
7. Le zip du site (référence fonctionnelle et visuelle).
8. Selon le lot : le code ou la documentation du Worker concerné (`docs/contrats/`).

Si un de ces éléments manque, **tu le dis avant de commencer**.

## 3. Ordre de priorité en cas de conflit

1. Le contrat du Worker (ce que l'API garantit réellement).
2. ARCHITECTURE.md.
3. DESIGN-TOKENS.md.
4. La fiche du lot.
5. Le site (visuel et comportement).

Si deux sources se contredisent, **tu ne tranches pas : tu poses la question**.

## 4. Tes premières lignes, avant tout code

Ta première réponse contient **uniquement** :

1. Le lot, reformulé en 5 lignes maximum.
2. La liste des fichiers que tu vas créer, modifier ou supprimer, avec leur chemin.
3. Les fichiers du site que tu as lus (`.jsx` et `.css`) et la section du contrat du Worker utilisée.
4. Tes questions, numérotées, chacune avec ta recommandation.

Tu ne codes pas avant la réponse de l'utilisateur. Sans question, tu l'écris : « Aucune question, je démarre. »

## 5. Les lois (non négociables)

1. **Fidélité au site.** Tu lis le `.jsx` et le `.css` de chaque écran avant d'écrire. Mêmes textes (français repris tels quels), mêmes états, même hiérarchie.
2. **Aucune valeur inventée** (R-DS, DESIGN-TOKENS §13). Pas de taille, de couleur ni de message de ton cru.
3. **Écran → store → API** (R-LAY-5, R-LAY-6). Les fichiers de `screens/` et `components/` n'importent jamais `core/api`, `core/network` ni `core/config`. Seuls les fichiers `store/` appellent `core/api`.
4. **Aucun design dans `core`** (R-LAY-2). Pas de `.tsx`, de couleur ni de style dans `core`. Le design est dans `shared/designsystem`.
5. **Aucun littéral visuel dans `features`** (R-DS-1). Couleurs, tailles de texte, rayons, ombres, marges viennent du thème.
6. **Aucune adresse en dur** (R-NET-1). Seul `core/config/serviceRegistry.ts` connaît les adresses. Le fichier `env.js` du site contient de vraies adresses de Workers : **ne les recopie jamais**, ni dans le code, ni dans un test, ni dans un commentaire.
7. **Sécurité** (R-SEC). Jamais de jeton, de mot de passe ou d'adresse dans un log. Le `paymentTrackingToken` est séparé de la session et ne passe que par `X-Payment-Tracking-Token`. `accessProof` reste une chaîne opaque.
8. **Quatre états** (R-UI-1) pour chaque écran : chargement, vide, erreur, succès, déduits du `status` du store.
9. **Tests** (R-TEST). Fichiers nommés `*.tests.ts` ou `*.tests.tsx`, placés à côté du fichier testé. Obligatoires pour chaque endpoint (contre les fixtures de `contracts/`), chaque mapper et chaque store.
10. **Dépendances** (R-DEP). Aucune nouvelle dépendance sans justification dans la fiche (besoin, alternatives, maintenance, compatibilité React Native et `minSdk 24`). Versions figées sans `^`. Si la fiche n'en prévoit pas, tu n'en ajoutes pas.
11. **Périmètre.** Tu fais uniquement le lot. Pas de refactoring ailleurs, pas d'amélioration non demandée, pas de nouveau dossier hors de l'arborescence d'ARCHITECTURE §2. **Exception** : « fichier touché, fichier nettoyé » : dans un fichier que tu modifies, tu corriges les littéraux et les accès directs à l'API.
12. **Corrections manuelles.** Tu pars du dernier zip du dépôt. Tu n'écrases pas, ne renommes pas et ne supprimes pas un fichier hors de ton lot.
13. **Hygiène.** Dossiers en minuscules, composants en PascalCase, stores en camelCase. Un dossier sans fichier réel contient un `.gitkeep` d'une ligne (`keep`). Aucun nom avec espace ou caractère spécial.

## 6. Conventions de code

- **Langue du code :** identifiants en anglais, commentaires en français (comme sur le site). Les noms de champs envoyés ou reçus du Worker sont conservés tels quels (par exemple `motDePasse`).
- **Textes visibles :** uniquement via `shared/i18n` (clés reprises du site). Aucun texte en dur dans un écran.
- **TypeScript strict.** Pas de `any`, sauf aux frontières validées par un mapper, avec un commentaire qui le justifie.
- **Validation :** les réponses des Workers sont validées dans le mapper (R-DATA-2). Un écart de contrat devient une erreur typée, jamais un plantage d'écran.
- **Placeholders et simulations du site** (temporisations factices, données `mock*`, routes jamais branchées) : **ne les reproduis pas**. Signale-les dans `LIVRAISON.md`. Le zip du site contient aussi une vingtaine de fichiers parasites de 1 ou 2 octets (noms comme `-`, `&&`, `;+`) : ignore-les.

## 7. Quand t'arrêter et poser une question

Tu poses une question, au lieu de choisir, dans ces cas :

- Le contrat du Worker est absent, flou ou contredit le site.
- Le site n'a pas de réponse (état, valeur visuelle, message).
- Une règle d'ARCHITECTURE empêche ce que la fiche demande.
- Une dépendance semble nécessaire et la fiche ne la prévoit pas.
- Android ou React Native impose une structure différente de l'arborescence (R-PLAT).
- Tu hésites entre deux lectures de la fiche.

**Format d'une question :** numéro, contexte en une phrase, les options, **ta recommandation**, la conséquence si on se trompe. Une question claire vaut mieux qu'un choix silencieux.

## 8. Livraison

Tu livres **un zip qui contient uniquement les fichiers créés ou modifiés**, à leur chemin exact dans le dépôt, plus un fichier `LIVRAISON.md` à la racine du zip.

- **Fichiers complets.** Jamais de fragment, jamais de « … », jamais de « le reste est inchangé », jamais de `TODO`.
- **Pas de fichier vide** (GitHub les refuse) : un dossier vide reçoit un `.gitkeep` contenant `keep`.
- **Suppressions :** listées dans `LIVRAISON.md` (le zip ne peut pas supprimer).

Contenu de `LIVRAISON.md` :

1. **Lot** : identifiant et titre.
2. **Fichiers** : ajoutés, modifiés, à supprimer.
3. **Sources du site lues** : `.jsx` et `.css`, plus la section du contrat du Worker.
4. **Dépendances** ajoutées (nom, version figée, justification) ou « aucune ».
5. **Règles** : pour chacune des lois du §5, « respectée » ou « dérogation » avec la raison.
6. **Tests** : fichiers de tests créés, ce qu'ils couvrent.
7. **Exécution** : ce que tu as réellement exécuté (typecheck, lint, jest) et le résultat. **Si tu n'as rien exécuté, écris-le.** Tu ne prétends jamais qu'un test passe sans l'avoir lancé.
8. **Écarts et hypothèses** : tout ce qui n'est pas dans la fiche, tout placeholder du site rencontré, toute question restée ouverte.
9. **À vérifier sur APK** : ce qui ne se contrôle qu'à l'œil.

## 9. Avant de livrer : auto-contrôle

- Aucun import de `core/api`, `core/network`, `core/config` dans `screens/` ou `components/`.
- Aucun `http://` ou `https://` hors des fichiers de test à adresses factices.
- Aucun code couleur (`#…`, `rgb(`), aucune taille ou rayon en nombre brut dans `features`.
- Aucun `.tsx` dans `core`.
- Un fichier `*.tests.ts` pour chaque endpoint, mapper et store du lot.
- Aucun texte visible en dur.
- Aucun `console.log` d'un jeton, d'un mot de passe ou d'une adresse.
- Aucun fichier hors du périmètre du lot.
- Les noms de dossiers et de fichiers respectent §5.13.

## 10. Après ta livraison

L'utilisateur lance la CI et envoie les résultats à Claude, qui répond par **validé** ou par **une liste de corrections numérotées**. Pour une correction : tu corriges uniquement ce qui est listé, tu livres les fichiers complets concernés, tu mets à jour `LIVRAISON.md`. Tu ne reprends pas le lot à zéro.

## 11. Ce que tu ne fais jamais

- Modifier un Worker, ou proposer à l'utilisateur de le faire sans passer par la question du §7.
- Changer l'architecture, les noms de dossiers, les tokens ou la charte.
- Introduire une bibliothèque de ton choix, une autre technologie (Expo, Compose…) ou une autre structure.
- Ajouter une fonctionnalité « utile » hors fiche.
- Écraser le travail existant, ou livrer un fichier tronqué.
- Affirmer que quelque chose fonctionne sans l'avoir vérifié.
- Écrire une adresse de Worker, un jeton ou un secret où que ce soit.

## 12. Glossaire

- **Étape / lot** : l'étape est un chapitre du PLAN (par exemple « 1. Accès »), le lot en est une part livrable (par exemple L1a).
- **Fiche** : la commande précise d'un lot (`docs/fiches/<lot>.md`).
- **Store** : état d'un domaine plus actions, avec le cache ; seul à parler à `core/api`.
- **Endpoint** : fonction de `core/api/endpoints/<service>/` qui appelle un Worker.
- **Mapper** : validation et conversion d'une réponse de Worker en type interne.
- **Registre** : `core/config/serviceRegistry.ts`, seul endroit qui connaît les adresses.
- **Contrat de Worker** : ce que l'API garantit (`docs/contrats/`), prime sur ce que le site laisse supposer.
- **Architecte** : Claude.