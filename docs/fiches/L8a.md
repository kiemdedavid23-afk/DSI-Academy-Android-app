# L8a — Fondations communes Boutique + Marketplace

Sources : Contrat 1 Boutique (mis à jour : `coverUrls`) et Rapport Worker Marketplace (17/11/2026).
Décisions : document « Boutique et Marketplace — lots, choix et décisions sur le commun ».

## Périmètre
Couche réseau et modèle commun, sans écran. Les écrans communs viennent en L8b.

| Dossier | Rôle |
|---|---|
| `src/core/api/endpoints/commerce/` | Modèle commun, échecs, statuts unifiés, clé d'idempotence, interface `CommerceApi` (`getCommerceApi('shop' \| 'marketplace')`) |
| `src/core/api/endpoints/shop/` | Worker Boutique : catalogue, détail, catégories, favoris, commandes, checkout, bibliothèque, URL de lecture |
| `src/core/api/endpoints/marketplace/` | Worker Marketplace : catalogue, `ids=`, détail, catégories, favoris, commandes, création, reconcile, livraison |
| `contracts/shop/`, `contracts/marketplace/` | Fixtures JSON bâties à partir des exemples des deux documents |

## Règles appliquées
- Routes membre : `X-Access-Proof`, jamais le Bearer. Sans preuve : échec local `noProof`, aucun appel.
- Succès décidé par `success` + statut 2xx ; échec décidé par le `code`, puis le statut. Le texte de `error` n'est jamais affiché.
- Achat : une clé `chk_…` (8 à 128 caractères) par intention, envoyée dans l'en-tête `Idempotency-Key` ET dans le corps. L'API ne génère jamais de clé : l'appelant la crée (`createCheckoutKey`) et la garde pour reprendre la même intention (202 Boutique, 502 Marketplace). Nouvelle clé après un échec.
- 502 à l'achat : Boutique = `paymentRefused` (débit refusé, sans motif, pas de bouton de recharge) ; Marketplace = `indeterminate` (rejouer avec la même clé). Marketplace `402 INSUFFICIENT_BALANCE` = `insufficientBalance` (renvoi vers « Mes DSI »).
- Statuts unifiés : `processing`, `paid`, `failed`, `refunded`. Tout statut inconnu reste `processing`.
- Produits `PRIVATE` ou non publiés écartés côté app. Couverture : `coverUrls[0]` https (Boutique), `coverUrl` https (Marketplace) ; sinon `null`.
- Favoris Boutique : catalogue déjà connu, puis `GET /catalog/:id` par favori manquant ; 404 = masqué. Marketplace : `catalog?ids=` par lots de 100.
- Aucun prix n'est envoyé par l'app : le montant vient du serveur.

## Hors L8a
Panier et code promo (L8d), tendances, vendeurs, avis (L9a), écrans et stores (L8b, L8c), lecture des fichiers de la bibliothèque (L8c).

## Confirmations des Workers
- Marketplace : `GET /catalog/:id` renvoie le produit à plat dans `data` (ni `item` ni `listing`). Le mapper lit `title` ou `name`.
- Boutique : `createdAt` des commandes est un entier en millisecondes ; le mapper est strict (un texte est refusé).
- Boutique : la forme de `/media/:id/read-url` vient du Worker de stockage et reste à confirmer auprès de lui (le mapper accepte `url`, `readUrl` ou `signedUrl`, en https). TTL demandé : 300 s ; l'Access Proof est exigé même pour une couverture.

## Vérifications faites
- Typage strict des fichiers `src` de L8a : aucune erreur.
- Mappers, échecs et clé d'idempotence exécutés contre les fixtures : 13 groupes OK.
- Les fichiers `__tests__/commerce*.tests.ts` n'ont pas pu être lancés ici (Jest non installé). À valider par la CI.
