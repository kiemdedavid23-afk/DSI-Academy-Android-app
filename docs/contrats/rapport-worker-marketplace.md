# Rapport Worker Marketplace DSI — guide de branchement de l’app

Source : code du worker `dsi-worker-marketplace` (paquet « conforme »), lu intégralement le 17 novembre 2026. Ce document suffit pour brancher l’app sans ouvrir le code du worker. Les points qui ne sont pas des règles mais des défauts ou des limites du worker sont regroupés en section 11.

## 1. L’essentiel en dix lignes

- **URL de base** : `https://dsi-worker-marketplace.raza-9-ck2261.workers.dev` (à mettre en configuration dans l’app, jamais en dur dans le code).
- **Format** : JSON partout, sauf les envois de fichiers (multipart).
- **Identité** : header `X-Access-Proof`, obtenu à la connexion auprès du Worker Paiement. L’app le stocke et le renvoie tel quel, sans jamais le lire.
- **Réponses** : toujours la même enveloppe `{ success, error, code, data }`.
- **Montants** : entiers en DSI, jamais de décimales. **Dates** : millisecondes depuis 1970 (`createdAt`).
- **Trois niveaux d’accès** : membre (catalogue, achats, favoris), candidat (dépôt et suivi de candidature), vendeur APPROVED (espace vendeur).
- **Achat** : exige un abonnement actif, un `Idempotency-Key` et une logique de reprise (section 6).
- **Pas de pagination** : les listes sont plafonnées côté serveur (section 2.5).
- **Pas de CORS pour une app native** : seul un WebView est concerné (section 2.3).
- **L’argent réel passe par le Worker Paiement** : le marketplace ne tient aucun solde, il demande des transferts.

## 2. Règles communes à toutes les routes

### 2.1 Enveloppe de réponse

Succès :

```json
{ "success": true, "error": null, "code": null, "data": { } }
```

Échec :

```json
{ "success": false, "error": "message lisible", "code": "CODE_MACHINE", "data": null }
```

Règle d’or pour l’app : **décider à partir du statut HTTP et de `code`, jamais du texte de `error`**. Ce texte est technique, parfois en français, parfois contient des détails serveur. Le site fait pareil : il le traduit en messages utilisateur par statut et par code. Une route inconnue renvoie 404 `NOT_FOUND`. Une exception non prévue renvoie 500 `INTERNAL`.

### 2.2 Authentification : l’Access Proof

- **Où l’obtenir** : `POST {WORKER_PAIEMENT}/api/auth/connexion` avec `{ "identifiant": ..., "motDePasse": ... }`. Quand le compte est actif, la réponse contient `accessProof` (en plus de `token`, `userId`, `subscriptionActive`, `dateFin`…). URL du Worker Paiement dans la config du site : `https://dsi-worker-paiement.azo9-com234-az09.workers.dev`.
- **Comment l’envoyer** : header `X-Access-Proof: <chaîne>` sur toutes les routes marquées 🔒 plus bas. Ni `Authorization: Bearer`, ni `?userId=`, ni `userId` dans le body ne sont jamais lus par le marketplace.
- **Ce que le worker en retient** : `userId` (qui est l’acheteur ou le vendeur) et `subscriptionActive` (droit d’acheter). Tout `memberId`, `buyerId`, `sellerId` ou `userId` envoyé dans un body est ignoré.
- **Durée** : la preuve observée vaut 7 jours (émission → expiration). Passé ce délai : 401 `ACCESS_PROOF_EXPIRED`.
- **Conséquence importante** : l’abonnement est lu **dans la preuve**, pas en base. Si le membre renouvelle son abonnement, l’app doit refaire une connexion pour obtenir une preuve neuve, sinon les achats continuent d’échouer en `SUBSCRIPTION_INACTIVE`.

Codes d’échec d’auth (tous 401) : `ACCESS_PROOF_MISSING` (header absent), `ACCESS_PROOF_INVALID` (format ou signature faux, émetteur non reconnu), `ACCESS_PROOF_EXPIRED`. Comportement attendu de l’app : sur n’importe lequel des trois, effacer la session et renvoyer vers la connexion. Un 500 `CONFIG` à cet endroit signifie que la clé publique de vérification manque côté serveur : ce n’est pas un problème de l’app.

