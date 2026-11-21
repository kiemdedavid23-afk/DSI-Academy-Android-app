# PLAN-ESPACE-VENDEUR.md — Espace vendeur Marketplace (application Android)

Version 1.1 du 20/11/2026 (mise à jour après le rapport des Workers). Complète `PLAN.md` et `ARCHITECTURE.md`. À lire avec :
- `docs/contrats/CONTRAT-ESPACE-VENDEUR.md` (**v1.1, validé**, routes et JSON imposés aux Workers, écarts de mise en œuvre au §15) ;
- `docs/contrats/rapport-worker-marketplace.md` (§7 candidature, §8 espace vendeur, §11 limites) ;
- le README du Worker Marketplace refondu (livré le 20/11/2026).

Rien n'est codé dans l'app tant que les points restant ouverts (§4) ne sont pas tranchés.

---

## 1. Ce que nous faisons

Construire dans l'app l'espace vendeur de la Marketplace : un tableau de bord complet (Aperçu, Produits, Ventes, Analyses, Plus), au niveau des captures de référence fournies le 20/11/2026, avec l'identité visuelle DSI et les données du Worker DSI.

Pourquoi un plan d'abord : il y a trois chantiers liés (Worker, contrat, app) et un risque de refaire un contrat ensuite. Le contrat v1 a été écrit pour éviter cela ; ce plan fixe l'ordre de travail et les décisions.

## 2. Point de départ (constats vérifiés)

