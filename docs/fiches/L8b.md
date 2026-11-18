# L8b — Écrans communs de découverte Boutique + Marketplace

Sources : décisions D1 à D3 (Boutique conçue dans le sens de la Marketplace, commun centralisé), fiche L8a, site (`MpHomePage`, `MpExplorePage`, `MpProductPage`, `MpFavoritesPage`).

## Livré
- **Feature `src/features/commerce/`**, une seule pour les deux maisons (R-LAY-4 : `features/shop` et `features/marketplace` restent vides).
  - `store/commerceStores.ts` : `COMMERCE_STORES[source]` = catalogue, catégories, fiche, favoris. Chaque store parle à son Worker via `getCommerceApi` (L8a).
  - `screens/` : `CommerceDiscoverScreen` (titre, recherche différée 350 ms, catégories, grille 2 colonnes), `CommerceProductScreen` (fiche, bouton favori, emplacement `renderAction` pour l'achat), `CommerceFavoritesScreen`.
  - `components/` : `ProductCard`, `ProductCover` (4:3, fond sombre et icône si pas d'image), `PriceTag`, `CommerceCategoryChips`.
- **Navigation** : une pile commune `CommerceStack` (catalogue → fiche, favoris), utilisée par `ShopStack` et `MarketplaceStack` à la place des écrans provisoires. Bouton « Mes favoris » dans l'en-tête du catalogue.
- **Textes** : les clés du site sont réutilisées (`shop.*`, `mp.*`, `app.catalogue.*`). Huit clés nouvelles dans `commerce.fr.json` et `commerce.en.json` (espace `commerce`, branchés dans `shared/i18n/index.ts`).
- **Ajustements L8a** (confirmations des Workers) : détail Marketplace lu à plat, `createdAt` Boutique strict en millisecondes.

## Règles appliquées
- Les écrans ne parlent qu'aux stores ; les types arrivent par `store/commerceTypes.ts`.
- Catégorie et recherche sont envoyées au Worker (un appel par changement). Une réponse arrivée après un autre filtre est ignorée.
- Fiche : le produit de la liste s'affiche tout de suite, la fiche est relue ; un échec de relecture garde ce qui est affiché.
- Favoris : ajout ou retrait immédiat, annulé si le Worker refuse ; un second appui pendant l'appel est ignoré. Boutique : catalogue déjà chargé, puis `GET /catalog/:id` par favori manquant. Marketplace : `ids=` par lots de 100.
- Toutes les erreurs passent par `commerceErrorKey` (clés i18n), jamais par le texte du Worker.
- Les stores sont purgés à la déconnexion (registre central).

## Hors L8b
- Achat, « Mes achats », accès au contenu acquis : L8c (la fiche attend `renderAction`).
- Panier et code promo : L8d. Tendances, vendeurs, avis : L9a.
- Accueil à rangées (mise en avant, nouveautés) : non fait ; le catalogue sert d'accueil et d'explorateur, avec recherche et catégories. À reprendre si tu le veux avant L8c.

## Limites connues
- Les deux Workers plafonnent la liste à 200 produits sans pagination : au-delà, il faut filtrer par catégorie ou recherche.
- `simpleStore.ts` est copié dans `features/commerce/store/` (R-LAY-4 interdit l'import d'une autre feature). À unifier dans `shared/store` plus tard.
- Couverture Boutique : `coverUrls[0]` ; si aucune URL https, le fond sombre avec icône s'affiche.
- Le point P3 du document de décisions dit « clé dans l'en-tête » ; le code l'envoie dans l'en-tête et dans le corps (L8a).

## Vérifications faites
- Les stores (catalogue, filtres, réponse périmée, fiche, favoris, annulation) ont été exécutés avec un faux Worker : 18 contrôles réussis.
- Toutes les clés i18n utilisées existent en fr et en.
- Le typage des écrans, composants et de la pile n'a pas pu être validé ici (types React Native absents) ; le typage du store est propre.
- Non exécutés ici : Jest (dont `commerceStores.tests.ts` et `commerceCommon.tests.ts`), ESLint, essai sur appareil. À valider par la CI.
