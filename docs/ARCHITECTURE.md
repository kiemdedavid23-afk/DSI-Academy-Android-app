# ARCHITECTURE.md — DSI Academy (application Android, React Native)

> Statut : v1.1. Source de vérité visuelle : `docs/DESIGN-TOKENS.md`. Source de vérité fonctionnelle : le site (`src/…/*.jsx` et son `.css`) et les contrats des Workers (`docs/contrats/`).
> Chaque règle a un identifiant (R-…) pour que l'architecte cite la règle violée lors d'une vérification.
> v1.1 : API dans `core/api`, design dans `shared`, écrans → stores → API, tests `*.tests.ts`.

## 1. Règle d'or

L'app reproduit le site : même charte, même contenu, même ambiance. Aucune valeur visuelle ni aucun comportement réseau n'est inventé. Quand le site ou le contrat ne répond pas, Grok **s'arrête et pose la question**.

## 2. Arborescence

```
src/
├─ app/
│  ├─ App.tsx
│  ├─ providers/
│  └─ navigation/
│     ├─ RootNavigator.tsx        ← pile Auth ou pile Membre selon la session
│     ├─ AuthStack.tsx
│     ├─ MemberTabs.tsx
│     ├─ house-stacks/            ← une pile par maison
│     └─ linking.ts               ← seul endroit des liens profonds
├─ core/                          ← AUCUN design, AUCUN .tsx
│  ├─ config/                     ← serviceRegistry.ts, buildConfig.generated.ts (généré, ignoré), featureFlags.ts
│  ├─ api/endpoints/<service>/    ← payment, content, shop, marketplace, community, admin
│  │                                (<domaine>.api.ts, <domaine>.types.ts, <domaine>.mapper.ts)
│  ├─ network/                    ← client HTTP, erreurs typées, rateLimitGate, temps réel
│  ├─ session/
│  ├─ storage/
│  ├─ platform/                   ← liens profonds, navigateur intégré, notifications, accessibilité système
│  └─ utils/
├─ shared/
│  ├─ designsystem/{theme,components,icons}
│  ├─ i18n/
│  └─ store/                      ← outil commun de cache + stores transverses (progression, favoris, sélections, préférences, notifications)
├─ features/
│  └─ <feature>/<sous-partie>/{screens,components,store}
│     ex. member-space/rooms/dsi/{screens,components,store}
│     auth/{login,registration-browser,welcome}
│     academy, content, shop, marketplace, community
└─ assets/{fonts,images}
docs/{ARCHITECTURE.md,PLAN.md,DESIGN-TOKENS.md,contrats/,fiches/}
contracts/                        ← fixtures JSON de réponses réelles, par Worker
scripts/                          ← génération de buildConfig.generated.ts
```

- **R-TREE-1** Noms de dossiers en minuscules (kebab-case). Composants et écrans en PascalCase (`DsiScreen.tsx`), stores en camelCase (`dsiStore.ts`).
- **R-TREE-2** Un dossier sans fichier réel contient un `.gitkeep` d'une ligne (`keep`), supprimé dès qu'un vrai fichier arrive. Tout workflow est un `.yml`. Aucun nom de fichier avec espace ou caractère spécial.
## 3. Couches et sens des dépendances

```
app  →  features  →  shared  →  core
```