| Sujet | État au 20/11/2026 |
|---|---|
| App | Un seul écran existe : `SellerIntroScreen` (introduction, sans appel réseau, bouton « Commencer » sans action). `CommerceHouseScreen` l'affiche pour la section `seller`. Aucun store, aucun endpoint vendeur. |
| Contrat | `CONTRAT-ESPACE-VENDEUR.md` v1.1 : **validé le 20/11/2026**. 23 routes, règles de calcul, 9 critères d'acceptation, écarts de mise en œuvre (§15). |
| Workers | **Marketplace** : refonte livrée selon le contrat (espace vendeur, `POST /track`, `by-slug`, routes publiques corrigées ; 42 vérifications passent sur le jeu de test de l'auteur). **Paiement** : route interne de solde ajoutée, Access Proof enrichi (prénom, nom, pays). Rapport des Workers du 20/11/2026. **Reste à vérifier en réel** : déploiement, base D1, appel Marketplace vers Paiement (lot S0). |
| Dépendances de l'app | Ni sélecteur d'images, ni bibliothèque de graphiques, ni accès fichiers. Disponibles : `react-native-svg`, presse-papiers, `Share` de React Native. |
| Statut vendeur | Aucune donnée de rôle dans la session ou le profil. Il vient uniquement de `GET /seller/application` (rapport §7.3). |

## 3. Décisions prises

| # | Décision | Source |
|---|---|---|
| D1 | Les routes et le JSON sont **imposés au Worker** par le contrat ; on ne rédige pas un second contrat ensuite. | Toi, 20/11/2026 |
| D2 | Le statut vendeur est **relu auprès du Worker à chaque ouverture** de l'espace vendeur. Le rôle n'est jamais déduit localement. | Rapport §7.3, §8 |
| D3 | Cinq onglets : **Aperçu, Produits, Ventes, Analyses, Plus**. | Captures du 20/11 |
| D4 | **Tous les montants sont en DSI** (entiers). L'app convertit en FCFA avec `core/config/pricing.ts`. | Contrat §1.3 |
| D5 | Aucune donnée fictive dans l'app (R-DATA-6). Les écrans affichent les quatre états (chargement, vide, erreur, données). | ARCHITECTURE §6, §7 |
| D6 | Un lot = une fiche dans `docs/fiches/`. Livraison : **fichiers complets dans un zip**, chemins depuis la racine du projet ; la CI (typecheck, lint, tests) valide chaque lot. | PLAN.md, ARCHITECTURE §14, toi |
| D7 | Architecture : écrans → stores → endpoints. Dossier `core/api/endpoints/marketplace/seller/` (triplet `.api.ts`, `.types.ts`, `.mapper.ts`). Les écrans n'importent jamais `@core/network` ni `@core/config` (R-LAY-5). | ARCHITECTURE §6 |
| D8 | Hors périmètre v1 : paniers récupérés, « Importer », « Générer avec l'IA », sélecteur de plusieurs boutiques, notifications poussées de vente. | Contrat §12 |
| D9 | Graphiques dessinés avec `react-native-svg` (courbe et barres simples). Aucune bibliothèque de graphiques ajoutée. | Dépendances existantes |
| D10 | Le retrait des gains réutilise l'écran « Mes retraits » et les routes du Worker Paiement. Aucune route de retrait côté Marketplace. | Contrat §7.4 |
| D11 | Tant que le service de fichiers n'est pas branché, un produit se crée **sans image** (la couverture est facultative). Le logo de boutique fonctionne déjà. | Rapport §11.1, rapport Workers §8 |
| D12 | **Le contrat v1.1 est validé.** Les écarts de mise en œuvre sont au §15 du contrat. Toute évolution passe par une nouvelle version. | Toi, 20/11/2026 |
| D13 | L'Access Proof est **opaque pour l'app** : transmis tel quel dans `X-Access-Proof`, jamais décodé, modifié ni journalisé. | Rapport Workers §2 |
| D14 | Solde : lu par le Worker Marketplace auprès du Paiement (route interne). Si indisponible, `overview` et `earnings` répondent 503 `CONFIG` **sans donnée partielle** : l'app affiche « solde momentanément indisponible » et n'invente jamais de solde. | Rapport Workers §1, §3.1 |
| D15 | Acheteur : nom et pays lus dans l'Access Proof ; `null` pour les achats antérieurs à l'enrichissement. L'app affiche « Acheteur » et masque le pays. | Rapport Workers §2, §3.7 |
| D16 | `POST /track` en « fire-and-forget » : jamais bloquant, rien hors ligne. L'export des ventes passe par un appel authentifié (pas un simple lien). | Rapport Workers §3.9, §3.12 |
| D17 | Aucun message technique n'est affiché : ni `error`, ni `financialReason`, ni `financialStatus`, ni `paymentRef`. L'app écrit ses messages selon statut et `code`. | Rapport Workers §1, §6 |
| D18 | **Le visuel de l'espace vendeur reproduit exactement les captures** (disposition, couleurs, formes, composants), hors logo et nom de la plateforme tierce. Valeurs : `docs/DESIGN-ESPACE-VENDEUR.md`. | Toi, 20/11/2026 |
| D19 | L'espace vendeur a **sa propre navigation** (barre du haut, barre à cinq onglets) et masque la barre principale de l'app. | Toi, 20/11/2026 |
| D20 | L'espace vendeur affiche les montants en **FCFA** (conversion entière des DSI du Worker, `dsiToFcfa`), comme les captures. | Mise en œuvre S4, 21/11/2026 |

## 4. Points tranchés et points ouverts

### Tranchés par la mise en œuvre des Workers (20/11/2026)

| Point | Résultat |
|---|---|
| **T1 — Solde réel** | **Tranché, option A.** Le Worker Paiement expose `GET /internal/dsi/balance/:memberId` ; le Marketplace la lit. Comportement si indisponible : décision D14. Reste à vérifier en réel que `PAYMENT_BALANCE_PATH` est renseigné (S0). L'option B (solde local de l'app) est abandonnée. |
| **T2 — Nom et pays de l'acheteur** | **Tranché.** L'Access Proof porte `firstName`, `lastName`, `displayName`, `country`. Les membres déjà connectés ont ces champs à `null` jusqu'à leur prochaine connexion (décision D15). |

### Ouverts

#### T3 — Revenu par produit : brut ou net — **tranché le 20/11/2026 (recommandation retenue)**
Brut pour « Chiffre d'affaires » ; **net** pour le revenu par produit et les meilleurs produits. À faire côté Worker : une ligne (`LISTING_STATS_SQL`), aucun nom de champ ne change ; le mapper de l'app lit `revenueDsi` tel quel. Historique : le Worker renvoie le brut au 20/11/2026.

#### T4 — Fond des écrans vendeur — **tranché** : fond blanc uni, cartes à contour, comme les captures (voir `DESIGN-ESPACE-VENDEUR.md`).

#### T5 — Navigation de l'espace vendeur — **tranché le 21/11/2026**
L'espace vendeur est un écran plein écran, à part entière, avec sa propre navigation (barre du haut et barre à cinq onglets). La barre principale de l'app n'y est pas affichée. Détails : `DESIGN-ESPACE-VENDEUR.md` §5.

