# Fiche L4d : hub Académie et Bibliothèque (découverte)

**Sources :** contrat du Worker Contenu (API.md, NOTES-ET-ECARTS.md : fait foi) ; site : `AcademyScreen.jsx/.css`, `houseVisuals.js`, `ContentCard.jsx`, `LibraryPages.jsx`, `ContentDetail.jsx`.

## Périmètre
- Hub Académie : héros « reprendre » (reprise locale) ou accueil, quatre maisons. Seule la Bibliothèque est ouverte ; les trois autres affichent « Bientôt » (L5, L6).
- Bibliothèque : une seule page de découverte : recherche, catégories, grille, pagination. Fiche détail.
- Navigation : `AcademyStack` (Hub → Découverte → Détail). Les écrans reçoivent des callbacks, sans connaître la navigation.

## Décisions
1. Catalogue : `GET /content?type=book&editorial_status=published`, curseur complet (deux valeurs), page de **20** (réponse à la question ouverte de L4a). Le filtre `published` + `active` reste appliqué au mapper (NOTES n°2).
2. Recherche : `GET /search`, type `book`, page de 20 par offset, saisie différée de 350 ms, requête vide sans appel réseau. Visibilité imposée par le Worker.
3. Catégories : `GET /content/categories?type=book`, cache 5 min. Le nom affiché sur les cartes vient de cette liste.
4. Détail : `GET /content/:id`. Fiche déjà vue en liste : affichage immédiat (cache de session). Brouillon, archivé ou modéré : écarté par le mapper, écran d'erreur.
5. Réponse tardive ignorée (changement de catégorie, nouvelle recherche, déconnexion) : compteur de génération.
6. Auteur : `metadata.author` (site), repli `metadata.auteur` (fixture du contrat). Niveau : libellé affiché seulement s'il est reconnu, jamais le texte brut. Durée : règles du site, jamais de fausse durée.
7. Bouton de lecture : **désactivé** (« Lecteur bientôt disponible »), les lecteurs arrivent en L4e. Aucun appel à `/deliver` dans ce lot.
8. « Reprendre » : mène à la fiche seulement si l'entrée locale est de la Bibliothèque avec un id numérique ; sinon l'accueil du héros. L4e devra écrire ces entrées avec l'id du contenu.
9. Icônes ajoutées (site) : Book, Video, Graduation, Headphones, Play. Images du hub copiées dans `src/assets/images/academy/`.

## Questions restées sans réponse
- Filtre `language` : non envoyé (aucune consigne). À trancher si le catalogue devient multilingue.
- Tri « Nouveautés / Tendances / Mes contenus / Sélections » du site : hors L4d (le contrat n'expose ni tendance ni sélection).
- Rendu visuel à valider sur APK (grille 2 colonnes, hauteurs, thème sombre).

## Non exécuté ici
Pas de `npm install`, ni typecheck, ni lint, ni jest dans cet environnement (réseau fermé). À lancer par la CI.
