# Livraison visuelle : Academy → maison → fiche (app alignée sur le site)

Chaque dossier se dépose à la racine de son dépôt (même arborescence, les fichiers existants sont écrasés).

## Site (dsiacademy--main) : 2 fichiers modifiés
- src/houses/content/ui/ContentDetail.jsx
- src/houses/content/ui/ContentDetail.css
  → la vignette occupe toute la carte du héros (plus de tuile ni de flou), dégradé sombre, textes et boutons posés dessus.

## App (DSI-Academy-Android-app-main)
Créés :
- src/shared/houses/houseVisuals.ts (identité des 4 maisons, partagée)
- src/shared/designsystem/components/Scrim.tsx (dégradé sombre sur image)
- src/shared/store/selectionsStore.ts (« Ma liste », comme le site)
- src/features/content/logic/recent.ts (badge « Nouveau », 14 jours)
- src/features/content/store/railsStore.ts (nouveautés + rangées par catégorie)
- src/features/content/store/similarStore.ts (« Dans la même catégorie »)
- src/features/content/components/ContentRail.tsx, ContentFeatured.tsx, HouseBanner.tsx

Modifiés :
- src/shared/designsystem/icons/iconPaths.ts (+ BookmarkIcon, PlusIcon)
- src/shared/designsystem/theme/typography.ts (+ cardTitle : Fraunces 16)
- src/shared/designsystem/components/index.ts (export Scrim)
- src/shared/store/index.ts (export selectionsStore)
- src/features/academy/logic/houses.ts, src/features/academy/screens/AcademyHubScreen.tsx
- src/features/content/components/ContentCover.tsx, ContentCard.tsx
- src/features/content/screens/LibraryDiscoverScreen.tsx, ContentDetailScreen.tsx
- src/app/navigation/house-stacks/AcademyStack.tsx
- __tests__/designsystem.icons.tests.tsx (liste des icônes : 38)

## Conservé de l'app (absent du site)
Recherche, tableau d'informations de la fiche (auteur, catégorie, niveau, langue, durée), état « bientôt » des maisons, états chargement/erreur/vide, logique des stores Worker.

## Non repris (pages inexistantes dans l'app, rien d'inventé)
Sections « Ma liste » et « Nouveautés » du bandeau (le site a 4 pastilles, l'app 2 : Découvrir, Explorer), bouton « Voir tout » des rangées, bouton retour dans le héros (l'en-tête natif reste).
Partage : le titre est partagé (l'app n'a pas d'adresse web de contenu).