### 2.3 CORS et type de client

- **App Android native** (OkHttp, Retrofit, Ktor) : aucun en-tête `Origin` n’est envoyé, donc aucune règle CORS ne s’applique. Rien à configurer.
- **WebView** (ou Capacitor, ou tout code web embarqué) : l’`Origin` est envoyé et doit figurer dans la liste des origines autorisées, gérée par l’Admin (par exemple `https://localhost` ou `capacitor://localhost`). Sinon la réponse n’a pas d’en-têtes CORS et le moteur web la bloque. La comparaison est exacte, sans joker.
- En-têtes acceptés en CORS : `Content-Type`, `Authorization`, `X-Access-Proof`, `Idempotency-Key` (et les en-têtes inter-workers, inutiles pour l’app).

### 2.4 Idempotence

- **Achat** : obligatoire (section 6).
- **Envois de fichiers** : champ facultatif `idempotencyKey` dans le formulaire. Il sert à nommer le fichier ; il n’empêche pas un doublon si l’app renvoie deux fois.

### 2.5 Plafonds de listes (pas de pagination)

| Route | Plafond |
| --- | --- |
| Catalogue | 200 produits (triés par score) |
| Tendances | 40 |
| Vendeurs | 100 |
| Mes commandes | 50 |
| Historique de paiement | 100 |
| Avis d’un produit | 100 |
| Commandes vendeur | 50 |
| Mouvements vendeur (ledger, portfolio) | 100 |
| `catalog?ids=` | 100 identifiants |
| Favoris | non plafonné |

### 2.6 Codes d’erreur et réaction recommandée

| Code | HTTP | Sens | Réaction de l’app |
| --- | --- | --- | --- |
| `VALIDATION` | 422 | Champ manquant ou invalide | Corriger la saisie, ne pas réessayer à l’identique |
| `NOT_FOUND` | 404 | Objet introuvable ou non visible | Écran « introuvable » |
| `FORBIDDEN` | 403 | Pas le droit (pas vendeur, pas acheteur payé…) | Masquer l’action |
| `CONFLICT` | 409 | Déjà fait (candidature, avis, clé réutilisée) | Afficher l’état existant |
| `SUBSCRIPTION_INACTIVE` | 403 | Abonnement inactif dans la preuve | Écran abonnement, puis reconnexion |
| `LISTING_PRIVATE` | 403 | Produit non vendable | Retirer du parcours |
| `SELF_PURCHASE_FORBIDDEN` | 403 | Achat de son propre produit | Masquer le bouton |
| `SELLER_UNAVAILABLE` | 403 | Vendeur suspendu ou révoqué | Produit indisponible |
| `INSUFFICIENT_BALANCE` | 402 | Solde DSI insuffisant | Proposer de recharger |
| `PAYMENT_REJECTED` | 402 | Paiement refusé par le Worker Paiement | Message d’échec |
| `ACCESS_PROOF_*` | 401 | Voir 2.2 | Reconnexion |
| `QUOTA` | 429 | Service amont saturé | Réessayer plus tard |
| `UPSTREAM` | 502 | Service amont en échec ou résultat indéterminé | Voir section 6 pour l’achat |
| `CONFIG` / `UNAVAILABLE` | 503 | Configuration serveur manquante | « Service momentanément indisponible » |
| `INTERNAL` | 500 | Erreur inattendue | « Réessayez plus tard » |

Le cas réseau (timeout, pas de connexion) n’a pas de code serveur : l’app le gère elle-même.

## 3. Modèle de données vu par l’app

### 3.1 Statuts

