# CONTRAT 1 — BRANCHEMENT DE LA PLATEFORME
## Frontend / Application DSI Academy ↔ Worker Boutique DSI

**Base** : code réel du Worker Boutique (`src/index.js`, `src/access-proof.js`). Aucun secret Worker n'est exposé à la plateforme dans ce contrat — seule l'Access Proof (déjà émise par le Worker Paiement) doit être transmise par le Frontend, en tant que donnée opaque qu'il ne décode ni ne modifie.

---

## Annexe A — Authentification membre (Access Proof)

**Mécanisme** : preuve cryptographique ECDSA P-256/SHA-256, émise par le Worker Paiement, vérifiée localement par le Worker Boutique — **aucun appel réseau vers Paiement pour l'authentification**.

**Header obligatoire sur toute route « Catégorie B »** :

| Header | Format exact |
|---|---|
| `X-Access-Proof` | `<chargeEncodée>.<signatureEncodée>` — deux segments base64url séparés par un point |

**Ce que le Frontend doit faire** : transmettre tel quel la valeur reçue lors de la connexion/session. **Ne jamais** décoder, modifier, reconstruire, ou envoyer à la place un `Authorization: Bearer` (mécanisme distinct, propre au Worker Paiement, non accepté par la Boutique).

**Erreurs d'authentification possibles** (toutes en réponse `{ success:false, error, code, data:null }`) :

| Code | HTTP | Signification |
|---|---|---|
| `ACCESS_PROOF_MISSING` | 401 | En-tête absent |
| `ACCESS_PROOF_INVALID` | 401 | Structure, signature, ou charge invalide/illisible |
| `ACCESS_PROOF_INVALID_ISSUER` | 401 | Émetteur ≠ `DSI_PAIEMENT` |
| `ACCESS_PROOF_EXPIRED` | 401 | Preuve expirée |
| `ACCOUNT_ACCESS_DENIED` | 403 | `accountStatus` du membre ≠ `"active"` |

**Comportement attendu du Frontend pour chacune** : ré-obtenir une Access Proof valide auprès du flux d'authentification standard (hors périmètre Boutique) puis réessayer. Pour `ACCOUNT_ACCESS_DENIED`, ne pas réessayer automatiquement — informer l'utilisateur que son compte n'est pas autorisé.

## Annexe B — Enveloppe de réponse commune

Toutes les routes de ce contrat répondent avec cette structure JSON, quel que soit le résultat :
```json
{ "success": true, "error": null, "code": null, "data": { /* ... */ } }
```
ou, en cas d'erreur :
```json
{ "success": false, "error": "message lisible", "code": "CODE_MACHINE", "data": null }
```

## Annexe C — CORS

Toutes les routes publiques et membre répondent avec `Access-Control-Allow-Origin` fixé à la valeur de configuration `ALLOWED_ORIGIN` du Worker (un seul domaine autorisé, pas de wildcard).

---

# CATÉGORIE A — ROUTES PUBLIQUES (aucune authentification)

## A.1 — Consultation du catalogue

- **Méthode / URL** : `GET /api/shop/catalog`
- **Statut** : public
- **Paramètres de requête** : `category` (string, facultatif — filtre exact ; `"all"` ou absent = pas de filtre) ; `q` (string, facultatif — recherche texte sur titre/accroche, insensible à la casse, appliquée côté serveur après lecture)
- **⚠️ Pas de paramètre `ids`** : contrairement à certains autres catalogues de l'écosystème (ex. `catalog?ids=`), cette route ne permet pas de résoudre un lot d'identifiants précis. Voir « Points explicitement non formalisés » plus bas pour l'impact sur l'hydratation des favoris.
- **Corps** : aucun
- **Traitement** : lecture de tous les produits `status = 'published'`, triés `featured DESC, updated_at DESC`, limités à 200 résultats, puis filtre texte optionnel en mémoire.
- **Réponse `200`** :
```json
{ "success": true, "data": { "items": [ {
  "id": "prod_abc123", "sku": "FORM-001", "title": "Formation X", "tagline": "...",
  "description": "...", "category": "formations", "priceDsi": 1500, "status": "published",
  "featured": false, "badge": null, "coverFileId": "file_cover_1",
  "coverUrls": ["https://i.ibb.co/abc123/cover1.jpg", "https://files.catbox.moe/xyz.png"],
  "hasAsset": true
} ] } }
```
- **Signification des champs** :
  - `hasAsset` indique la présence d'un fichier numérique associé, sans jamais exposer son identifiant réel (`asset_file_id` n'est pas dans cette réponse — seul `coverFileId`, destiné à l'affichage public, l'est).
  - `coverUrls` — **galerie de couvertures externes**, ajoutée après la première version de ce contrat. Tableau d'URL directes (hébergées hors Worker — imgbb, catbox, etc.), publiques, sans authentification, prêtes à être chargées telles quelles par le Frontend (`<img src>` direct). Toujours un tableau, jamais `undefined` ; `[]` si aucune couverture n'a été associée. Aucune limite de nombre. Distinct de `coverFileId` (ancien mécanisme, conservé pour compatibilité descendante mais non alimenté par les nouveaux produits) et de `asset_file_id` (fichier protégé, jamais exposé ici). **Le Frontend doit préférer `coverUrls[0]` à `coverFileId` dès que `coverUrls` est non vide.**