- **R-LAY-1** `core` n'importe rien de `app`, `shared`, `features`.
- **R-LAY-2** `core` ne contient aucun design : aucun fichier `.tsx`, aucune couleur, aucune taille, aucun `StyleSheet`. Les APIs système (liens, permissions, accessibilité) sont autorisées, pas l'affichage.
- **R-LAY-3** `shared` n'importe que `core`.
- **R-LAY-4** `features/x` importe `shared` et `core`, jamais `features/y`. Le commun passe par `shared`.
- **R-LAY-5** **Écrans jamais vers l'API.** Les fichiers de `screens/` et `components/` n'importent jamais `core/api`, `core/network` ni `core/config`. Ils lisent l'état et déclenchent les actions d'un store.
- **R-LAY-6** Seuls les fichiers `store/` (feature) et `shared/store/` importent `core/api`.
- **R-LAY-7** La CI vérifie R-LAY-1 à R-LAY-6 (règles d'import ESLint). Une violation fait échouer la CI.

## 4. Réseau et migration VPS

- **R-NET-1** Seul `core/config/serviceRegistry.ts` connaît les adresses. Aucun littéral `http(s)://`, aucun `fetch` hors de `core/network` et `core/config` (ESLint, CI rouge sinon).
- **R-NET-2** Un endpoint appelle `http.service('<id>').get('/chemin')`. Le chemin est relatif et identique à celui du site.
- **R-NET-3** La configuration est un secret GitHub unique (`DSI_REGISTRY_JSON`). Un script de `scripts/` la convertit en `core/config/buildConfig.generated.ts`. Ce fichier est dans `.gitignore`, jamais commité. Pour le typecheck et les tests, un mode fixture (adresses factices) le génère sans secret.
- **R-NET-4** Services enregistrés : `payment`, `content`, `shop`, `marketplace`, `community`, `admin`. Un service n'est appelé que si un écran en a besoin.
- **R-NET-5** Le temps réel passe par `resolveRealtimeUrl`. Aucun WebSocket ne s'ouvre ailleurs.
- **R-NET-6** Erreurs typées (réseau, 401, 429, contrat inattendu). Messages FR repris du site tels quels.
- **R-NET-7** Chaque Worker a des fixtures de réponses réelles dans `contracts/`. Après migration, les mêmes tests passent sans modifier l'app.

**Migration VPS :**
1. Le VPS expose les mêmes chemins, un préfixe par service.
2. Vérifier les collisions de chemins (`profile`, `favorites`, `media`, `catalog`).
3. Modifier le secret en `"mode": "gateway"`.
4. Recompiler et lancer les tests de contrat.
5. Si l'app est déjà publique, garder les anciens Workers actifs jusqu'à la mise à jour des membres. Avant la sortie publique, cette contrainte n'existe pas.

## 5. Session et sécurité

- **R-SEC-1** Le jeton de session est dans le stockage sécurisé Android. Jamais en clair, jamais dans un log.
- **R-SEC-2** Le `paymentTrackingToken` (inscription, 24 h) est séparé de la session et ne partage jamais son stockage. Il ne circule que dans `X-Payment-Tracking-Token`, jamais dans `Authorization`.
- **R-SEC-3** `accessProof` est une chaîne opaque : conservée et transmise, jamais décodée ni vérifiée.
- **R-SEC-4** Une réponse 401 sur une route membre purge la session et **réinitialise tous les stores** (données et cache), puis renvoie vers la connexion. La déconnexion fait de même.
- **R-SEC-5** Aucune adresse de Worker dans le dépôt public, les logs ou les captures de CI.
- **R-SEC-6** « Se souvenir de moi » : cochée, le jeton est conservé de façon sécurisée ; non cochée, il reste en mémoire et disparaît à la fermeture de l'app. À confirmer à l'étape 1.

## 6. Données : écrans → stores → API

- **R-DATA-1** Chaque domaine d'un Worker est un triplet dans `core/api/endpoints/<service>/` : `<domaine>.api.ts` (appels), `<domaine>.types.ts` (types), `<domaine>.mapper.ts` (validation et conversion). Le nom reprend le service du site (`auth.service.js` devient `auth.api.ts`).
- **R-DATA-2** Les réponses sont validées au mapper (Zod). Un écart de contrat produit une erreur « contrat inattendu » lisible dans les logs de CI, pas un plantage d'écran.
- **R-DATA-3** Chaque store expose un état `{ data, status, error, updatedAt }` (`status` : `idle`, `loading`, `success`, `error`) et des actions. L'écran appelle les actions du store (au montage, au rechargement) et lit son état. Il ne connaît ni les endpoints ni le réseau.
- **R-DATA-4** **Le cache est dans les stores**, avec une politique unique écrite une fois dans `shared/store/` : durée de validité par ressource, affichage immédiat de la donnée en cache puis rechargement en arrière-plan, pas d'appel en double, invalidation après une modification, purge à la déconnexion (R-SEC-4). Un store ne réécrit pas cette logique, il déclare ses réglages.
- **R-DATA-5** Données locales de l'utilisateur (progression, favoris, sélections, préférences) : stores persistés, reprenant la logique des `*Store.js` du site.
- **R-DATA-6** Aucune donnée fictive dans l'app livrée. Les `mock*.js` du site ne sont pas repris.
- **R-DATA-7** Hors ligne : on affiche la dernière version en cache, avec un bandeau. Les téléchargements de contenu (`downloadContent.js` du site) sont étudiés à l'étape de la maison concernée.

## 7. Les quatre états

- **R-UI-1** Chaque écran livré a ses quatre états : chargement (squelette), vide, erreur, succès. Ils reprennent ceux du site (squelettes, messages FR repris tels quels). Ils se déduisent du `status` du store.
- **R-UI-2** Un seul jeu de composants d'état, dans `shared/designsystem/components`. Une feature n'en recrée pas.

## 8. Design system

- **R-DS-1** Aucun littéral visuel (couleur, taille de texte, rayon, ombre, marge) dans `features`. Tout passe par `shared/designsystem/theme`. Une règle ESLint le détecte.
- **R-DS-2** Fraunces uniquement pour titres, salutations et grands chiffres, jamais sous 14 sp, jamais sur un bouton, un formulaire ou un tableau. Manrope partout ailleurs.
- **R-DS-3** Rayons : 6, 10, 16, pilule, rond. Toute autre valeur du site est ramenée au rayon le plus proche.
- **R-DS-4** L'or reste rare (environ 5 % de l'écran).
- **R-DS-5** Thème clair, thème sombre, et honorer « réduire les animations » (réglage du site et réglage système).
- **R-DS-6** Polices embarquées dans `src/assets/fonts`. Icônes : une icône vectorielle par icône utilisée, dans `shared/designsystem/icons`. Images du site dans `src/assets/images`.
- **R-DS-7** Couleurs sémantiques (erreur, succès, alerte, information) : tokens obligatoires (valeurs dans `DESIGN-TOKENS.md`).