- **Candidature** : `none` (aucune), `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`. Le champ `reason` explique un refus.
- **Vendeur** : `APPROVED`, `SUSPENDED`, `REVOKED`.
- **Produit (listing)** : `pending_review`, `published`, `rejected`, `suspended`, `draft`, `archived`. Seul `published` est visible dans le catalogue.
- **Commande** : `pending_payment`, `processing`, `paid`, `failed`, `refunded`. Aucune route ne produit `refunded` aujourd’hui.
- **Statut financier** : `COMPLETED`, `REJECTED`, `PROCESSING`, ou null.
- **Visibilité** : `PUBLIC` ou `PRIVATE`. C’est un souhait du vendeur, pas une publication : un produit n’est jamais publié sans modération Admin.

### 3.2 Objet produit (renvoyé partout où il y a un produit)

| Champ | Type | Remarque |
| --- | --- | --- |
| `id` | texte | forme `lst_xxxxxxxxxxxx` |
| `sellerId` | texte | identifiant du membre vendeur |
| `title`, `name` | texte | identiques (deux noms pour compatibilité) |
| `description` | texte |  |
| `category` | texte | slug de catégorie |
| `priceDsi` | entier | 0 = gratuit |
| `free` | booléen | `priceDsi == 0` |
| `status` | texte | voir 3.1 |
| `coverFileId`, `imageFileId` | texte ou null | identiques |
| `coverUrl` | texte ou null | URL publique de l’image, prête à charger |
| `hasAsset` | booléen |  |
| `deliveryType` | texte | `URL` uniquement aujourd’hui |
| `visibility` | texte | `PUBLIC` ou `PRIVATE` |
| `salesCount` | entier |  |
| `createdAt` | entier | millisecondes |

L’URL de livraison (`deliveryUrl`) n’apparaît **jamais** ici : elle n’est donnée que par la route de livraison d’une commande payée.

Les routes de catalogue ajoutent : `storeName`, `visibilityScore` (0 à 1), `salesTotal`, `salesRecent` (14 derniers jours), `reviewAvg`, `reviewCount`, `favoritesCount`. Le classement est calculé côté serveur : 35 % ventes, 25 % tendance, 20 % avis, 10 % favoris, 10 % nouveauté. L’app affiche l’ordre reçu, sans retrier.

## 4. Routes sans connexion (catalogue public)

Le catalogue est lisible sans abonnement et sans preuve.

**`GET /health`** → `{ service, status: "up" }`. Pour un test de joignabilité.

**`GET /api/marketplace/catalog`** — paramètres facultatifs : `category` (slug ; `all` ou absent = tout), `q` (texte cherché dans le titre, insensible à la casse). Réponse : `{ items: [produit + extras] }`. Seuls les produits `published`, `PUBLIC`, de vendeurs `APPROVED` sortent.

**`GET /api/marketplace/catalog?ids=a,b,c`** — même format, pour hydrater des favoris ou un panier. L’ordre demandé est conservé ; les produits indisponibles sont simplement absents de la réponse. 100 ids maximum.

**`GET /api/marketplace/catalog/:id`** → un produit (+ extras). 404 s’il n’est pas publié, est privé, ou si le vendeur n’est plus APPROVED.

**`GET /api/marketplace/catalog/:id/reviews`** → `{ listingId, reviews: [{ id, rating, comment, createdAt }] }`. Aucun auteur n’est exposé.

**`GET /api/marketplace/categories`** → `{ categories: [{ category, count }] }`. Attention : ce sont les catégories **réellement utilisées** par des produits publiés, avec leur nombre, pas le référentiel Admin (voir section 11).

**`GET /api/marketplace/trending`** → `{ items: [produit + extras] }`, 40 maximum, triés d’abord par ventes récentes.

**`GET /api/marketplace/sellers`** → `{ sellers: [{ memberId, storeName, bio, rating, productsCount }] }`.

**`GET /api/marketplace/sellers/:memberId`** → `{ seller: { memberId, storeName, bio, rating, productsCount }, products: [produit + visibilityScore] }`. 404 si le vendeur n’est pas APPROVED.

Les vendeurs n’exposent **aucun logo** dans ces réponses (voir section 11).

## 5. Routes membre connecté 🔒 (Access Proof)