- **Codes possibles** : `200` uniquement.
- **Cas limites** : catalogue vide → `items: []`, jamais une erreur.
- **Critère de conformité** : ne retourne jamais un produit `draft` ou `archived`.

## A.2 — Consultation d'un produit publié

- **Méthode / URL** : `GET /api/shop/catalog/:id`
- **Paramètre de chemin** : `id` — identifiant produit (`prod_...`)
- **Réponse `200`** : objet produit unique, même structure que A.1 (`mapProduct`), incluant `description` et `coverUrls`.
- **Réponse `404`** : `code: "NOT_FOUND"` si le produit n'existe pas **ou** si son statut n'est pas `published` (draft/archived traités de façon identique — invisibles publiquement, aucune distinction donnée à l'appelant).
- **Cas limite** : un produit archivé retourne le même `404` qu'un produit inexistant — c'est volontaire (pas de fuite d'information sur l'existence passée d'un produit).

## A.3 — Liste des catégories

- **Méthode / URL** : `GET /api/shop/categories`
- **Réponse `200`** : `{ "data": { "categories": [ { "category": "formations", "count": 12 } ] } }` — uniquement les catégories des produits `published`.

## A.4 — Santé du service

- **Méthode / URL** : `GET /` ou `GET /health`
- **Réponse `200`** : `{ "data": { "service": "boutique", "status": "up" } }`

---

# CATÉGORIE B — ROUTES MEMBRE (Access Proof requise, voir Annexe A)

## B.1 — Lecture du panier

- **Méthode / URL** : `GET /api/shop/cart`
- **Identité** : `memberId` = Access Proof
- **Effet de bord** : auto-nettoyage silencieux — toute référence à un produit supprimé depuis est retirée et persistée avant réponse (jamais signalé comme une erreur au Frontend).
- **Réponse `200`** : `{ "data": { "items": [ { "productId": "prod_abc123", "qty": 2 } ] } }`

## B.2 — Remplacement complet du panier

- **Méthode / URL** : `PUT /api/shop/cart`
- **Corps** : `{ "items": [ { "productId": "string", "qty": number } ] }` — `items` facultatif (absent ou non-array ⇒ traité comme `[]`)
- **Validation** : **aucune vérification d'existence produit à cette étape** — la validation réelle a lieu au checkout. Un `productId` inexistant peut être stocké ici sans erreur.
- **Réponse `200`** : `{ "data": { "items": [...] } }` — panier tel qu'enregistré.

## B.3 — Ajout d'un article

- **Méthode / URL** : `POST /api/shop/cart/items`
- **Corps** : `{ "productId": "string (requis)", "qty": "number (facultatif, défaut 1, min 1)" }`
- **Validations** : `productId` requis (`422 VALIDATION` sinon) ; produit doit exister et être `published` (sinon `404 PRODUCT_NOT_FOUND`, `409 PRODUCT_ARCHIVED`, ou `409 PRODUCT_NOT_PUBLISHABLE` selon le cas exact).
- **Effet** : si le produit est déjà dans le panier, `qty` s'additionne ; sinon, nouvelle entrée.
- **Réponse `200`** : panier complet mis à jour.

## B.4 — Retrait d'un article

- **Méthode / URL** : `DELETE /api/shop/cart/items/:productId`
- **Paramètre de chemin** : `productId`
- **Réponse `200`** : panier complet mis à jour (retrait silencieux même si l'article n'y était pas).

## B.5 — Checkout

- **Méthode / URL** : `POST /api/shop/checkout`
- **Corps** :

| Champ | Type | Obligatoire | Contraintes |
|---|---|---|---|
| `idempotencyKey` | string | **oui** (ou header `Idempotency-Key`) | Doit être stable par tentative d'achat distincte — **une nouvelle tentative après échec doit utiliser une clé différente** ; jamais générée automatiquement par le serveur |
| `promoCode` | string | non | Normalisé en majuscules ; validé et consommé atomiquement au moment de l'appel |
| `retryOfOrderId` | string | non | Référence informative vers une tentative précédente échouée, pour l'historique |

- **Données calculées côté serveur (jamais fournies par le client)** : `subtotalDsi`, `discountDsi`, `totalDsi`, la liste des lignes de commande (relues depuis le panier serveur et le catalogue), `financialOperationId`, `orderId`.
- **Validations** : commande d'authentification (Access Proof) ; `idempotencyKey` requis ; absence de commande `payment_unknown` bloquante pour ce membre (avec tentative de réconciliation automatique — voir Contrat 3) ; panier non vide ; chaque produit `published` ; code promo valide et quota disponible si fourni.
- **Réponse `200` (résultat terminal, payé ou déjà connu)** :
```json
{ "success": true, "data": {
  "orderId": "shop_...", "status": "paid", "subtotalDsi": 1500, "discountDsi": 150,
  "totalDsi": 1350, "promoCode": "PROMO10", "financialOperationId": "boutique_finop_...",
  "replay": false
} }
```
- **Réponse `202` (traitement en cours ou résultat indéterminé)** : même structure, `status` = `"processing"`, `"validating"`, `"pending_payment"`, ou `"payment_unknown"`, avec un champ `note` explicatif. **Comportement attendu du Frontend** : réessayer la lecture après un court délai (`GET /api/shop/orders/:id` avec le même `orderId`), ne jamais renvoyer un nouveau checkout avec une nouvelle `idempotencyKey` tant que ce statut n'a pas évolué.
- **Erreurs métier possibles** : `422 VALIDATION` (idempotencyKey manquante, panier vide), `404/409 PRODUCT_NOT_FOUND/PRODUCT_ARCHIVED/PRODUCT_NOT_PUBLISHABLE`, `409 CONTENT_FILE_REQUIRED`, `404/409` (code promo invalide/expiré/épuisé/limite atteinte), `409 PAYMENT_RECONCILIATION_PENDING` (opération financière précédente non résolue), `502 UPSTREAM` (débit refusé), `503 UPSTREAM` (Paiement non configuré).
- **⚠️ `502 UPSTREAM` est un code unique, indifférencié** : il couvre aussi bien un solde DSI insuffisant qu'un compte refusé par le Worker Paiement ou toute autre cause de refus — Boutique ne lit ni ne transmet de motif détaillé en provenance de Paiement. **Le Frontend ne peut donc pas distinguer un « solde insuffisant » d'un autre refus à partir de cette seule réponse**, et ne doit pas supposer qu'il s'agit forcément d'un solde insuffisant pour proposer une recharge. Cette granularité dépend du futur contrat `POST /internal/dsi/operations` (motif de `REJECTED`), pas encore implémenté par le Worker Paiement ni propagé par Boutique — voir « Points explicitement non formalisés ».
- **Idempotence** : garantie par `idempotencyKey` — une même clé ne peut jamais produire deux débits, quel que soit le nombre d'appels.
- **Cas limite** : commande gratuite (`totalDsi = 0`) → payée immédiatement sans appel au Worker Paiement.

## B.6 — Liste des commandes

- **Méthode / URL** : `GET /api/shop/orders`
- **Effet de bord** : réconciliation automatique des commandes `payment_unknown`, réparation automatique des entitlements manquants sur les commandes `paid` — jamais de nouveau débit.
- **Réponse `200`** : `{ "data": { "orders": [ { "id", "subtotalDsi", "discountDsi", "totalDsi", "promoCode", "status", "financialOperationId", "items", "createdAt" } ] } }`, limité aux 50 plus récentes.

## B.7 — Détail d'une commande

- **Méthode / URL** : `GET /api/shop/orders/:id`
- **Réponse `200`** : mêmes champs que B.6 pour une commande, plus `failureReason` (si `status="failed"`) et `paymentRef`.
- **Réponse `404`** : `NOT_FOUND` si la commande n'existe pas ou n'appartient pas au membre authentifié.

## B.8 — Bibliothèque personnelle

- **Méthode / URL** : `GET /api/shop/library`
- **Réponse `200`** : `{ "data": { "items": [ { "productId", "title", "category", "coverFileId", "assetFileId", "hasAsset", "grantedAt", "orderId" } ] } }`
- **Signification critique** : `assetFileId` est la **version réellement acquise** (snapshot de l'entitlement), jamais le fichier courant du produit. `hasAsset: false` signifie que la ressource n'a pas pu être déterminée (cas historique) — le Frontend ne doit alors proposer aucun lien de téléchargement pour cet article.

## B.9 — Favoris (lecture / ajout / retrait)

- `GET /api/shop/favorites` → `{ "data": { "productIds": ["prod_abc123"] } }`
- `POST /api/shop/favorites`, corps `{ "productId": "string (requis)" }` → `{ "data": { "productId": "..." } }`, idempotent (ajout silencieux si déjà favori)
- `DELETE /api/shop/favorites/:productId` → `{ "data": { "productId": "..." } }`, idempotent

## B.10 — Aperçu d'un code promo

- **Méthode / URL** : `POST /api/shop/promo/validate`
- **Corps** : `{ "code": "string (requis)" }`
- **⚠️ Important pour le Frontend** : cette route est **indicative uniquement** — elle ne consomme aucun quota. La validation définitive et la consommation réelle ont lieu exclusivement au moment du `POST /api/shop/checkout`. Un code valide ici peut être refusé au checkout si le quota a été consommé entre-temps par un autre achat concurrent.
- **Réponse `200`** : `{ "data": { "code": "PROMO10", "type": "percent", "value": 10 } }`
- **Erreurs** : `404 NOT_FOUND` (code inexistant), `409 CONFLICT` (désactivé / pas encore actif / expiré / épuisé / limite personnelle atteinte).

## B.11 — URL de lecture d'un fichier protégé

- **Méthode / URL** : `POST /api/shop/media/:fileId/read-url`
- **Paramètre de chemin** : `fileId` — **doit être la valeur `assetFileId` retournée par B.8 (bibliothèque)**, jamais un identifiant reconstruit par le Frontend.
- **Corps** : aucun requis par le Frontend (le Worker construit lui-même le corps signé envoyé à la couche stockage).
- **Réponse `200`** : URL temporaire de lecture (structure exacte dépendante de la couche stockage — durée de vie 300 s).
- **Erreurs** : `403 FORBIDDEN` (aucun droit), `403 ACCESS_DENIED` (le membre possède un autre entitlement déterminé, mais pas celui-ci — tentative d'accès à une ressource non acquise), `409 ENTITLEMENT_ASSET_UNAVAILABLE` (l'entitlement du membre existe mais sa ressource n'a pas pu être déterminée — cas à signaler au support, ne jamais réessayer automatiquement), `503 UNAVAILABLE` (couche stockage non configurée), `502 UPSTREAM` (couche stockage indisponible).
- **Comportement attendu du Frontend pour `ENTITLEMENT_ASSET_UNAVAILABLE`** : ne pas réessayer, orienter l'utilisateur vers le support — ce n'est pas une erreur transitoire.

---

## Données sensibles jamais exposées à la plateforme

Aucun secret HMAC, aucune clé publique/privée Access Proof, aucun identifiant interne de nonce, aucun détail du solde DSI du membre. Les identifiants `orderId`, `financialOperationId`, `paymentRef` sont exposés en lecture (utiles au support/traçabilité) mais ne sont pas des secrets.

## Points explicitement non formalisés

- Format exact de l'URL temporaire retournée par B.11 (dépend de la couche stockage, hors périmètre Boutique).
- Comportement exact souhaité côté Frontend en cas de réception répétée de `202`/`payment_unknown` au-delà d'un certain nombre de tentatives (pas de politique de backoff définie côté serveur).
- **Hydratation des favoris au-delà du catalogue en cache** : `GET /api/shop/favorites` (B.9) ne retourne que des `productId` bruts — aucun titre, prix ou image. Pour les afficher, le Frontend doit les résoudre contre le catalogue (A.1), mais celui-ci ne propose ni paramètre `ids`, ni pagination au-delà de ses 200 premiers résultats (`featured DESC, updated_at DESC`). **Un produit favori qui n'est pas dans cette fenêtre de 200, ou qui a été dépublié/archivé depuis la mise en favori, ne peut donc pas être réhydraté** avec ce contrat actuel. Non résolu côté Boutique à ce jour — nécessiterait soit un paramètre `ids=` sur A.1, soit une route dédiée de résolution par lot.
- **Motif détaillé d'un refus de débit** : comme noté en B.5, `502 UPSTREAM` ne distingue pas un solde insuffisant d'un autre refus. Dépend du contrat officiel `POST /internal/dsi/operations` avec le Worker Paiement (champ de motif sur `REJECTED`), non encore disponible — Boutique ne peut pas propager une information qu'elle ne reçoit pas elle-même.
