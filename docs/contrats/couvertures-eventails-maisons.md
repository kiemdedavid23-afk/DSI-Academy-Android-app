# Bandeaux des maisons : deux éventails de couvertures

Document de travail : ce que fera l'app (étapes) et ce que le concepteur du Worker Contenu doit fournir. Le Worker et l'app peuvent avancer en parallèle : l'app a un repli tant que la route n'existe pas.

## 1. Objectif

Remplacer la grande illustration fixe du bandeau de chaque maison (Bibliothèque, Vidéothèque, Formations, Audio) et celui de l'accueil Academy par **deux éventails de couvertures**, 8 couvertures minimum chacun :

- **éventail du haut** : les couvertures partent d'un point d'attache en bas et s'ouvrent vers le haut ;
- **éventail du bas** : les couvertures partent d'un point d'attache en haut et s'ouvrent vers le bas ;
- les deux éventails se **chevauchent** à leur jonction, celui du haut posé par-dessus celui du bas ;
- chaque maison montre ses propres couvertures, dans son propre format (livre 2:3 vertical, vidéo et formation 16:9, audio carré) ;
- accueil Academy : une composition qui mélange des couvertures des quatre maisons.

Le bandeau devient moins haut que l'illustration carrée actuelle (331 dp). Les images ne sont **pas embarquées** dans l'app : elles viennent de liens https.

## 2. Étapes côté app

1. **Couche API** : `fetchCovers(type, limit)` avec son mapper, ses tests et un fichier d'exemple dans `contracts/content/`. Repli : si la route `GET /content/covers` répond 404, l'app prend la première page de `GET /content` et ne garde que les contenus avec une couverture https. Rien ne casse avant la livraison du Worker.
2. **Store** `coversStore` par maison : cache disque 24 h, une seule requête par maison, liste stable (pas de re-mélange à chaque ouverture).
3. **Composant `CoverFans`** : deux éventails (rotation et chevauchement calculés), préchargement des 8 premières images, repli propre (carte sombre avec icône de la maison, sans grande image) si une couverture ne charge pas ou si la maison n'a pas assez de contenus. Éventails décoratifs : masqués pour les lecteurs d'écran.
4. **`HouseBanner`** : l'illustration carrée est remplacée par `CoverFans`. Le sélecteur des quatre maisons, l'icône, « GRANDE MAISON DSI », le titre et l'accroche gardent leur place.
5. **Accueil Academy** (`AcademyHubScreen`) : même composant, couvertures des quatre maisons mélangées (4 requêtes en parallèle, composition côté app).
6. **Nettoyage** : une fois les éventails en place, retirer l'usage des grandes illustrations dans le bandeau (voir décision 2 ci-dessous pour les cartes).
7. **Tests** : calcul de la géométrie des éventails, mapper et repli de `fetchCovers`, store et cache.

## 3. Ce que le concepteur du Worker doit fournir

### 3.1 Nouvelle route ouverte : `GET /content/covers`

Elle renvoie **seulement** les liens de couverture, sans les fiches complètes : réponse légère, adaptée à un bandeau.

**Paramètres**

| Paramètre | Règle |
| --- | --- |
| `type` | `book`, `audio`, `video` ou `training` (obligatoire) |
| `limit` | entier de 1 à 24, défaut 16 |

**Règles de sélection**

- mêmes règles de visibilité que `GET /content` (publié, actif) ;
- uniquement les contenus dont `thumbnail_url` est non nul et en https ;
- ordre **stable** pendant 24 h, pour que le cache de l'app et du CDN servent la même liste : par exemple un tirage aléatoire initialisé avec la date du jour (`seed = AAAAMMJJ`), ou `created_at` décroissant ;
- une œuvre composée compte pour une seule couverture (pas ses parties : exclure `is_part = true`).

**Réponse**

```json
{
  "type": "book",
  "items": [
    {
      "id": 12,
      "slug": "comment-se-faire-des-amis",
      "title": "Comment Se Faire Des Amis",
      "thumbnail_url": "https://covers.example.com/book/12-9f3a1c.webp",
      "cover_small_url": "https://covers.example.com/book/12-9f3a1c-240.webp"
    },
    {
      "id": 15,
      "slug": "lise-bourbeau-pour-lamour-de-soi",
      "title": "Lise Bourbeau - Pour l'amour de soi",
      "thumbnail_url": "https://covers.example.com/book/15-b21e77.webp",
      "cover_small_url": null
    }
  ],
  "count": 2
}
```

- `cover_small_url` est **facultatif** (voir 3.2). S'il est `null` ou absent, l'app utilise `thumbnail_url`.
- Aucun contenu avec couverture : `200` avec `"items": []` (pas une erreur).
- En-têtes : `Cache-Control: public, max-age=3600`.
- Erreurs : `422 INVALID_TYPE`, `422 INVALID_LIMIT`.

### 3.2 Hébergement et format des images

Recommandation : **Cloudflare R2**, avec un domaine public propre (par exemple `covers.<ton-domaine>`).

- gratuit jusqu'à 10 Go, sans frais de sortie, et déjà dans l'écosystème Cloudflare des Workers ;
- **à éviter pour l'affichage : Google Drive.** Les liens directs sont limités en débit et refusent des séries de 16 images au bout d'un moment.

**Formats à générer à l'import (une fois, pas à chaque requête)**

| Variante | Largeur | Usage | Poids visé |
| --- | --- | --- | --- |
| `thumbnail_url` | 600 px | cartes, fiche | 60 à 120 Ko |
| `cover_small_url` | 240 px | éventails des bandeaux | 15 à 40 Ko |

- format **WebP** (qualité 80), proportions d'origine conservées ;
- nom de fichier avec empreinte du contenu (`12-9f3a1c-240.webp`) : une image modifiée change de lien, donc aucun cache périmé ;
- en-tête de livraison : `Cache-Control: public, max-age=31536000, immutable` ;
- 16 petites couvertures pèsent environ 0,5 Mo, bien moins que les grandes illustrations actuelles.

### 3.3 Où ranger la variante petite

Colonne `cover_small_url TEXT NULL` dans la table `contents`, remplie à l'import avec la miniature 240 px. Le champ n'est exposé que par `GET /content/covers` pour l'instant.

### 3.4 Compatibilité

Aucune rupture. Tant que `GET /content/covers` n'existe pas, l'app utilise son repli (première page du catalogue, couvertures https seulement). Tant que `cover_small_url` est absent, elle utilise `thumbnail_url`.

## 4. Décisions encore ouvertes

1. **Titre et sélecteur des maisons** : le plan garde leur place actuelle sous les éventails. À confirmer si tu préfères le titre **entre** les deux éventails, ou **par-dessus** les couvertures.
2. **Illustrations fixes** (`house-library.webp` et trois autres) : elles servent aussi de fond de repli aux cartes sans couverture. Soit on les garde pour ce seul usage, soit on les remplace par un fond sombre uni avec l'icône de la maison, ce qui permet de les supprimer et d'alléger l'app.