### 5.1 Achat et commandes

**`POST /api/marketplace/orders`** — corps : `{ "listingId": "lst_…", "idempotencyKey": "…" }`. La clé peut aussi venir du header `Idempotency-Key` (8 à 128 caractères, obligatoire). Fonctionnement complet en section 6. Réponse (HTTP 200) :

```json
{ "orderId": "mp_…", "status": "paid|processing", "priceDsi": 100,
  "commissionDsi": 10, "feesDsi": 0, "financialOperationId": "marketplace_finop_…",
  "paymentRef": "…", "financialStatus": "COMPLETED|PROCESSING" }
```

Une relecture d’une demande déjà traitée ajoute `replay: true` (et `reconciled: true` si le statut a été vérifié auprès du Paiement). Un produit gratuit est marqué `paid` immédiatement avec `paymentRef: "free"`.

**`GET /api/marketplace/me/orders`** → `{ orders: [{ id, listingId, listingTitle, sellerId, priceDsi, status, createdAt }] }`.

**`GET /api/marketplace/me/orders/:id`** → `{ order: { id, listingId, listingTitle, sellerId, priceDsi, status, paymentRef, financialOperationId, financialStatus, financialReason, createdAt } }`. 404 si la commande n’est pas celle du membre.

**`GET /api/marketplace/me/orders/:id/delivery`** → `{ orderId, listingId, deliveryType: "URL", deliveryUrl, title }`. 403 tant que la commande n’est pas `paid`. 503 `UNAVAILABLE` si le vendeur n’a pas configuré d’URL. L’app ouvre `deliveryUrl` dans le navigateur ou un WebView.

**`POST /api/marketplace/me/orders/:id/reconcile`** (sans corps) — redemande l’état au Worker Paiement pour une commande non terminée. Réponse : `{ orderId, status, priceDsi, financialOperationId, paymentRef, financialStatus, financialReason, reconciled: true }`, ou `alreadyPaid: true` si déjà payée. Ne crée jamais un second débit.

**`GET /api/marketplace/me/payment-history`** → `{ memberId, source, items: [{ orderId, listingId, listingTitle, sellerId, amountDsi, status, paymentRef, financialOperationId, financialStatus, financialReason, createdAt }] }`. C’est l’historique des achats marketplace, pas le journal complet du compte DSI.

### 5.2 Avis

**`POST /api/marketplace/listings/:id/reviews`** — corps `{ "rating": 1..5 (entier), "comment": "…" (facultatif, 2000 caractères max) }`. Réponse 201 : `{ id, listingId, rating, orderId }`. Conditions : avoir une commande `paid` pour ce produit (sinon 403), un seul avis par membre et par produit (sinon 409). L’abonnement n’est pas exigé ici.

### 5.3 Favoris

- **`GET /api/marketplace/me/favorites`** → `{ listingIds: [..] }` (du plus récent au plus ancien). Pour afficher les produits : appeler ensuite `catalog?ids=`.
- **`POST /api/marketplace/me/favorites`** — corps `{ "listingId": "…" }` → `{ listingId }`. Ajouter deux fois est sans effet.
- **`DELETE /api/marketplace/me/favorites/:listingId`** → `{ listingId }`.

## 6. Flux d’achat détaillé (à suivre à la lettre)

### 6.1 Ce que le serveur fait

1. Vérifie la preuve, puis `subscriptionActive` (sinon 403 `SUBSCRIPTION_INACTIVE`).
2. Exige `listingId` et une clé d’idempotence de 8 à 128 caractères (sinon 422).
3. Si une commande existe déjà avec **la même clé pour le même membre** : il rejoue (et vérifie l’état auprès du Paiement si besoin). Même clé avec un autre produit : 409 `CONFLICT`.
4. Contrôles produit : publié (404 sinon), non privé (403 `LISTING_PRIVATE`), pas le sien (403 `SELF_PURCHASE_FORBIDDEN`), vendeur APPROVED (403 `SELLER_UNAVAILABLE`).
5. Calcule : `commission = floor(prix × 1000 / 10000)` (soit **10 %** avec la configuration actuelle `COMMISSION_BPS = 1000`), `frais = 0` (`FEES_BPS = 0`), `net vendeur = prix − commission − frais`. Le Paiement reçoit le montant **brut** ; la commission est transmise à part.
6. Prix 0 : commande payée tout de suite, aucun appel financier.
7. Sinon : demande un transfert au Worker Paiement, puis selon le résultat :