#### T6 — Nouvelle dépendance pour les images — **tranché le 21/11/2026**
`react-native-image-picker` validé, ajouté au lot S3 (candidature) ; il servira aussi aux images de produit (S5) et à la Communauté. Justification complète : `docs/fiches/S3.md`.

#### T7 — Export des ventes
Pas de bibliothèque de fichiers dans l'app.
- **Recommandation** : appeler la route d'export avec la preuve, puis partager le contenu CSV par la feuille de partage Android (`Share`, en texte). Un vrai fichier `.csv` demanderait une dépendance de plus.

## 5. Étapes

Une étape = un lot livré, vérifié par la CI, puis le suivant. Chaque lot suit l'anatomie de `PLAN.md` : endpoints, fixtures, store, écrans, clés i18n (fr et en), tests, fiche.

| Lot | Contenu | Entrée requise | Sortie |
|---|---|---|---|
| **S0 — Mise en service des Workers** | Déployer le Marketplace, lancer `npm run db:migrate:002` une seule fois, vérifier que `PAYMENT_BALANCE_PATH` pointe sur la route interne du Paiement, se reconnecter pour obtenir une preuve enrichie, vérifier les 9 critères du contrat, **capturer les vraies réponses** de chaque route. | T3 tranché ; accès aux Workers déployés | Réponses réelles archivées ; critères 1 à 9 validés |
| **S1 — Fondations réseau** | `core/api/endpoints/marketplace/seller/` (peut démarrer sur les exemples du contrat v1.1 ; les fixtures sont remplacées par les réponses réelles de S0) : types, mappers, appels. Fixtures dans `contracts/marketplace/seller/` (issues de S0). Aides communes : période, objet `metric` (valeur, précédent, écart, tendance), conversion DSI vers FCFA. Mapping des erreurs. | S0 | Tests des mappers et des appels verts |
| **S2 — Suivi des visites** | `POST /track` à l'ouverture d'une boutique et d'une fiche produit ; clé visiteur UUID conservée localement ; rien en hors-ligne. | S1 | Les Analyses commencent à recevoir des données |
| **S3 — Statut et candidature** | `sellerStatusStore` ; porte d'entrée selon le statut (`none`, `PENDING`, `REJECTED`, `APPROVED`, `SUSPENDED`, `REVOKED`) ; formulaire de candidature avec les 4 fichiers ; suivi, motif de refus, redépôt. Dépendance T6. | S1, T6 | Un membre peut candidater et suivre sa candidature |
| **S4a — Thème et composants vendeur** | `sellerTheme.ts` (tokens mesurés sur les captures), barre du haut, barre d'onglets, boutons pastille, cartes d'indicateur, onglets segmentés, champ de recherche, carte produit, badges ; tests de valeurs. Voir `DESIGN-ESPACE-VENDEUR.md`. | S1 | Composants fidèles aux captures, thème clair |
| **S4 — Coque et Aperçu** | Écran plein écran avec barre à 5 onglets (T5) ; `sellerOverviewStore` ; Aperçu : bonjour, lien de boutique (copier, voir), anneau de complétude, solde et bouton « Retirer », ventes et commandes avec variation, bandeau de suspension. | S3, S4a | Aperçu fidèle à la capture, avec les données réelles |
| **S5 — Produits** | Liste (compteurs, filtres Tous/Publiés/Brouillons…, recherche, pagination) ; fiche ; création et modification ; soumettre, dépublier, dupliquer, archiver. | S4 | Cycle de vie complet d'un produit |
| **S6 — Ventes** | Période (7 j, 30 j, 12 mois, toujours), résumé, filtre de statut, liste paginée, détail, export (T7). | S4 | Écran Ventes fidèle à la capture |
| **S7 — Analyses** | Quatre indicateurs avec variation, courbe des revenus et des visites, entonnoir, meilleurs produits, pays. Graphiques en `react-native-svg` (D9). | S4, S2 | Écran Analyses avec données réelles |
| **S8 — Plus** | Profil de la boutique (nom, slogan, présentation, logo), avis reçus, gains détaillés, lien vers « Mes retraits », « Quitter l'espace vendeur ». | S4 | Réglages et avis fonctionnels |
| **S9 — Finition** | Thème sombre, accessibilité (cibles 44 px, libellés), parité fr/en, performance, APK de test avec le vrai Worker. | S5 à S8 | Espace vendeur prêt pour la recette |

