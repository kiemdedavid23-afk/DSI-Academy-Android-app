PLAN.md — DSI Academy (application Android, React Native)
v1.0. Complète ARCHITECTURE.md. Une étape = plusieurs lots (L1a, L1b…), livrés et vérifiés un par un. Aucune étape ne démarre avant la clôture de la précédente, sauf l'étape S, qui est parallèle.
Règles de conduite
Distribution : l'app n'est pas publiée avant la fin de l'étape 11. Les APK de test sont installées à la main.
Vérification de chaque lot : Grok livre les fichiers complets, tu les téléverses, tu lances la CI et tu m'envoies logs et zip du dépôt. Je vérifie selon ARCHITECTURE §14 et je valide ou je renvoie.
APK de test : à partir de la fin de l'étape 2, à la fin de chaque étape. C'est là qu'on compare l'app au site, clair et sombre, en vue mobile.
Workers : je ne demande le code d'un Worker qu'à l'étape qui en a besoin. Toute modification de Worker est faite par son concepteur et reste notée dans l'étape.
Migration VPS : possible à tout moment avant la sortie publique, par modification du secret DSI_REGISTRY_JSON (ARCHITECTURE §3). Après la sortie, il faudra garder les anciens Workers actifs pendant la mise à jour des membres.
Les étapes
Étape
Contenu
Besoin en entrée
Critère de sortie
0. Fondations
L0a projet, CI, ESLint (R-LAY/R-NET/R-DS), registre, client HTTP · L0b thème clair/sombre, polices, composants de base et d'états · L0c i18n, stores de base, squelette de navigation
DESIGN-TOKENS v1.1 ; points ouverts tranchés
CI verte ; thème visible sur un écran de test
S. Site (parallèle)
Mode ?embed=app, message de fin d'inscription, vrai suivi du paiement
Dépôt du site
Parcours d'inscription propre dans une WebView

## Étape 0 : détail des lots