| Résultat du Paiement | Réponse de l’app | Commande |
| --- | --- | --- |
| Terminé avec référence | 200, `status: paid` | `paid`, vendeur crédité |
| Refusé | 402 `INSUFFICIENT_BALANCE` ou `PAYMENT_REJECTED` | `failed` |
| En cours | 200, `status: processing` | `processing` |
| Indéterminé (réseau, réponse illisible) | 502 `UPSTREAM` | `pending_payment`, opération conservée |
| Paiement non configuré côté serveur | 503 `CONFIG` | `failed` |

### 6.2 Ce que l’app doit faire

- **Générer une clé par intention d’achat** (un UUID suffit), la garder en mémoire tant que cette intention n’est pas résolue, et la réutiliser **uniquement** pour réessayer la même intention après un incident réseau.
- **Nouvelle intention = nouvelle clé.** Une commande refusée ou en échec est rejouée telle quelle avec la même clé. Après un solde insuffisant et une recharge, le nouvel essai doit donc partir avec une **nouvelle** clé.
- **Sur 502 `UPSTREAM`** : la réponse ne contient pas d’`orderId`. Pour savoir ce qui s’est passé, renvoyer **la même requête avec la même clé** : le serveur répond `replay: true` avec l’`orderId` et le statut, après vérification auprès du Paiement. Ne jamais regénérer une clé dans ce cas, c’est ce qui évite un double débit.
- **Sur `processing`** : proposer « Vérifier le paiement » qui appelle `POST /me/orders/:id/reconcile`, ou relire `GET /me/orders/:id`. Arrêter quand le statut est `paid` ou `failed`.
- **Sur `paid`** : appeler `GET /me/orders/:id/delivery` pour obtenir le lien, et proposer l’avis (section 5.2).
- **Désactiver le bouton d’achat pendant la requête** pour éviter deux intentions simultanées.

## 7. Candidature vendeur 🔒

Le parcours se fait en trois temps. Les fichiers partent **d’abord**, la candidature ensuite avec les identifiants de fichiers reçus.

### 7.1 Envoi d’un fichier

**`POST /api/marketplace/seller/application/files`** — `multipart/form-data` avec ces champs, noms exacts :

| Champ | Obligatoire | Valeurs |
| --- | --- | --- |
| `file` | oui | le fichier (8 Mo maximum, non vide) |
| `kind` | oui | `logo`, `id_front`, `id_back` ou `id_selfie` |
| `idempotencyKey` | non | texte libre |

Réponse 201 : `{ fileId, kind, private: true }`. Les quatre fichiers sont des envois séparés, un par `kind`. Ils sont stockés en privé (jamais lisibles par un membre). Erreurs : 422 (champ ou taille), 503 `CONFIG` (stockage non configuré), 429 `QUOTA`, 502 `UPSTREAM`. Côté Kotlin : construire un `MultipartBody` avec ces noms de parties, fournir le type MIME du fichier, et **ne pas fixer le `Content-Type` à la main** (la bibliothèque ajoute la boundary). Le site réduit et recompresse les images avant envoi ; l’app devrait faire de même pour rester sous 8 Mo.

### 7.2 Dépôt de la candidature

**`POST /api/marketplace/seller/application`** — tous les champs sont obligatoires :

```json
{ "storeName": "max 80 caractères", "slogan": "max 120", "description": "max 2000",
  "logoFileId": "…", "idDocumentFrontFileId": "…",
  "idDocumentBackFileId": "…", "idSelfieFileId": "…" }
```