## 9. Navigation et authentification

- **R-NAV-1** `RootNavigator` choisit la pile selon la présence d'une session : `AuthStack` ou `MemberTabs`.
- **R-NAV-2** `AuthStack` v1 : Connexion, Inscription (navigateur intégré). Pas de « mot de passe oublié », pas de page « rejoindre ».
- **R-NAV-3** Un écran d'accueil à deux boutons (S'inscrire, Se connecter) est réservé dans `features/auth/welcome/`, désactivé par `featureFlags.welcomeScreen = false`. Il sera construit une fois l'app stabilisée.
- **R-NAV-4** Les liens profonds sont déclarés uniquement dans `app/navigation/linking.ts`.
- **R-AUTH-1** Tant que l'accueil n'existe pas, la connexion porte un lien « Créer un compte » qui ouvre le navigateur d'inscription.
- **R-AUTH-2** Si la connexion répond `pending_payment`, l'app ouvre le navigateur intégré sur le `paymentUrl` reçu et conserve le `paymentTrackingToken` à part (R-SEC-2).

## 10. Navigateur d'inscription

- **R-WEB-1** Adresse : `resolveWebUrl('/inscription?embed=app')`, obtenue par le registre.
- **R-WEB-2** WebView. Seules les pages de l'hôte du site s'y chargent ; tout autre lien est refusé ou ouvert à l'extérieur.
- **R-WEB-3** Le `paymentUrl` s'ouvre dans un onglet Chrome sécurisé, pas dans la WebView. Au retour, l'app revient sur la WebView.
- **R-WEB-4** Le site signale la fin du parcours par `{ type: 'dsi:registration-done', identifiant }`. L'app vérifie l'origine, ferme le navigateur et affiche la connexion avec l'identifiant prérempli. Aucun jeton ne passe par ce message : l'inscription ne donne jamais de session.
- **R-WEB-5** Bouton retour Android : confirmation avant de fermer le parcours.
- **R-WEB-6** Hors connexion : écran d'erreur du design system, avec réessai.
- **R-WEB-7** Prérequis côté site (étape S) : mode `?embed=app` (sans en-tête, pied de page ni liens de navigation du site), message de fin, vrai suivi du paiement dans `PaymentReturnScreen`.

