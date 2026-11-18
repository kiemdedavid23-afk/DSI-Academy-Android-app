# Mise à jour de l'app pour le Worker Contenu v1.2

Source de vérité : `docs/contrats/worker-contenu-v1.2.md` (tirée du code du Worker). Les anciens contrats de `docs/contrats` sont périmés pour le contenu.

## Correctif de pagination
Le Worker renvoie dates et curseur en entiers (secondes Unix). L'app les lisait comme du texte : curseur toujours nul, seule la première page visible. Corrigé (`CatalogueCursor.createdAt: number`, `asDateIso`). Cache disque passé en `v2` (l'ancien est effacé une fois).

## Nouveautés branchées
- Arbre des catégories : `fetchCategoryTree` → `categoryTreeStore` (repli liste à plat si 404 NOT_FOUND) → chips par niveau.
- Parties d'une œuvre : `fetchParts`, `fetchPartsTree`, `fetchNavigation` ; la formation lit son programme par les parties (repli sur les composants).
- Contenu : `likeCount`, `partsCount`, `isPart` ; chip « N parties » sur la fiche.
- Catalogue et recherche : `exactCategory`. `deliver` : `intent=download`, `suggestedFilename`.

## Pas encore fait
- Écran de liste des parties pour un livre, audio ou vidéo composé (lot 4b).
- `GET /composition-rules`, routes d'écriture et « j'aime » : non appelables par l'app (signature entre Workers).