Réponse : `{ status: "PENDING", submittedAt, applicationId }`. 409 `CONFLICT` si une candidature est déjà `PENDING` ou `APPROVED`. Un candidat `REJECTED` ou `SUSPENDED` peut redéposer avec la même route, ou avec **`POST /api/marketplace/seller/application/resubmit`** (identique).

### 7.3 Suivi

**`GET /api/marketplace/seller/application`** → `{ status: "none" }` si rien n’a été déposé, sinon `{ id, memberId, storeName, slogan, description, logoFileId, status, reason, submittedAt, reviewedAt }`. Les pièces d’identité ne sont jamais renvoyées.

À l’approbation par l’Admin : le profil vendeur est créé, le logo devient public. Le candidat n’a rien d’autre à faire que de relire son statut (l’app doit le relire à l’ouverture de l’espace vendeur ; aucune notification poussée n’est fournie par ce worker).

## 8. Espace vendeur 🔒

Deux niveaux de garde :

- **Lecture** (tableau de bord, listes, gains, réglages) : vendeur `APPROVED`, `SUSPENDED` ou `REVOKED`. L’historique reste donc consultable.
- **Action commerciale** (créer, modifier, archiver un produit, envoyer une image, modifier les réglages) : vendeur `APPROVED` uniquement, sinon 403 `FORBIDDEN`.

Un membre qui n’est pas vendeur reçoit 403 sur toutes ces routes : l’app doit d’abord lire le statut de candidature.

| Route | Réponse |
| --- | --- |
| `GET /seller/dashboard` | `{ sellerStatus, suspensionType, suspensionReason, suspensionEndsAt, revokedAt, products, orders, revenueDsi }` |
| `GET /seller/portfolio` | `{ sellerId, sellerStatus, creditedTotalDsi, flows: [{ id, orderId, listingId, amountDsi, type, paymentRef, financialOperationId, orderStatus, createdAt }], balanceSource: "WORKER_PAIEMENT" }` |
| `GET /seller/listings` | `{ items: [produit] }` (tous statuts) |
| `GET /seller/listings/pending` | `{ items: [produit] }` (en modération) |
| `GET /seller/orders` | `{ orders: [{ id, listingId, buyerId, priceDsi, netSellerDsi, status, createdAt }] }` |
| `GET /seller/orders/:id` | `{ order: { id, listingId, listingTitle, buyerId, priceDsi, netSellerDsi, commissionDsi, feesDsi, status, paymentRef, financialOperationId, financialStatus, createdAt } }` |
| `GET /seller/earnings` | `{ availableDsi, ledger: [{ id, orderId, amountDsi, type, createdAt }] }` |
| `GET /seller/analytics` | `{ topListings: [{ id, title, sales_count, status }] }` |
| `GET /seller/settings` | `{ storeName, bio, status, rating }` |

Tous ces chemins sont préfixés par `/api/marketplace`. Deux précisions : `availableDsi` et `creditedTotalDsi` sont des **sommes de crédits enregistrés par le marketplace**, pas le solde réel. Le solde réel se lit auprès du Worker Paiement (`balanceSource` le rappelle). Et `analytics` renvoie `sales_count` en **snake\_case**, contrairement au reste.

### 8.1 Créer un produit

**`POST /api/marketplace/seller/listings`**, vendeur APPROVED.

| Champ | Règle |
| --- | --- |
| `name` (ou `title`) | obligatoire, 120 caractères max |
| `description` | obligatoire, 5000 max |
| `deliveryType` | `URL` uniquement (défaut) |
| `deliveryUrl` | obligatoire, URL `http` ou `https` valide |
| `category` (ou `categoryId`) | obligatoire ; slug du référentiel Admin actif, ou à défaut `tools`, `templates`, `courses`, `assets`, `services`, `other` |
| `priceDsi` | obligatoire, entier ≥ 0 (0 = gratuit) |
| `imageFileId` (ou `coverFileId`) | facultatif, identifiant renvoyé par l’envoi d’image |
| `visibility` | `PUBLIC` (défaut) ou `PRIVATE` |
| `assetFileId` | **refusé** (422) |