- **L0a, projet et réseau :** initialisation React Native CLI (nom `DSI Academy`, identifiant `app.dsiacademy`) ; dépendances de base figées avec justification ; `jest.config.js` (motif `*.tests.ts`), `tsconfig.json`, ESLint avec les règles R-LAY-1 à R-LAY-6, R-NET-1 et R-DS-1 ; script de génération de `buildConfig.generated.ts` (avec mode fixture sans secret) ; `ci.yml` manuel (typecheck, lint, jest) ; script de copie des polices (R-PLAT-3) ; client HTTP, erreurs typées, `rateLimitGate` ; tests.
- **L0b, design system :** `shared/designsystem/theme` (tokens clair et sombre, « réduire les animations ») ; polices ; composants de base (texte, bouton, carte, champ, squelette) et composants d'états (chargement, vide, erreur) ; première série d'icônes.
- **L0c, outils transverses :** `shared/i18n` (fr/en du site) ; `shared/store` (outil de cache commun : durée de validité, rechargement en arrière-plan, pas d'appel en double, invalidation, purge) ; squelette de navigation (`RootNavigator`, `AuthStack`, `MemberTabs`, écrans vides) ; écran de test du thème.
- **Sortie de l'étape 0 :** CI verte, thème visible dans les deux modes, outil de cache testé, règles d'architecture actives.

## Anatomie d'un lot (à partir de l'étape 1)

Chaque lot livre, pour son périmètre :

1. Les endpoints dans `core/api/endpoints/<service>/` : `.api.ts`, `.types.ts`, `.mapper.ts`.
2. Les fixtures de réponses réelles dans `contracts/<service>/`.
3. Le store dans `features/<feature>/<sous-partie>/store/`.
4. Les écrans et composants (`screens/`, `components/`), qui ne parlent qu'au store.
5. Les clés i18n utilisées.
6. Les tests `*.tests.ts` : endpoints, mapper, store.
7. La fiche du lot dans `docs/fiches/`.

## Définition de « terminé » pour un lot

- Le typecheck, le lint et jest passent.
- Aucune violation des règles R-LAY, R-NET, R-DS.
- Aucun écran n'importe `core/api` (R-LAY-5).
- Les quatre états existent et se déduisent du `status` du store.
- Le store a ses tests (états, cache, invalidation, purge).
- La fiche cite le `.jsx` et le `.css` du site et la section du contrat.
- Aucune valeur inventée : les questions restées sans réponse sont listées dans la fiche.

1. Accès
L1a session sécurisée + connexion (dont pending_payment) · L1b navigateur d'inscription · L1c garde d'accès, 401, déconnexion
Worker Paiement
Connexion et inscription de bout en bout
2. Espace membre
L2a coquille (barre du bas, tiroir, cloche) · L2b accueil membre (cartes, « continuer » et favoris, carte membre)
Worker Paiement
Première APK ; comparaison visuelle avec le site
3. Compte et argent
L3a abonnement et renouvellement · L3b historique et parrainage · L3c retraits, avoirs DSI, code cadeau · L3d profil, notifications (Worker admin), paramètres
Worker Paiement, Worker admin
Toutes les salles membre fonctionnelles
4. Académie, moteur, Bibliothèque
L4a hub Académie · L4b moteur commun (découvrir, recherche, catégories, nouveautés, mes contenus, sélections, détail) · L4c lecteurs PDF/texte/HTML, progression, favoris
Worker Contenu
Une maison complète de bout en bout
5. Audio
Lecteur, lecture en arrière-plan, écran verrouillé, reprise
Worker Contenu
Écoute fiable app en arrière-plan
6. Vidéos
Lecteur, reprise, plein écran, accès protégé
Worker Contenu
Lecture fiable sur réseau faible
7. Formations
Modules, arbre de programme, progression
Worker Contenu ; vérifier d'abord le contrat « Mes formations » (non branché au Worker réel sur le site)
Parcours d'une formation complet
8. Boutique
Catalogue, produit, panier, paiement, achats, bibliothèque, codes, solde
Worker Boutique
Achat de bout en bout
9. Marketplace (acheteur)
Accueil, explorer, catégories, tendances, vendeurs, produit, achats, favoris, historique
Worker Marketplace
Achat de bout en bout
Option
Espace vendeur Marketplace (tableau de bord, produits, commandes, gains, analyses, réglages)
Worker Marketplace
À décider après l'étape 9
10. Communauté
Discussions, groupes, espaces, contacts, appels (LiveKit), notifications push
Worker communauté ; décision de périmètre à ce moment
À définir
11. Stabilisation / v1.0
Écran d'accueil à deux boutons, audit thème sombre, accessibilité, performance entrée de gamme, APK de release, synchronisation vers le dépôt privé
—
App opérationnelle ; sortie publique possible
Décisions déjà prises
Ordre des maisons : Bibliothèque, Audio, Vidéos, Formations.
Boutique et Marketplace avant Communauté.
Espace vendeur : option après l'étape 9.
Écran d'accueil et « mot de passe oublié » : voir ARCHITECTURE §8 et §15.
À trancher avant l'étape 0
Valeur de l'or clair en thème sombre.
Couleurs d'erreur, succès, alerte, information.
Élévations, espacement, flou sur Android 11 et moins.
React Native CLI ou Expo, et version de React Native.
« Se souvenir de moi » : comportement exact.
Les points 1, 2, 3 et 5 viennent directement de ton DESIGN-TOKENS et de ce que j'ai relevé dans les CSS. Pour avancer vite, je te propose de ne trancher que ce qui te concerne vraiment, et je prends les valeurs par défaut pour le reste :
Couleurs sémantiques : #B91C1C, #15803D, #B45309, #2563EB, parce que ce sont celles que le site utilise le plus (26, 10, 7 et 16 occurrences).
Or clair en sombre : une teinte or à faible opacité sur fond sombre. Je te donnerai la valeur exacte avec un aperçu dans le DESIGN-TOKENS.
Espacement : l'échelle déjà proposée.
Flou : sans flou sur Android 11 et moins, fond semi-opaque seul.
React Native CLI sans Expo, version figée à l'étape 0.
« Se souvenir de moi » : comme décrit dans l'architecture (R-SEC-6).
Valides-tu ces valeurs par défaut ? Si oui, j'enchaîne avec le DESIGN-TOKENS v1.1 pour React Native et les fiches de l'étape 0 pour Grok.