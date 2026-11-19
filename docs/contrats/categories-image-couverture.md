# Image de couverture des catégories : ce que l'app attend du Worker Contenu

L'onglet Explorer affiche désormais les catégories comme des cartes (même format que les livres). Chaque carte montre l'image de couverture de la catégorie. Sans image, l'app affiche l'illustration de la maison : rien ne casse si le champ est absent.

## Champ à ajouter : `thumbnail_url`

Même nom, même format que `thumbnail_url` des contenus : URL **https** complète, ou `null`.
Une valeur qui n'est pas en https est ignorée par l'app (carte sans image).

## 1. Base de données

Table `categories` : ajouter une colonne `thumbnail_url TEXT NULL`.

## 2. Routes de lecture (4 routes à compléter)

### `GET /content/categories?type=book` (liste à plat)

```json
{
  "items": [
    {
      "id": 3,
      "name": "Développement",
      "slug": "developpement",
      "count": 4,
      "thumbnail_url": "https://cdn.example.com/categories/developpement.jpg"
    },
    {
      "id": 5,
      "name": "Entrepreneuriat",
      "slug": "entrepreneuriat",
      "count": 7,
      "thumbnail_url": null
    }
  ]
}
```

### `GET /content/categories/tree?type=book` (arbre : champ présent à CHAQUE niveau)

```json
{
  "items": [
    {
      "id": 3,
      "name": "Développement",
      "slug": "developpement",
      "type": "book",
      "status": "active",
      "parent_id": null,
      "depth": 1,
      "content_count": 4,
      "total_count": 11,
      "thumbnail_url": "https://cdn.example.com/categories/developpement.jpg",
      "children": [
        {
          "id": 8,
          "name": "Python",
          "slug": "python",
          "type": "book",
          "status": "active",
          "parent_id": 3,
          "depth": 2,
          "content_count": 7,
          "total_count": 7,
          "thumbnail_url": null,
          "children": []
        }
      ]
    }
  ],
  "max_depth": 8
}
```

### `GET /categories/:id` et `GET /categories/:id/children`

Ajouter aussi `"thumbnail_url": "https://..." | null` dans chaque objet catégorie.

## 3. Routes d'écriture (signées)

`POST /categories`, `POST /categories/ensure` (niveau créé) et `PATCH /categories/:id` acceptent :

```json
{ "thumbnail_url": "https://cdn.example.com/categories/developpement.jpg" }
```

- `PATCH` avec `"thumbnail_url": null` retire l'image.
- Validation identique aux contenus : `422 INVALID_THUMBNAIL_URL_FORMAT` si l'URL n'est pas en https.
- `PATCH` ne change que les champs envoyés ; `422 NO_FIELDS_TO_UPDATE` si le corps est vide.

## 4. Ce que fait l'app

| Cas | Résultat |
| --- | --- |
| `thumbnail_url` https valide | l'image remplit la carte |
| absent, `null` ou non https | illustration de la maison (comme un livre sans couverture) |
| image qui ne charge pas | repli automatique sur l'illustration |

Format des cartes : livres et audio en 2 colonnes (livre 2:3, audio carré), vidéos et formations en 1 colonne (16:9). Prévoir des images de proportion proche, l'app recadre en « cover ».

## 5. Compatibilité

Aucune rupture : un Worker qui n'envoie pas encore `thumbnail_url` fonctionne, les cartes utilisent l'illustration par défaut.