Réponse 201 : `{ listing: { id, sellerId, name, title, description, category, priceDsi, free, deliveryType, imageFileId, visibility, status: "pending_review" } }`. Le statut est toujours `pending_review` ; le vendeur ne publie jamais lui-même.

### 8.2 Modifier, archiver

**`PATCH /seller/listings/:id`** — champs acceptés : `title`, `description`, `category`, `priceDsi`, `coverFileId`, `status: "draft"`. Réponse : `{ id, status }`. Règles : modifier titre, prix, catégorie ou description d’un produit `published` le renvoie en `pending_review` ; envoyer `status: "published"` donne 403 ; un produit `suspended` ne se modifie pas. Voir les limites en section 11 (prix, catégories).

**`DELETE /seller/listings/:id`** → `{ id, status: "archived" }`. Archivage logique, jamais de suppression : commandes, avis et gains restent intacts.

### 8.3 Envoyer une image de produit

**`POST /seller/listings/images`**, vendeur APPROVED, multipart : `file` (12 Mo max), `kind` (`product_image` par défaut, ou `product_cover`/`cover`), `idempotencyKey` facultatif. Réponse 201 : `{ fileId, publicUrl, mode }` où `mode` vaut `public_direct` si `publicUrl` est fourni. Le `fileId` se place ensuite dans `imageFileId` à la création du produit. Ce flux dépend d’un service de fichiers séparé (voir section 11 : il n’est pas configuré dans le dépôt fourni).

### 8.4 Réglages

**`PATCH /seller/settings`** — corps `{ "storeName": "…", "bio": "…" }` (chaque champ facultatif ; absent = inchangé) → `{ updated: true }`. Vendeur APPROVED uniquement.

## 9. Médias

**`POST /api/marketplace/media/:fileId/read-url`** 🔒 (sans corps) → `{ fileId, url, mode }` avec `mode` = `public_direct` (cover de produit publié ou logo de vendeur approuvé) ou `entitled` (fichier d’un produit acheté, ou propre fichier du vendeur). 403 pour tout autre fichier, et **toujours** 403 pour une pièce d’identité. L’URL est de la forme `https://drive.google.com/uc?export=view&id=<fileId>`. Dans la plupart des cas inutile : `coverUrl` est déjà fourni dans les objets produit. À utiliser pour les logos de vendeurs, qu’aucune route ne renvoie sous forme d’URL.

## 10. Routes internes (Admin) : hors périmètre de l’app

Elles commencent par `/internal/`, exigent une signature HMAC entre Workers et n’acceptent que le service `admin`. L’app ne doit **jamais** les appeler ni embarquer un secret. Pour mémoire :

- candidatures : lister, lire, `approve`, `reject` ;
- vendeurs : lister, lire, `suspend`, `restore`, `revoke` ;
- commandes : consultation Admin ;
- produits : lister, lire, `moderate` (`published`, `rejected`, `suspended`) ;
- tendances ; catégories (créer, modifier, désactiver) ; origines CORS (créer, modifier, désactiver).

## 11. État du déploiement et pièges à connaître

### 11.1 Configuration observée

- `ENVIRONMENT = production`, `DEV_SKIP_PAYMENT = 0` : le contournement de paiement est impossible en production. Tout achat payant passe par le Worker Paiement.
- **Envois de fichiers de candidature** : fonctionnent par un compte de service Google. Google refuse l’écriture dans un « Mon Drive » ordinaire (erreur `storageQuotaExceeded`). Une migration vers un envoi au nom d’un compte Google réel (OAuth) est en cours ; tant qu’elle n’est pas terminée, l’app recevra 502 sur ces envois.
- **Envoi d’images produit** : `FICHIERS_SERVICE_URL` est vide dans `wrangler.toml` (et vide dans le tableau de bord). La route répond donc 503 `CONFIG` tant qu’un service de fichiers n’est pas branché. L’app doit prévoir ce cas : créer un produit **sans image** est possible (le champ est facultatif).
- Notifications : `NOTIFICATIONS_WORKER_URL` vide, donc aucun événement n’est émis. Sans effet sur l’app.