## 11. i18n

- **R-I18N-1** fr/en repris des fichiers du site sans réécriture, dans `shared/i18n`. Aucun texte visible en dur dans le code.
- **R-I18N-2** Les clés du site inutiles à l'app (inscription, rejoindre, mot de passe oublié) restent dans les fichiers mais ne sont pas utilisées.

## 12. Dépendances

- **R-DEP-1** Une dépendance entre dans le projet à l'étape qui en a besoin, avec sa justification dans la fiche : besoin, alternatives, maintenance, compatibilité avec la version de React Native et `minSdk 24`. Les dépendances de Botgram ne sont pas imposées.
- **R-DEP-2** Versions figées exactement (sans `^`). Aucune dépendance native sans compilation CI réussie.
- **R-DEP-3** Le choix de React Native CLI (sans Expo), TypeScript strict et la version de React Native sont tranchés à l'étape 0.
- **R-DEP-4** Stores : Zustand. Pas de bibliothèque de cache de données serveur séparée : le cache est celui des stores (R-DATA-4).

## 13. Tests et CI

- **R-TEST-1** Les fichiers de tests sont nommés `*.tests.ts` (ou `*.tests.tsx`). `jest.config.js` déclare ce motif (`testMatch`) ; sans lui, Jest ne les trouve pas.
- **R-TEST-2** Un fichier de tests est placé à côté du fichier testé. Le dossier racine `__tests__/` ne garde que les tests transversaux (règles d'architecture).
- **R-TEST-3** Chaque endpoint est testé contre les fixtures de `contracts/`. Chaque mapper a ses tests sur les cas limites. **Chaque store a son fichier de tests** (états, cache, invalidation, purge), avec `core/api` simulé.
- **R-TEST-4** Le `tsconfig.json` inclut les tests : le typecheck les vérifie.
- **R-CI-1** Le workflow `ci.yml` est lancé à la main : typecheck, lint (dont R-LAY, R-NET, R-DS), jest.
- **R-CI-2** Livraison par étape : Grok livre les fichiers ; tu les téléverses dans le dépôt, tu lances la CI et tu m'envoies logs et zip du dépôt. Je valide avant l'étape suivante.
- **R-CI-3** Dépôt public (tests, minutes gratuites) et dépôt privé (production), avec un workflow de synchronisation par jeton.

## 14. Règles pour Grok

1. Chaque fiche de tâche cite le fichier du site (`.jsx` et `.css`) et la section du contrat du Worker. Grok les lit avant d'écrire.
2. Aucune valeur inventée : une question est posée à la place.
3. Ne jamais écraser une correction manuelle : Grok part du dernier zip du dépôt.
4. Fichier touché, fichier nettoyé (R-DS-1, R-NET-1, R-LAY-5).
5. Chaque livraison contient le code complet des fichiers modifiés, jamais un fragment.
6. Un lot par fiche : pas de travail hors fiche.
7. Aucun fichier parasite, aucun nom avec caractère spécial (R-TREE-2).

## 15. Contrôle de fidélité par écran

Pour chaque écran livré, l'architecte vérifie : source citée, aucun littéral, quatre états, écran sans import d'API (R-LAY-5), store testé, hiérarchie (or rare, Fraunces seulement en titre), contraste du texte discret. La comparaison avec le site (clair et sombre, vue mobile) commence avec la première APK, à la fin de l'étape 2 ; jusque-là, la vérification se fait par le code et la CI.

## 16. Hors périmètre v1

Inscription et « rejoindre » natifs, mot de passe oublié, écran d'accueil (réservé, R-NAV-3), domaine personnalisé.

## 17. Points ouverts

1. Couleurs sémantiques en sombre, or clair en sombre (DESIGN-TOKENS).
2. Élévations, flou, coupe optique de Fraunces (DESIGN-TOKENS, à valider sur APK).
3. Version de React Native, React Native CLI ou Expo (étape 0).
4. « Se souvenir de moi » : comportement exact (R-SEC-6).
5. Notifications push : à décider avec le concepteur du Worker, au plus tard à l'étape Communauté.
6. Téléchargements de contenu hors ligne : à décider à l'étape Contenu.