Ordre conseillé : S0, S1, puis S2 en parallèle de S3 (pour que des visites s'accumulent dès que possible), puis S4 à S8, enfin S9.

## 6. Définition de « terminé » (par lot)

- Typecheck, lint et jest passent en CI.
- Aucun appel réseau depuis un écran (R-LAY-5) ; aucune donnée inventée (R-DATA-6).
- Les quatre états sont gérés ; les messages d'erreur sont écrits dans l'app, jamais le texte du Worker.
- Les clés i18n existent en français et en anglais (le test de parité passe).
- La fiche du lot est dans `docs/fiches/` ; les fichiers livrés sont complets et dans un zip.

## 7. Risques

| Risque | Parade |
|---|---|
| Le Paiement est injoignable : pas de solde (D14) | Message « solde momentanément indisponible », aucune valeur inventée |
| Nom et pays de l'acheteur vides jusqu'à reconnexion (D15) | Repli « Acheteur », pas de blocage |
| Le Worker diffère du contrat sur le terrain | S0 capture les vraies réponses ; les fixtures viennent d'elles, pas du contrat |
| Image de produit en 503 (service de fichiers) | D11 : création sans image |
| Écart entre le site et l'app sur le suivi des visites | Même route `POST /track`, même clé visiteur ; le site doit l'appeler aussi |
| La CI échoue sur des tests figés (valeurs de design) | Mise à jour des tests dans le même lot, comme pour les jetons de couleur |

## 8. Journal

| Date | Événement |
|---|---|
| 20/11/2026 | Décision : routes et JSON imposés au Worker (D1). Contrat v1 rédigé. |
| 20/11/2026 | Worker refondu selon le contrat par son concepteur ; non déployé. |
| 20/11/2026 | Plan rédigé ; décisions T1 à T7 en attente. |
| 20/11/2026 | Rapport des Workers reçu : route interne de solde au Paiement, Access Proof enrichi. T1 et T2 tranchés ; décisions D13 à D17 ajoutées. |
| 20/11/2026 | **Contrat v1.1 confirmé comme validé** (D12). Reste ouvert : T3 à T7. |
| 20/11/2026 | **Lot S1 livré** (fondations réseau : 3 fichiers, 21 fixtures, 52 tests, fiche `docs/fiches/S1.md`). Export CSV reporté au lot S6 (le client réseau ne lit que du JSON). |
| 21/11/2026 | T3, T4 et T5 tranchés ; décisions D18 (visuel identique aux captures) et D19 (navigation propre) ; lot S4a ajouté ; `DESIGN-ESPACE-VENDEUR.md` rédigé. Restent ouverts : T6, T7. |
| 21/11/2026 | Lot S2 livré : clé visiteur UUID v4 locale, `POST /track` à l'ouverture d'une fiche Marketplace (sans effet visible, rien hors-ligne, 1 envoi par cible et par 30 min). Suivi de la boutique prêt (`trackStoreView`) mais non branché : l'app n'a pas le `storeSlug` public. Bouton « formation gratuite » et fonction IA exclus du visuel. |
| 21/11/2026 | T6 tranché. Lot S3 livré : porte d'entrée par statut, assistant de candidature en 6 étapes, envoi des 4 fichiers puis dépôt, suivi, redépôt. Dépendance `react-native-image-picker` 8.2.1 : régénérer le lockfile avant la CI. |
| 21/11/2026 | Lot S4 livré avec le socle S4a nécessaire à l'Aperçu (thème, barre du haut, barre d'onglets, boutons, cartes) ; les composants des autres onglets viendront avec leurs lots. Entrée par « Ouvrir mon espace vendeur ». Correctif R-LAY-6 : `visitTracker` et `pickImage` déplacés dans `store/`. |
| 21/11/2026 | Lot S5 livré : onglet Produits (liste, filtres, recherche, pagination, menu d'actions) et assistant de création / modification en 3 étapes. Fiche `docs/fiches/S5.md`. Écarts avec les captures listés dans la fiche (fichier, formation, image, IA, import). |
| 21/11/2026 | Lot S6 livré : onglet Ventes (période, résumé, filtre, liste paginée, détail, export CSV construit dans l'app, T7 tranché ainsi en attendant validation). Fiche `docs/fiches/S6.md`. |
| 21/11/2026 | Lot S7 livré : onglet Analyses (4 indicateurs, 2 courbes, entonnoir, meilleurs produits, pays). `SellerSoonScreen` supprimé (plus d'onglet en attente). Fiche `docs/fiches/S7.md`. |