### 11.2 Limites et incohérences du worker (à connaître, ne pas « corriger » côté app)

1. **Catégories** : `GET /categories` ne donne pas la liste des catégories autorisées, seulement celles qui ont des produits publiés. L’app doit donc embarquer la liste `tools`, `templates`, `courses`, `assets`, `services`, `other`, ou la lire par une route que le worker n’offre pas encore. À la création, les catégories du référentiel Admin sont acceptées en plus ; à la **modification**, seule la liste intégrée est acceptée.
2. **Prix en modification** : `PATCH` refuse `priceDsi` à 0 (« strictement positif »), alors que la création l’autorise. Un produit créé gratuit ne peut pas être repassé payant puis gratuit.
3. **Visibilité** : `trending` et `GET /sellers/:id` ne filtrent pas les produits `PRIVATE`. Une app prudente masque elle-même `visibility == "PRIVATE"`.
4. **Logos de vendeurs** : aucune réponse publique ne contient le logo (ni `logoFileId`, ni URL). Seul le candidat voit son propre `logoFileId`, et `read-url` permet d’en obtenir l’URL.
5. **Favoris** : `POST /me/favorites` avec un corps invalide donne un 500 `INTERNAL` au lieu d’un 422. Toujours envoyer un JSON valide.
6. **Pas de remboursement ni d’annulation** : aucune route côté membre ne les propose.
7. **Recherche** : `q` ne cherche que dans le titre.
8. **Aucun accès hors ligne** : tout dépend du réseau ; l’app peut mettre le catalogue en cache, mais la preuve d’abonnement et l’état des commandes doivent toujours être relus au démarrage.

## 12. Check-list de branchement pour l’app

**Socle réseau**

- Une seule classe cliente avec l’URL de base en configuration, un intercepteur qui ajoute `X-Access-Proof` sur les routes 🔒, et un décodeur de l’enveloppe `{ success, error, code, data }`.
- Les erreurs sont mappées par **statut + code** vers des messages utilisateur écrits dans l’app, jamais en affichant `error`.
- Sur 401 `ACCESS_PROOF_*` : effacer la session, rediriger vers la connexion.
- Montants en `Long` (ou `Int`), dates en `Long` millisecondes.
- Stocker la preuve de façon sécurisée (EncryptedSharedPreferences ou équivalent), sans la décoder.

**Écrans et routes**

| Écran de l’app | Routes |
| --- | --- |
| Accueil Marketplace | `catalog`, `trending`, `categories` |
| Recherche et filtres | `catalog?q=&category=` |
| Fiche produit | `catalog/:id`, `catalog/:id/reviews`, `favorites` |
| Boutique d’un vendeur | `sellers`, `sellers/:memberId` |
| Favoris | `me/favorites`, puis `catalog?ids=` |
| Achat | `orders`, `me/orders/:id`, `reconcile`, `delivery` |
| Mes achats | `me/orders`, `me/payment-history` |
| Donner un avis | `listings/:id/reviews` |
| Devenir vendeur | `seller/application` (GET/POST), `seller/application/files` |
| Espace vendeur | `seller/dashboard`, `listings`, `orders`, `earnings`, `portfolio`, `analytics`, `settings` |
| Nouveau produit | `seller/listings`, `seller/listings/images` |

**À faire vérifier à chaque livraison de code**

- Aucune route `/internal/` appelée, aucun secret HMAC dans l’app.
- Une clé d’idempotence par intention d’achat, réutilisée uniquement pour la reprise (section 6.2).
- Les 502 `UPSTREAM` d’un achat ne génèrent pas de nouvelle clé.
- Le statut de commande `processing` mène à une action de vérification.
- La preuve est renouvelée par reconnexion après expiration et après renouvellement d’abonnement.
- Les envois multipart n’imposent pas de `Content-Type` manuel et respectent 8 Mo (candidature) et 12 Mo (images).
- Les produits `PRIVATE` sont masqués côté app quand ils apparaissent.
