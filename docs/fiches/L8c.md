# L8c — Achat commun, « Mes achats » et accès au produit acheté

Sources : décisions D1 à D3, P3 à P5 ; réponses : solde insuffisant → « Mes DSI », lien du vendeur dans le WebView ; fiches L8a et L8b.

## Livré
- **Achat commun** (`store/purchaseStores.ts`, `components/PurchaseSheet.tsx`, `PurchaseAction.tsx`) : fenêtre en bas d'écran avec le prix, le solde DSI actuel, le solde après achat ou le montant manquant, puis le résultat. Textes du site (`mp.checkout.*`).
- **Mes achats** (`screens/CommercePurchasesScreen.tsx`) : commandes de la source, du plus récent au plus ancien, statut, « Vérifier mon paiement » pour une commande en cours, « Ouvrir mon achat » pour une commande payée.
- **Accès** (`CommerceApi.access`) : Marketplace = livraison de la commande, lien du vendeur ouvert dans le WebView de l'app (`CommerceLinkScreen`, https seulement). Boutique = bibliothèque, puis URL temporaire du fichier, ouverte hors de l'app.
- **Navigation** : `CommerceStack` gagne « Mes achats » (icône sac dans l'en-tête) et l'écran du lien. L'achat est branché sur la fiche Marketplace.

## Règles d'achat appliquées
- Une clé d'idempotence par intention, créée à l'ouverture de la fenêtre.
- Résultat incertain (réseau, 502 Marketplace, 503, réponse illisible) : rejeu avec la même clé, autant de fois que nécessaire ; un seul débit possible.
- Échec net (paiement refusé, solde, abonnement) : nouvelle clé au nouvel essai.
- Paiement « en cours » : bouton « Vérifier mon paiement » (reconcile côté Marketplace, relecture de la commande côté Boutique). Une vérification sans réponse laisse l'achat « en cours ».
- Un second appui pendant l'achat est ignoré.
- Achat payé : « Mes achats » et le solde sont relus.
- Solde insuffisant (connu avant achat, ou refusé par le Worker) : bouton vers « Mes DSI » de l'espace membre. Abonnement inactif : bouton vers l'abonnement.
- Le solde affiché est en lecture seule ; la décision finale reste au Worker.

## Hors L8c
- **Achat Boutique** : le checkout de la Boutique achète le panier du serveur. La fiche Boutique n'a donc pas de bouton « Acheter » avant L8d (panier et code promo). Le code d'achat commun (clé, statuts, vérification) est déjà prêt pour elle.
- Tendances, vendeurs, avis : L9a.

## Limites connues
- Fichier Boutique ouvert hors de l'app (système) : la forme de `/media/:id/read-url` n'est pas confirmée (le mapper accepte `url`, `readUrl` ou `signedUrl`). Le lecteur interne de l'app ne sait lire que le contenu de la bibliothèque DSI, pas un fichier de la Boutique.
- Après un achat payé, le solde affiché dans l'espace membre ne se met à jour qu'à sa propre prochaine lecture : le solde de la fenêtre d'achat est un store séparé (R-LAY-4 interdit d'importer celui de l'espace membre).
- WebView du vendeur : JavaScript activé (nécessaire à la plupart des pages), cookies non conservés, https seulement, pas de nouvelles fenêtres.
- Marketplace : produit gratuit (prix 0) acheté par le même chemin ; à confirmer avec le Worker si une route dédiée existe.

## Vérifications faites
- Stores d'achat, de commandes et de solde exécutés avec un faux Worker : 11 groupes de contrôles réussis (payé, en cours, vérification, rejeu avec la même clé, nouvelle clé après échec net, double appui, rechargement après achat, accès).
- Toutes les clés i18n utilisées existent en fr et en ; typage des fichiers `core` et des stores propre.
- Non exécutés ici : Jest (dont `commercePurchase.tests.ts` et les trois cas d'accès ajoutés à `commerceSources.tests.ts`), ESLint, typage des écrans (types React Native absents), essai sur appareil. À valider par la CI.
