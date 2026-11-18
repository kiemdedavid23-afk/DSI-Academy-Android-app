# Worker Contenu de DSI Academy : référence complète (v1.2)

Date de rédaction : 2026-11-17. Cette référence est tirée **du code** de l'archive `dsi-worker-contenu` (`src/`, `migrations/`, `schema/`, `wrangler.toml`). Les fichiers `docs/` du zip sont périmés et ne sont pas une source (voir §14). Rien n'a été exécuté : ni le Worker, ni les tests. Chaque affirmation ci-dessous renvoie à un comportement lu dans le code.

**But du document.** Qu'une personne qui n'a jamais ouvert le Worker puisse l'utiliser, le brancher et le déboguer sans lire le code : chaque route, chaque paramètre, chaque forme de JSON, chaque code d'erreur, chaque règle cachée.

## Sommaire

0. Les dix choses à savoir avant tout
1. Vue d'ensemble : ce que fait le Worker, ce qu'il ne fait pas
2. Conventions HTTP : en-têtes, CORS, erreurs, identifiants, pagination, portées
3. Sécurité : les trois portes, algorithmes exacts, exemples de code
4. Modèles JSON : tous les objets que le Worker renvoie
5. Référence des 50 routes
6. Livraison et providers
7. Hiérarchie des catégories, œuvres composées, parties
8. Catalogue complet des erreurs
9. Journal d'audit
10. Base de données : tables, index, déclencheurs, migrations
11. Configuration : variables, secrets, bindings
12. Invariants et pièges
13. Mise en ligne de la v1.2 sur une base v1 : ordre obligatoire
14. Documentation du zip : ce qui est périmé
15. Notes pour le découpage de l'équipe application (catégories)
16. Fiches route par route : JSON envoyé, JSON reçu, règles métier (50 fiches)

---

## 0. Les dix choses à savoir avant tout

1. **Le Worker ne sert jamais un fichier.** Il renvoie une URL (`GET /content/:id/deliver`). C'est l'application qui télécharge ou lit chez la source (Drive, YouTube, Internet Archive, Catbox).
2. **50 routes** : 19 de lecture appelables par l'application (18 ouvertes + `deliver` protégée), 31 réservées aux autres Workers (signature HMAC).
3. **Tous les identifiants dans les URL sont des entiers** (`id` auto-incrémenté). Le `uid` (ULID) existe dans les fiches mais aucune route ne l'accepte.
4. **Une erreur est toujours `{"error":"CODE — texte"}`**. Le code stable est ce qui précède ` — ` (espace, tiret cadratin, espace).
5. **Un contenu non visible répond 404, jamais 403**, en lecture publique : brouillon, archivé, modéré, ou dont une œuvre parente n'est pas publiée. Seule exception : `deliver`, qui répond 403 `CONTENT_NOT_AVAILABLE`.
6. **Les « parties » d'une œuvre (chapitres, leçons, épisodes) n'apparaissent jamais dans `GET /content` ni `GET /search`.** On les atteint par `GET /content/:id/parts`.
7. **`GET /content/categories?type=` ne renvoie que les catégories qui contiennent directement au moins un contenu publié.** Une catégorie parente sans contenu direct n'y figure pas. L'arbre complet est dans `GET /content/categories/tree`.
8. **`GET /categories/:id/children` ne renvoie aucun compteur.** Les compteurs (`content_count`, `total_count`) ne sont que dans l'arbre.
9. **Les « j'aime » ne sont pas appelables par l'application** : `POST /content/:id/like` exige une signature entre Workers.
10. **Déployer le code v1.2 avant d'appliquer les migrations casse la lecture** (erreurs 500 sur le catalogue). Ordre obligatoire au §13.

---

## 1. Vue d'ensemble

### 1.1 Rôle
Worker Cloudflare unique, sans dépendance npm, point d'entrée `src/index.js`. Il gère : le catalogue (livres, vidéos, audios, formations), les catégories hiérarchiques, les fichiers (« assets ») hébergés chez des providers externes, la composition d'œuvres (parties), la livraison de liens directs protégée par preuve d'accès, la recherche plein texte, des compteurs de vues et de « j'aime », un journal d'audit et la liste blanche CORS.

### 1.2 Types de contenu
Liste fermée : `book`, `video`, `audio`, `training`.

### 1.3 Ce que le Worker ne fait pas
- Il ne stocke aucun fichier et ne relaie aucun octet.
- Il ne gère aucun compte membre ni abonnement : il vérifie seulement une preuve émise par un autre Worker.
- Il ne gère pas la progression par membre (« Reprendre », avancement) : aucune donnée par membre n'existe ici. Les compteurs sont des totaux sans identité.
- Il ne génère pas de miniatures : `thumbnail_url` est fourni tel quel par l'ingestion.
- Il n'a aucune route `DELETE` : la suppression n'existe pas, seulement l'archivage et la désactivation.
- Il n'expose aucune route pour changer `moderation_status` d'un contenu (seulement la base).
- Il n'a aucune limitation de fréquence.

### 1.4 Bindings et moteurs
| Binding | Type | Rôle |
|---|---|---|
| `DB` | D1 (ou Turso si `TURSO_DATABASE_URL` est défini) | toutes les données |
| `NONCES_KV` | KV | nonces anti-rejeu (TTL 300 s) et cache de la liste CORS (clé `cors:allowed_origins`, TTL 14 jours) |

Si `TURSO_DATABASE_URL` est défini, le Worker parle à Turso en HTTP (`POST <url>/v2/pipeline`, jeton `TURSO_AUTH_TOKEN`) en reproduisant l'interface D1, lots transactionnels compris. Sinon il utilise D1.

### 1.5 Limites
| Limite | Valeur | Source |
|---|---|---|
| Profondeur max des catégories | 8 (variable `CATEGORY_MAX_DEPTH`, plafond 32) | `config/limits.js` |
| Profondeur max des parties (œuvre comprise) | 6 (variable `PARTS_MAX_DEPTH`, plafond 16) | idem |
| `GET /content` : taille de page | défaut 30, max 100 | `contents/service.js` |
| `GET /search` : taille de page | défaut 20, max 50 | `search/service.js` |
| `GET /audit` : taille de page | défaut 50, max 200 | `audit/service.js` |
| Profondeur de `components/tree` | 10 (fixe) | `components/routes.js` |
| Tolérance d'horodatage HMAC | ±300 s | `constants.js` |
| Durée de vie d'un nonce | 300 s | `constants.js` |

---

## 2. Conventions HTTP

### 2.1 Format
- Toutes les réponses sont en JSON : `Content-Type: application/json; charset=utf-8`.
- Toutes les dates sont des **entiers en secondes Unix** (`created_at`, `updated_at`). Exception : `expiresAt` de la preuve d'accès (texte de date).
- Un chemin se découpe en segments, les `/` en trop sont ignorés. Un segment est décodé par `decodeURIComponent` (un `%` invalide donne un 500).
- Une route inconnue **ou une méthode non prévue** donne `404 {"error":"NOT_FOUND"}`. Il n'y a jamais de 405.
- Le routeur prend la **première** route qui correspond. L'ordre d'enregistrement compte ; `GET /content/categories` est déclarée avant `GET /content/:id`.

### 2.2 Format d'erreur
```json
{ "error": "CATEGORY_SLUG_ALREADY_EXISTS_FOR_TYPE" }
{ "error": "INVALID_TYPE — doit être l'un de: book, video, audio, training" }
{ "error": "INTERNAL_ERROR", "details": "…" }
```
- Le code stable est la partie avant ` — `. Le texte après est indicatif et peut changer.
- `details` n'apparaît que sur un 500 et seulement si la variable `DEBUG` vaut `"true"` (jamais en production).
- Les 500 inattendus renvoient `INTERNAL_ERROR`. Toute erreur Turso (`TURSO_HTTP_xxx`, etc.) en fait partie.
- Statuts utilisés : 200, 201, 204 (préflight), 401, 403, 404, 409, 422, 500, 502.

### 2.3 Statuts de succès
`201` pour les créations (`POST /content`, `/categories`, `/content/:id/assets`, `/content/:id/components`, `/content/:id/parts`, `/composition-rules`, `/internal/origins` si nouvelle origine, `/categories/ensure` si au moins un niveau créé). `200` partout ailleurs.

### 2.4 CORS
- Le Worker lit l'en-tête `Origin`. Si l'origine figure dans la liste blanche (`allowed_origins`, statut `active`), la réponse porte `Access-Control-Allow-Origin: <cette origine>` et `Vary: Origin`. Sinon **aucun en-tête CORS** n'est ajouté : c'est le navigateur qui bloque la lecture.
- Une requête sans `Origin` (application native, serveur) n'est jamais concernée.
- Les requêtes `OPTIONS` répondent immédiatement `204` avec : `Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS`, `Access-Control-Allow-Headers: Content-Type, X-Access-Proof, X-Service-Id, X-Timestamp, X-Nonce, X-Signature, Range`, `Access-Control-Max-Age: 86400`. `PUT` n'est pas annoncé (la seule route `PUT` est inter-Workers). `Authorization` n'est pas autorisé.
- La liste blanche est mise en cache KV ; elle est rafraîchie immédiatement à chaque création, modification ou désactivation d'origine. Format d'une origine : `^https?://[^/]+$` (schéma + hôte [+ port], sans chemin ni `/` final).
- Si KV est absent, la liste est lue directement en base.
- Le calcul des en-têtes CORS ne peut pas faire échouer une requête (erreur avalée, aucun en-tête).

### 2.5 Identifiants
| Objet | Type | Où il sert |
|---|---|---|
| contenu | entier `id` ; `uid` = ULID de 26 caractères (alphabet Crockford) | URL : `id` seul. `uid` n'apparaît que dans les JSON |
| catégorie, asset, lien de composition, règle | entier | URL |
| origine CORS | texte `org_` + 32 hex minuscules (alloué par le Worker Admin) | URL |
| provider | texte : `google_drive`, `youtube`, `mega`, `internet_archive`, `catbox`, `telegram` | corps des assets |

Un `id` non numérique dans une URL ne casse rien : il ne correspond à aucune ligne et donne le 404 habituel.

### 2.6 Slugs
`slugify` : minuscules, accents retirés (NFD), tout ce qui n'est pas `[a-z0-9]` devient `-`, tirets de début et de fin retirés. Un slug de contenu est unique **par type** (`UNIQUE(type, slug)`). Un slug de catégorie est unique **par type** aussi (`UNIQUE(slug, type)`), même sous des parents différents.

### 2.7 Pagination
- `GET /content` : curseur. Paramètres `limit`, `cursor_created_at`, `cursor_id` (les deux curseurs sont obligatoires ensemble, sinon ignorés). Tri : `created_at DESC, id DESC`. Réponse : `{ "items": [...], "next_cursor": {"cursor_created_at": N, "cursor_id": N} | null }`. `next_cursor` n'est non nul que si la page est pleine (`items.length === limit`) : une dernière page exactement pleine renvoie un curseur dont la page suivante sera vide.
- `GET /search` et `GET /audit` : `limit` + `offset`.
- Un `limit` invalide ou nul retombe sur la valeur par défaut.

### 2.8 Portées de lecture (`public` / `internal`)
Les routes de lecture d'objets de catalogue appellent `resolveScope` :
- aucun en-tête `X-Signature` ni `X-Service-Id` : portée **publique** ;
- ces en-têtes présents : la signature **doit être valide**, sinon 401 (jamais de repli silencieux vers le public) et le nonce est consommé ;
- signature valide du service `admin` : portée **interne** (tout voir) ;
- signature valide d'un autre service (`paiement`, `ia`, `utilisateurs`) : portée publique.

`GET /search`, `GET /health` et `GET /content/:id/deliver` **n'appellent pas** `resolveScope` : toujours publics, les en-têtes de signature y sont ignorés.

| Sujet | Portée publique | Portée interne (admin) |
|---|---|---|
| Contenus | publiés + actifs, chaîne des œuvres parentes publiée, hors parties | tous statuts ; `editorial_status` filtrable ; `include_parts=true` montre les parties |
| Catégories | actives, ancêtres actifs, avec contenu publié | toutes (statut et parent visibles) |
| Parties | publiées + actives, chaîne publiée | tout ; `?status=inactive` pour les liens retirés ; `parts_revision` visible |
| Règles de composition | actives | toutes |

---

## 3. Sécurité : les trois portes

| Porte | Authentifie | Algorithme | Routes |
|---|---|---|---|
| Ouverte | personne | aucun | 18 lectures |
| Preuve d'accès | un **membre** abonné | ECDSA P-256 / SHA-256, vérification locale | `GET /content/:id/deliver` |
| Signature entre Workers | un **service** | HMAC-SHA256 + nonce + horodatage | 31 routes + lectures « internes » |

Les deux dernières sont indépendantes : une preuve de membre n'ouvre aucune route d'administration, une signature de service ne remplace pas la preuve pour `deliver`.

### 3.1 Preuve d'accès du membre (`X-Access-Proof`)

**Format.** `<charge>.<signature>`, deux segments en base64url sans remplissage `=`, séparés par un seul point (autre nombre de segments : `ACCESS_PROOF_MALFORMED`).

**Charge** = JSON encodé en base64url. Champs lus :

| Champ | Type | Règle |
|---|---|---|
| `issuer` | texte | doit être égal à `ACCESS_PROOF_EXPECTED_ISSUER`, sinon `DSI_PAIEMENT` (valeur par défaut) |
| `userId` | texte | repris dans l'audit (`link_issued`) |
| `expiresAt` | texte de date | lisible par `new Date()` (ISO 8601 conseillé). Illisible ou dépassé : `ACCESS_PROOF_EXPIRED` |
| `subscriptionActive` | booléen | doit valoir exactement `true` (la chaîne `"true"` ou `1` est refusée avec 403) |

D'autres champs sont tolérés et ignorés.

**Signature.** ECDSA sur la courbe P-256 avec SHA-256, calculée sur les **octets UTF-8 du texte de la charge encodée** (le premier segment tel quel, pas sur le JSON décodé). Format : **64 octets bruts (r puis s, « IEEE P1363 »)**, ce qu'émet WebCrypto. Une signature au format DER (OpenSSL, bibliothèques Java/Node `crypto.sign` par défaut) est refusée comme invalide.

**Clé.** Le Worker détient la clé **publique** au format JWK dans le secret `ACCESS_PROOF_PUBLIC_KEY_JWK` (texte JSON). Le Worker « paiement » détient la clé privée. Le Worker Contenu ne peut pas émettre de preuve.

**Ordre des contrôles** (`verifyAccessProof`) et erreurs :
1. en-tête absent → `401 ACCESS_PROOF_MISSING`
2. pas exactement 2 segments → `401 ACCESS_PROOF_MALFORMED`
3. secret absent → `500 ACCESS_PROOF_PUBLIC_KEY_NOT_CONFIGURED` ; JSON illisible → `500 ACCESS_PROOF_PUBLIC_KEY_MALFORMED`
4. signature invalide → `401 ACCESS_PROOF_INVALID_SIGNATURE`
5. charge illisible → `401 ACCESS_PROOF_MALFORMED_PAYLOAD`
6. mauvais émetteur → `401 ACCESS_PROOF_WRONG_ISSUER`
7. expirée ou date illisible → `401 ACCESS_PROOF_EXPIRED`
8. abonnement non actif → `403 ACCESS_SUBSCRIPTION_INACTIVE`

**Limites du mécanisme** (à connaître) :
- Une preuve est un jeton porteur : elle n'est liée ni à un contenu, ni à un appareil, et ne peut pas être révoquée avant `expiresAt`. Prévoir une durée courte.
- Un segment de signature contenant des caractères hors base64url fait échouer le décodage **avant** le contrôle et produit un `500 INTERNAL_ERROR` au lieu d'un 401. Une charge dont le JSON vaut `null` produit aussi un 500.

**Exemple d'émission (côté Worker « paiement », WebCrypto) :**
```js
// Génération unique de la paire (à faire une fois, hors production) :
const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const publicJwk = await crypto.subtle.exportKey("jwk", kp.publicKey);   // -> secret ACCESS_PROOF_PUBLIC_KEY_JWK = JSON.stringify(publicJwk)
const privateJwk = await crypto.subtle.exportKey("jwk", kp.privateKey); // -> reste dans le Worker émetteur

// À chaque émission :
const b64u = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const payload = {
  issuer: "DSI_PAIEMENT",
  userId: "user-42",
  expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  subscriptionActive: true
};
const payloadEncoded = b64u(new TextEncoder().encode(JSON.stringify(payload)));
const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, new TextEncoder().encode(payloadEncoded));
const proof = payloadEncoded + "." + b64u(sig);   // valeur de l'en-tête X-Access-Proof
```

### 3.2 Signature entre Workers (HMAC)

**Services autorisés** : `admin`, `paiement`, `ia`, `utilisateurs` (liste fermée `ALLOWED_SERVICES`). Chacun a son propre secret : `HMAC_SECRET_<SERVICE EN MAJUSCULES>` (`HMAC_SECRET_ADMIN`, `HMAC_SECRET_PAIEMENT`, `HMAC_SECRET_IA`, `HMAC_SECRET_UTILISATEURS`). Le même secret doit exister dans le Worker appelant.

**En-têtes obligatoires :**
| En-tête | Valeur |
|---|---|
| `X-Service-Id` | un des quatre services |
| `X-Timestamp` | secondes Unix (entier), écart ≤ 300 s avec l'horloge du Worker |
| `X-Nonce` | exactement 32 caractères hexadécimaux **minuscules** (`^[0-9a-f]{32}$`). Un UUID avec tirets est refusé |
| `X-Signature` | HMAC-SHA256 en hexadécimal minuscule |

**Message signé** : `` `${serviceId}.${timestamp}.${nonce}.${corpsBrut}` `` où `corpsBrut` est le texte exact du corps envoyé (chaîne vide pour un `GET`, une route sans corps, ou `POST` sans corps). Le corps ne doit pas être modifié après signature (reformatage JSON compris).

**Ordre des contrôles** (`verifyInterWorkerRequest`) :
1. un en-tête manque → `401 MISSING_INTER_WORKER_HEADERS`
2. nonce hors format → `401 INVALID_NONCE_FORMAT`
3. service inconnu → `401 UNKNOWN_SERVICE`
4. secret non configuré → `500 SERVICE_SECRET_NOT_CONFIGURED`
5. horodatage illisible ou hors fenêtre → `401 TIMESTAMP_OUT_OF_RANGE`
6. nonce déjà vu → `401 NONCE_ALREADY_USED` ; KV absent → `500 NONCES_KV_NOT_CONFIGURED`
7. signature différente (comparaison à temps constant) → `401 INVALID_SIGNATURE`

**Particularités :**
- Le nonce est enregistré en KV **avant** le contrôle de signature : une requête à signature fausse brûle son nonce.
- KV n'étant pas atomique, deux requêtes simultanées avec le même nonce peuvent passer toutes les deux.
- L'authentification prouve QUELLE application appelle. Les droits de l'administrateur humain sont vérifiés par le Worker Admin avant l'appel. L'en-tête `X-Acting-User` (`^[A-Za-z0-9_.@:-]{1,64}$`) est inscrit dans l'audit mais **jamais vérifié** ici.

**Exemple de signature (Worker appelant) :**
```js
const serviceId = "admin";
const timestamp = String(Math.floor(Date.now() / 1000));
const nonce = crypto.randomUUID().replace(/-/g, "");          // 32 hex minuscules
const bodyText = body ? JSON.stringify(body) : "";            // exactement ce qui sera envoyé
const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.HMAC_SECRET_ADMIN), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${serviceId}.${timestamp}.${nonce}.${bodyText}`));
const signature = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, "0")).join("");
await fetch(`${CONTENU_URL}/content`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Service-Id": serviceId, "X-Timestamp": timestamp, "X-Nonce": nonce, "X-Signature": signature },
  body: bodyText
});
```

---

## 4. Modèles JSON

Notation : `?` = peut être absent, `| null` = peut valoir `null`. Types : `int`, `text`, `bool`, `obj`.

### 4.1 Contenu
```json
{
  "id": 12,
  "uid": "01JABCDEFGHJKMNPQRSTVWXYZ0",
  "type": "book",
  "slug": "a-quoi-sert-le-passe",
  "title": "A quoi sert le passé ?",
  "description": "texte" ,
  "language": "fr",
  "category_id": 3,
  "editorial_status": "published",
  "moderation_status": "active",
  "metadata": { },
  "level": "Intermédiaire",
  "duration_seconds": null,
  "view_count": 41,
  "like_count": 7,
  "thumbnail_url": "https://…",
  "created_at": 1790000000,
  "updated_at": 1790000500,
  "parts_count": 0,
  "is_part": false
}
```
| Champ | Type | Notes |
|---|---|---|
| `id` | int | |
| `uid` | text | ULID, jamais utilisé dans les URL |
| `type` | text | `book` \| `video` \| `audio` \| `training`, immuable |
| `slug` | text | immuable (pas de champ de modification) |
| `title` | text | obligatoire |
| `description` | text \| null | |
| `language` | text | défaut `fr`, texte libre |
| `category_id` | int \| null | doit être une catégorie du **même type** |
| `editorial_status` | text | `draft` \| `published` \| `archived` |
| `moderation_status` | text | `active` à la création ; **aucune route ne le change** |
| `metadata` | obj | JSON libre, `{}` si absent ou illisible. Le Worker n'impose aucune clé (auteur, éditeur, etc. sont à la discrétion de l'ingestion) |
| `level` | text \| null | texte libre, aucune validation (ex. « Intermédiaire ») |
| `duration_seconds` | int \| null | |
| `view_count` | int | 0 si aucune ligne de compteur |
| `like_count` | int | idem |
| `thumbnail_url` | text \| null | `http(s)://…` ou `null` |
| `created_at`, `updated_at` | int | secondes Unix |
| `parts_count` | int | présent dans la fiche (`GET /content/:id`, `by-slug`), les listes et la recherche : nombre de parties actives |
| `is_part` | bool | **uniquement** dans les fiches (`GET /content/:id`, `by-slug`) : ce contenu est-il une partie d'une œuvre |

Les champs `import_source` et `import_ref` sont stockés mais **jamais renvoyés**. Les réponses de création et de modification (`POST /content`, `PATCH /content/:id`, `archive`) ne contiennent ni `parts_count` ni `is_part`. Un résultat de recherche ajoute `relevance` (nombre, score bm25 : plus petit = plus pertinent).

### 4.2 Catégorie
```json
{ "id": 3, "name": "Développement", "slug": "developpement", "type": "book", "status": "active", "parent_id": null, "created_at": 1790000000, "updated_at": 1790000000 }
```
| Champ | Type | Notes |
|---|---|---|
| `status` | text | `active` \| `inactive` |
| `parent_id` | int \| null | `null` = catégorie principale |

**Élément de liste à plat** (`GET /content/categories`) : `{ "id", "name", "slug", "count" }` ; en portée interne s'ajoutent `status` et `parent_id`.
**Enfant direct** (`GET /categories/:id/children`) : `{ "id", "name", "slug", "type", "status", "parent_id", "depth" }`. Aucun compteur.
**Nœud d'arbre** (`GET /content/categories/tree`) :
```json
{
  "id": 3, "name": "Développement", "slug": "developpement", "type": "book", "status": "active",
  "parent_id": null, "depth": 1,
  "content_count": 4, "total_count": 11,
  "children": [ { "id": 8, "name": "Python", "…": "…", "depth": 2, "content_count": 7, "total_count": 7, "children": [] } ]
}
```
`depth` : 1 pour une catégorie principale. `content_count` : contenus publiés directement dans la catégorie. `total_count` : `content_count` plus ceux de tous les descendants actifs. Tri des frères : par `name` (comparaison de chaînes simple : une majuscule ou un accent peut passer après « z »), puis par `id`.

### 4.3 Asset (fichier d'un contenu)
**Vue interne** (réponses des routes signées `POST`/`PATCH`) :
```json
{ "id": 34, "content_id": 12, "provider_id": "google_drive", "format": "pdf", "mime_type": "application/pdf",
  "reference": "1AbC…", "size_bytes": 2048000, "duration_seconds": null, "quality": null, "language": "fr",
  "delivery_hint": null, "download_allowed": true, "status": "active", "priority": 0, "created_at": 1790000000, "updated_at": 1790000000 }
```
**Vue publique** : la même **sans** `reference`, `provider_id`, `delivery_hint`, `download_allowed`, **avec** `downloadable` (bool : `download_allowed` vrai ET le provider déclare la capacité `download`).
| Champ | Notes |
|---|---|
| `format` | texte libre à la création (non validé). Formats que la livraison sait choisir : voir §6.2 |
| `status` | `active` \| `unavailable` \| `processing` |
| `priority` | int, plus grand = choisi en premier (défaut 0) |
| `reference` | identifiant chez le provider (voir §6.1) ; **ne sort jamais** vers une route publique |
| `size_bytes`, `duration_seconds` | int \| null |

### 4.4 Lien de composition (« composant » ou « partie »)
```json
{ "id": 77, "parent_content_id": 12, "child_content_id": 13, "component_type": "chapter", "position": 0,
  "status": "active", "is_part": true, "metadata": {}, "created_at": 1790000000,
  "child": { "uid": "01J…", "title": "Chapitre 1", "type": "book", "slug": "chapitre-1" } }
```
`child` n'existe que dans les listes. `is_part` : `true` = partie d'une œuvre (route `/parts`), `false` = relation simple (route `/components`). `component_type` : `^[a-z0-9_]+$`, défaut `resource` pour une relation simple. Les réponses de la famille `/parts` ajoutent `parts_revision` (int).

### 4.5 Résumé de contenu (dans les réponses de parties)
```json
{ "id": 13, "uid": "…", "type": "book", "slug": "…", "title": "…", "description": null, "language": "fr",
  "level": null, "thumbnail_url": null, "duration_seconds": 600 }
```
En portée interne s'ajoutent `editorial_status` et `moderation_status`. Pas de `metadata`, pas de compteurs.

### 4.6 Origine CORS
`{ "id": "org_<32 hex>", "origin": "https://app.exemple.com", "label": "texte"|null, "status": "active"|"inactive", "created_at": int, "updated_at": int }`

### 4.7 Règle de composition
`{ "id": int, "parent_type": "training", "child_type": "video", "kind": "lesson", "status": "active"|"inactive", "created_at": int, "updated_at": int }`

### 4.8 Ligne d'audit
`{ "id": int, "content_id": int|null, "action": "texte", "actor": "texte", "detail": obj|null, "created_at": int }`

### 4.9 Statistiques
`{ "by_type": [ { "type": "book", "total_count": 40, "published_count": 31, "updated_at": int } ], "grand_total": 85 }`
`total_count` n'est jamais décrémenté (un contenu archivé reste compté dans le total). `published_count` suit les passages vers et depuis `published`. `grand_total` = somme des `total_count`.

---

## 5. Référence des 50 routes

**Lecture du tableau d'accès.** *Ouvert* = aucune authentification. *Preuve* = `X-Access-Proof`. *Signé* = signature HMAC du §3.2 ; toute route signée peut en plus renvoyer les erreurs `401`/`500` du §3.2 (non répétées ci-dessous).

**Rappel corps JSON.** Les anciennes routes d'écriture (contenus, catégories sauf `ensure`, assets, composants, origines) lisent le corps avec un analyseur qui, sur un JSON invalide, provoque un **500 `INTERNAL_ERROR`**. Les routes récentes (`/categories/ensure`, toutes les routes `parts`, `composition-rules`) répondent **422 `INVALID_JSON_BODY`** (et aussi si le JSON n'est pas un objet). Un corps vide vaut `{}`.

### Index

| # | Méthode et chemin | Accès | Famille |
|---|---|---|---|
| 1 | `GET /health` | Ouvert | Santé |
| 2 | `GET /content/categories` | Ouvert | Catégories |
| 3 | `GET /content/categories/tree` | Ouvert | Catégories |
| 4 | `GET /categories/:id` | Ouvert | Catégories |
| 5 | `GET /categories/:id/children` | Ouvert | Catégories |
| 6 | `POST /categories` | Signé | Catégories |
| 7 | `POST /categories/ensure` | Signé | Catégories |
| 8 | `PATCH /categories/:id` | Signé | Catégories |
| 9 | `POST /categories/:id/deactivate` | Signé | Catégories |
| 10 | `POST /categories/:id/reactivate` | Signé | Catégories |
| 11 | `GET /content` | Ouvert | Contenus |
| 12 | `GET /content/:id` | Ouvert | Contenus |
| 13 | `GET /content/by-slug/:type/:slug` | Ouvert | Contenus |
| 14 | `POST /content` | Signé | Contenus |
| 15 | `PATCH /content/:id` | Signé | Contenus |
| 16 | `POST /content/:id/archive` | Signé | Contenus |
| 17 | `POST /content/:id/like` | Signé | Contenus |
| 18 | `POST /content/:id/unlike` | Signé | Contenus |
| 19 | `GET /content/:content_id/assets` | Ouvert | Assets |
| 20 | `GET /content/:content_id/assets/best` | Ouvert | Assets |
| 21 | `GET /assets/:id` | Ouvert | Assets |
| 22 | `POST /content/:content_id/assets` | Signé | Assets |
| 23 | `PATCH /assets/:id` | Signé | Assets |
| 24 | `POST /content/:parent_id/components` | Signé | Composants |
| 25 | `GET /content/:parent_id/components` | Ouvert | Composants |
| 26 | `GET /content/:parent_id/components/tree` | Ouvert | Composants |
| 27 | `PATCH /components/:id` | Signé | Composants |
| 28 | `POST /components/:id/deactivate` | Signé | Composants |
| 29 | `GET /content/:id/parts` | Ouvert | Parties |
| 30 | `GET /content/:id/parts/tree` | Ouvert | Parties |
| 31 | `GET /content/:id/navigation` | Ouvert | Parties |
| 32 | `POST /content/:id/parts` | Signé | Parties |
| 33 | `PUT /content/:id/parts/order` | Signé | Parties |
| 34 | `POST /parts/:link_id/move` | Signé | Parties |
| 35 | `POST /parts/:link_id/remove` | Signé | Parties |
| 36 | `POST /parts/:link_id/restore` | Signé | Parties |
| 37 | `POST /parts/:link_id/replace` | Signé | Parties |
| 38 | `POST /parts/:link_id/convert` | Signé | Parties |
| 39 | `GET /composition-rules` | Ouvert | Règles |
| 40 | `POST /composition-rules` | Signé | Règles |
| 41 | `POST /composition-rules/:id/deactivate` | Signé | Règles |
| 42 | `POST /composition-rules/:id/reactivate` | Signé | Règles |
| 43 | `GET /content/:id/deliver` | Preuve | Livraison |
| 44 | `GET /search` | Ouvert | Recherche |
| 45 | `GET /stats` | Signé | Statistiques |
| 46 | `GET /audit` | Signé | Audit |
| 47 | `POST /internal/origins` | Signé | Origines CORS |
| 48 | `GET /internal/origins` | Signé | Origines CORS |
| 49 | `PATCH /internal/origins/:id` | Signé | Origines CORS |
| 50 | `POST /internal/origins/:id/deactivate` | Signé | Origines CORS |

---

### 5.1 Santé

#### 1. `GET /health` : Ouvert
Réponse `200` : `{ "status": "ok", "service": "worker-contenu" }`. Aucune lecture de base : répond même si la base est en panne. Ne passe pas par `resolveScope`.

---

### 5.2 Catégories

#### 2. `GET /content/categories?type=<type>` : Ouvert (portée selon signature)
**Rôle.** Liste **à plat** des catégories d'un type qui contiennent directement au moins un contenu publié (parties exclues).
**Paramètre.** `type` obligatoire.
**Réponse `200`.** `{ "items": [ { "id": 3, "name": "Développement", "slug": "developpement", "count": 4 } ] }`, triée par `name` croissant. Portée interne : ajoute `status` et `parent_id` à chaque élément.
**Règles.** Une catégorie dont un ancêtre est inactif est exclue en public. Une catégorie sans contenu direct (même si ses enfants en ont) **n'apparaît pas**.
**Erreurs.** `422 MISSING_TYPE`, `422 INVALID_TYPE`.

#### 3. `GET /content/categories/tree?type=<type>&include_empty=<bool>` : Ouvert
**Rôle.** Arbre imbriqué complet d'un type.
**Paramètres.** `type` obligatoire ; `include_empty=true` pour garder les branches sans contenu publié (en public seulement : en portée interne tout est déjà montré).
**Réponse `200`.** `{ "items": [Nœud, …], "max_depth": 8 }` (nœud : §4.2). `max_depth` = profondeur maximale configurée.
**Règles.**
- En public : les catégories inactives (et tout leur sous-arbre) sont absentes ; sans `include_empty`, une catégorie dont `total_count` vaut 0 est absente.
- Un parent est conservé si l'un de ses descendants a du contenu, même si lui-même n'en a pas.
- `content_count` ne compte que les contenus publiés et actifs qui ne sont pas des parties.
- Un tableau vide `items: []` est une réponse normale (aucune catégorie ou aucun contenu publié).
**Erreurs.** `422 MISSING_TYPE`, `422 INVALID_TYPE`.
**Version.** Route ajoutée par la v1.2. Sur un Worker v1, elle répond `404 NOT_FOUND` (voir §13).

#### 4. `GET /categories/:id` : Ouvert
**Réponse `200`.** Objet catégorie (§4.2).
**Erreurs.** `404 CATEGORY_NOT_FOUND` (inexistante, ou **effectivement inactive en public**).

#### 5. `GET /categories/:id/children` : Ouvert
**Réponse `200`.** `{ "items": [ { "id", "name", "slug", "type", "status", "parent_id", "depth" } ] }`, triés par nom. **Pas de compteur.** En public, les enfants inactifs sont retirés. Les enfants sans contenu **sont inclus** (pas de filtre sur le vide).
**Erreurs.** `404 CATEGORY_NOT_FOUND`.
**Version.** Ajoutée par la v1.2.

#### 6. `POST /categories` : Signé
**Corps.** `name` (obligatoire, texte), `type` (obligatoire), `slug?` (sinon dérivé du nom), `status?` (`active` par défaut), `parent_id?`.
**Réponse `201`.** Catégorie créée. Audit `category_created` dans la même transaction.
**Erreurs.** `422 MISSING_NAME`, `422 INVALID_TYPE`, `422 INVALID_SLUG` (slug vide après normalisation), `422 INVALID_CATEGORY_STATUS`, `409 CATEGORY_SLUG_ALREADY_EXISTS_FOR_TYPE`, et pour le parent : `422 INVALID_PARENT_CATEGORY` (pas un entier ≥ 1), `422 PARENT_CATEGORY_TYPE_MISMATCH`, `404 PARENT_CATEGORY_NOT_FOUND`, `422 CATEGORY_DEPTH_EXCEEDED`.
**Note.** `parent_id` valant `0`, `null` ou absent crée une catégorie principale.

#### 7. `POST /categories/ensure` : Signé
**Rôle.** Trouver ou créer un chemin complet de catégories (ingestion).
**Corps (JSON strict).** `{ "type": "audio", "path": ["Musique", "Hip-hop", "Rap français"], "create": true }`. `create` vaut `true` par défaut ; seule la valeur `false` désactive la création.
**Réponse.** `{ "category_id": 14, "created": true, "path": [ { "id", "name", "slug", "parent_id", "status", "created" } ] }`. `201` si au moins un niveau a été créé, sinon `200`.
**Règles.** Chaque niveau est retrouvé par son slug (accents et casse ignorés) **dans tout le type**, pas seulement sous le parent courant. Les noms sont rognés. Une catégorie existante n'est jamais modifiée (une différence de nom est ignorée). Idempotent, sans doublon en cas d'appels simultanés.
**Erreurs.** `422 INVALID_JSON_BODY`, `422 INVALID_TYPE`, `422 INVALID_CATEGORY_PATH` (`path` non tableau, vide, ou un élément non texte ou vide), `422 CATEGORY_DEPTH_EXCEEDED`, `422 INVALID_SLUG`, `404 CATEGORY_PATH_NOT_FOUND` (avec `create:false`), `409 CATEGORY_SLUG_ELSEWHERE` (le slug existe déjà sous un autre parent).

#### 8. `PATCH /categories/:id` : Signé
**Corps.** Un ou plusieurs de : `name`, `slug`, `status`, `parent_id` (`null` ou `""` = remonter à la racine). `type` n'est pas modifiable. Les champs inconnus sont ignorés.
**Réponse `200`.** Catégorie à jour. Audit `category_updated` (liste **toutes** les clés du corps, même ignorées), plus `category_moved` si le parent change.
**Règles.** Un corps contenant des champs sans effet (même parent, même slug) renvoie l'état courant sans erreur. Seul un corps entièrement vide `{}` donne `NO_FIELDS_TO_UPDATE`.
**Erreurs.** `404 CATEGORY_NOT_FOUND`, `422 MISSING_NAME` (non texte ou vide), `422 INVALID_SLUG`, `409 CATEGORY_SLUG_ALREADY_EXISTS_FOR_TYPE`, `422 INVALID_CATEGORY_STATUS`, `422 INVALID_PARENT_CATEGORY`, `404 PARENT_CATEGORY_NOT_FOUND`, `422 PARENT_CATEGORY_TYPE_MISMATCH`, `422 CATEGORY_CANNOT_BE_ITS_OWN_PARENT`, `409 CATEGORY_CYCLE_DETECTED`, `422 CATEGORY_DEPTH_EXCEEDED` (hauteur du sous-arbre comprise), `422 NO_FIELDS_TO_UPDATE`.

#### 9. `POST /categories/:id/deactivate` et 10. `POST /categories/:id/reactivate` : Signé
Sans corps. Réponse `200` : catégorie à jour. Audit `category_deactivated` / `category_reactivated`. Désactiver masque aussi tous les descendants **à la lecture** ; aucune ligne descendante n'est modifiée, donc réactiver restaure leur visibilité selon leur propre état. Le statut interne d'un contenu n'est pas touché.
**Erreurs.** `404 CATEGORY_NOT_FOUND`.

---

### 5.3 Contenus

#### 11. `GET /content` : Ouvert (portée selon signature)
**Paramètres.** `type`, `category_id` (la catégorie **et ses sous-catégories actives** ; `exact_category=true` pour la catégorie seule), `language` (égalité exacte), `editorial_status` (validé, mais **ignoré en public**), `include_parts=true` (interne seulement), `limit`, `cursor_created_at` + `cursor_id`.
**Réponse `200`.** `{ "items": [Contenu + parts_count], "next_cursor": {…} | null }`.
**Règles.** En public : publiés + actifs seulement, parties exclues. Une `category_id` effectivement inactive donne une liste vide. Le tri est `created_at DESC, id DESC` : ce n'est pas un tri par titre ni par popularité.
**Erreurs.** `422 INVALID_TYPE`, `422 INVALID_EDITORIAL_STATUS` (même en public).

#### 12. `GET /content/:id` : Ouvert (portée selon signature)
**Réponse `200`.** Contenu avec `parts_count` et `is_part` (§4.1).
**Erreurs.** `404 CONTENT_NOT_FOUND` (inexistant ou non visible).

#### 13. `GET /content/by-slug/:type/:slug` : Ouvert (portée selon signature)
Identique à `GET /content/:id`. Un `type` invalide n'est pas validé : il donne simplement `404 CONTENT_NOT_FOUND`.

#### 14. `POST /content` : Signé
**Corps.** `type` (obligatoire), `title` (obligatoire, texte), `slug?`, `description?`, `language?` (défaut `fr`), `category_id?`, `editorial_status?` (`draft` par défaut), `metadata?` (objet), `level?`, `duration_seconds?`, `thumbnail_url?`, `import_source?`, `import_ref?`.
**Réponse `201`.** Contenu créé (sans `parts_count` ni `is_part`). `moderation_status` vaut toujours `active` à la création. Audit `created` ; le compteur du type est incrémenté (et celui des publiés si créé directement en `published`).
**Notes.** Une valeur « fausse » (`0`, `""`) pour `description`, `level`, `duration_seconds`, `thumbnail_url` devient `null`. Un titre composé uniquement de symboles produit un slug vide, accepté une seule fois par type (non contrôlé).
**Erreurs.** `422 INVALID_TYPE`, `422 MISSING_TITLE`, `422 INVALID_EDITORIAL_STATUS`, `422 INVALID_THUMBNAIL_URL_FORMAT`, `409 SLUG_ALREADY_EXISTS_FOR_TYPE`, `404 CATEGORY_NOT_FOUND`, `422 CATEGORY_TYPE_MISMATCH`.

#### 15. `PATCH /content/:id` : Signé
**Corps.** Un ou plusieurs de : `title`, `description`, `language`, `category_id` (`null` pour détacher), `level`, `duration_seconds`, `metadata`, `thumbnail_url` (ou `null`), `editorial_status`. **Non modifiables** : `type`, `slug`, `uid`, `moderation_status`.
**Réponse `200`.** Contenu à jour (sans `parts_count`/`is_part`). Audit `updated` (toutes les clés du corps). Le compteur des publiés est ajusté quand le statut passe vers ou depuis `published`.
**Notes.** Le titre n'est pas revalidé en modification ; envoyer `title: null` provoque une erreur base de données (500).
**Erreurs.** `404 CONTENT_NOT_FOUND`, `404 CATEGORY_NOT_FOUND`, `422 CATEGORY_TYPE_MISMATCH`, `422 INVALID_THUMBNAIL_URL_FORMAT`, `422 INVALID_EDITORIAL_STATUS`, `422 NO_FIELDS_TO_UPDATE`.

#### 16. `POST /content/:id/archive` : Signé
Sans corps. Passe `editorial_status` à `archived`. Réponse `200` : contenu. Audit `archived`. Décrémente le compteur des publiés si le contenu l'était. Idempotent. **Erreurs.** `404 CONTENT_NOT_FOUND`.

#### 17. `POST /content/:id/like` et 18. `POST /content/:id/unlike` : Signé
Sans corps. Le contenu doit être visible publiquement (sinon `404 CONTENT_NOT_FOUND`). `like` : +1 atomique. `unlike` : −1 avec plancher à 0. Réponse `200` : `{ "content_id": 12, "view_count": 41, "like_count": 8 }`. Ces actions ne sont **pas** journalisées. Aucune identité de membre : rien n'empêche un même appelant de liker plusieurs fois ; la limitation de fréquence relève du Worker appelant.

---

### 5.4 Assets

#### 19. `GET /content/:content_id/assets` : Ouvert (portée selon signature)
**Paramètres.** `format`, `status` (`active` \| `unavailable` \| `processing`).
**Réponse `200`.** `{ "items": [Asset public] }`, triés par `priority` décroissant puis `created_at` décroissant. **Tous les statuts sont listés** (y compris `unavailable`, `processing`) tant qu'aucun filtre `status` n'est donné.
**Erreurs.** `404 CONTENT_NOT_FOUND` (inexistant ou non visible), `422 INVALID_ASSET_STATUS`.

#### 20. `GET /content/:content_id/assets/best?format=<format>` : Ouvert
**Réponse `200`.** Un seul asset public : le premier `active` par `priority` décroissante puis `created_at` **croissante**. Ne vérifie ni la capacité du provider ni l'accessibilité du fichier. Ne renvoie **pas de lien** (utiliser `deliver`).
**Erreurs.** `404 CONTENT_NOT_FOUND`, `404 NO_AVAILABLE_ASSET`.

#### 21. `GET /assets/:id` : Ouvert
**Réponse `200`.** Asset public. **Erreurs.** `404 ASSET_NOT_FOUND` (inexistant, ou contenu non visible).

#### 22. `POST /content/:content_id/assets` : Signé
**Corps.** `provider_id`, `format`, `reference` (obligatoires) ; `mime_type?`, `size_bytes?`, `duration_seconds?`, `quality?`, `language?`, `delivery_hint?`, `download_allowed?` (booléen, défaut faux), `status?` (défaut `active`), `priority?` (défaut 0).
**Réponse `201`.** Asset en **vue interne** (avec `reference`). Audit `asset_created`.
**Notes.** `format` n'est pas validé contre une liste. Un asset dont le format n'est pas compatible avec le type du contenu ne sera simplement jamais choisi par `deliver`. Les valeurs `0`/`""` pour les champs optionnels numériques ou texte deviennent `null`.
**Erreurs.** `404 CONTENT_NOT_FOUND`, `422 MISSING_PROVIDER_ID`, `422 MISSING_FORMAT`, `422 MISSING_REFERENCE`, `422 UNKNOWN_PROVIDER`, `422 INVALID_ASSET_STATUS`, `409 ASSET_ALREADY_REGISTERED_FOR_PROVIDER_REFERENCE` (la paire provider + référence est unique dans toute la base, tous contenus confondus).

#### 23. `PATCH /assets/:id` : Signé
**Corps.** Un ou plusieurs de : `status`, `priority`, `size_bytes`, `duration_seconds`, `quality`, `delivery_hint`, `mime_type`, `download_allowed`. **Non modifiables** : `format`, `reference`, `provider_id`, `content_id`, `language`.
**Réponse `200`.** Asset en vue interne. Audit uniquement si `status` ou `download_allowed` change réellement (`asset_status_changed`, `asset_download_allowed_changed`).
**Erreurs.** `404 ASSET_NOT_FOUND`, `422 INVALID_ASSET_STATUS`, `422 NO_FIELDS_TO_UPDATE`.

---

### 5.5 Composants (relations simples, `is_part = 0`)

#### 24. `POST /content/:parent_id/components` : Signé
**Corps.** `child_content_id` (obligatoire), `component_type?` (défaut `resource`, `^[a-z0-9_]+$`), `position?` (défaut : dernière position + 1), `metadata?`. `is_part` vrai est refusé.
**Réponse `201`.** Lien (§4.4, sans `child`). Audit `component_created`.
**Ordre des contrôles.** parent existe, `child_content_id` présent, enfant existe, pas de lien à soi-même, pas de cycle, `is_part` absent, type valide, pas de doublon.
**Erreurs.** `404 PARENT_CONTENT_NOT_FOUND`, `422 MISSING_CHILD_CONTENT_ID`, `404 CHILD_CONTENT_NOT_FOUND`, `422 CANNOT_LINK_CONTENT_TO_ITSELF`, `409 CYCLE_DETECTED`, `422 USE_PARTS_ROUTES`, `422 INVALID_COMPONENT_TYPE`, `409 COMPONENT_ALREADY_LINKED` (un lien désactivé compte aussi : le couple ne peut jamais être recréé).

#### 25. `GET /content/:parent_id/components` : Ouvert (portée selon signature)
**Paramètre.** `status` (interne seulement ; ignoré en public). Par défaut seuls les liens `active`.
**Réponse `200`.** `{ "items": [Lien avec child] }` triés par `position` puis `id`. En public : liens actifs vers des enfants publiés et actifs. **Les liens de type partie (`is_part: true`) sont inclus** : filtrer sur `is_part` côté application si l'on ne veut que les relations simples.
**Erreurs.** `404 CONTENT_NOT_FOUND`.

#### 26. `GET /content/:parent_id/components/tree` : Ouvert (portée selon signature)
**Réponse `200`.** L'objet contenu racine (forme §4.1 sans `parts_count`/`is_part`) avec une clé `children` : `[ { "component": { "id", "component_type", "position" }, "content": { …contenu…, "children": [ … ] } } ]`. Profondeur maximale 10 niveaux (au-delà `children: []`). Requêtes en cascade : coût croissant avec la taille de l'arbre.
**Erreurs.** `404 CONTENT_NOT_FOUND`.

#### 27. `PATCH /components/:id` : Signé
**Corps.** `position`, `component_type`, `metadata`. **Réponse `200`** : lien. Audit `component_updated`.
**Erreurs.** `404 COMPONENT_NOT_FOUND`, `409 USE_PARTS_ROUTES` (le lien est une partie), `422 INVALID_COMPONENT_TYPE`, `422 NO_FIELDS_TO_UPDATE`.

#### 28. `POST /components/:id/deactivate` : Signé
Sans corps. Passe le lien à `inactive`. **Aucune route ne le réactive**, et le doublon du couple est interdit : désactivation définitive pour les relations simples. Audit `component_deactivated`.
**Erreurs.** `404 COMPONENT_NOT_FOUND`, `409 USE_PARTS_ROUTES`.

---

### 5.6 Parties d'une œuvre (`is_part = 1`)

Principe (détail au §7) : une partie est un **contenu complet** (fiche, fichiers, livraison propres) rattaché à une œuvre par un lien `is_part = 1`. Une partie active n'appartient qu'à **une seule** œuvre.

#### 29. `GET /content/:id/parts` : Ouvert (portée selon signature)
**Paramètre.** `status=inactive` (interne seulement) : liens retirés.
**Réponse `200` (cas normal).**
```json
{
  "work": { "id": 12, "uid": "…", "type": "training", "slug": "…", "title": "…", "description": null, "language": "fr",
           "level": null, "thumbnail_url": null, "duration_seconds": null },
  "is_work": true,
  "total_parts": 2,
  "total_duration_seconds": 5400,
  "duration_complete": true,
  "unknown_duration_parts": 0,
  "items": [
    { "index": 1, "link_id": 77, "kind": "module", "position": 0, "depth": 1,
      "content": { "id": 13, "uid": "…", "type": "training", "slug": "…", "title": "Module 1", "…": "…" },
      "parts_count": 3, "duration_seconds": 3600, "duration_complete": true }
  ],
  "parts_revision": 4
}
```
`parts_revision` n'est présent qu'en portée interne. `total_parts` compte les parties **directes**. `items` ne contient que les parties directes (sans `children`). Un contenu qui n'est pas une œuvre donne `is_work: false`, `total_parts: 0`, `items: []` (pas d'erreur).
**Variante interne `?status=inactive`.** `{ "work": {…}, "parts_revision": int, "items": [ { "link_id", "kind", "position", "content": {…} } ] }`, triés par date de retrait décroissante.
**Erreurs.** `404 CONTENT_NOT_FOUND`.

#### 30. `GET /content/:id/parts/tree?depth=<n>` : Ouvert (portée selon signature)
Même enveloppe que la route 29 mais chaque élément porte aussi `children` (récursif, feuille : `[]`). `depth` : 1 à 16 (défaut 16). Ne s'arrête pas aux limites d'écriture configurées, seulement à 16.

#### 31. `GET /content/:id/navigation?scope=parent|work` : Ouvert (portée selon signature)
**Rôle.** Pour une **partie** : sa place dans l'œuvre et ses voisins. Ici `scope` est la *portée de navigation* (sans rapport avec la portée d'accès).
**Réponse `200`.**
```json
{
  "content": {…Résumé…}, "work": {…Résumé de l'œuvre racine…}, "parent": {…Résumé du parent direct…},
  "path": [ { "id", "uid", "type", "slug", "title" } ],
  "kind": "lesson", "position": 1, "depth": 2,
  "scope": "parent", "index": 2, "total": 5,
  "previous": { "link_id", "kind", "position", "content": {…Résumé…}, "parts_count": 0 },
  "next": null
}
```
`path` va de l'œuvre racine au parent direct (le contenu lui-même n'y figure pas). `scope=parent` (défaut) : voisins dans le même parent, `index`/`total` parmi les frères. `scope=work` : voisins dans l'ordre de lecture de toute l'œuvre en ne comptant que les **feuilles** (parcours en profondeur) ; `index`/`total` parmi les feuilles. `previous`/`next` valent `null` aux extrémités.
**Erreurs.** `422 INVALID_NAVIGATION_SCOPE`, `404 CONTENT_NOT_FOUND`, `404 NOT_A_PART` (le contenu n'est pas une partie active).

#### Écritures de parties (routes 32 à 38) : règles communes
- Corps JSON strict (422 `INVALID_JSON_BODY`).
- **Concurrence optimiste.** Chaque œuvre porte `parts_revision` (entier, 0 au départ), lisible via la route 29 en portée interne. Chaque écriture envoie `expected_revision` ; si elle ne correspond pas à la valeur courante : `409 PARTS_REVISION_CONFLICT — révision actuelle: N`, rien n'est écrit. Chaque écriture réussie ajoute 1. Obligatoire partout **sauf** à l'ajout (route 32), où elle est facultative.
- Toutes les modifications d'une opération (liens, positions, audit, révision) sont dans **un seul lot** : tout ou rien.
- Les positions sont toujours denses (0 à n−1) et réécrites à chaque opération.
- Retirer une partie ne supprime jamais le contenu : il réapparaît seul dans le catalogue.
- Réponse type : le lien (§4.4) plus `parts_revision` (la nouvelle valeur).
- Erreurs de révision communes : `422 EXPECTED_REVISION_REQUIRED`, `422 INVALID_EXPECTED_REVISION` (pas un entier ≥ 0), `409 PARTS_REVISION_CONFLICT`, `404 PARENT_CONTENT_NOT_FOUND` (œuvre inexistante).
- **Contrôles d'une nouvelle partie** (routes 32, 36, 37, 38), dans l'ordre : `422 MISSING_CHILD_CONTENT_ID`, `404 CHILD_CONTENT_NOT_FOUND`, `422 CANNOT_LINK_CONTENT_TO_ITSELF`, `409 CHILD_ALREADY_PART_OF_WORK` (partie active d'une autre œuvre), `409 CYCLE_DETECTED`, règle de composition (`422 COMPOSITION_NOT_ALLOWED`, `422 COMPONENT_KIND_REQUIRED`, `422 INVALID_COMPONENT_TYPE`), `422 PARTS_DEPTH_EXCEEDED`.

#### 32. `POST /content/:id/parts` : Signé
**Corps.** `child_content_id` (obligatoire), `kind?` (libellé de la partie), `position?` (0 à n, défaut fin), `metadata?` (objet), `expected_revision?`.
**Réponse `201`.** Lien + `parts_revision`.
**Règles.** Sans `kind`, le libellé est déduit s'il n'existe qu'une règle active pour le couple (type de l'œuvre, type de la partie) ; sinon `COMPONENT_KIND_REQUIRED` liste les choix. Si un lien désactivé existe déjà pour ce couple, il est réactivé comme partie.
**Erreurs spécifiques.** `409 COMPONENT_ALREADY_LINKED` (déjà partie active de cette œuvre), `409 LINK_EXISTS_USE_CONVERT` (une relation simple active existe : utiliser la route 38), `422 INVALID_POSITION`.

#### 33. `PUT /content/:id/parts/order` : Signé
**Corps.** `{ "expected_revision": 4, "order": [78, 77, 79] }` : les identifiants de **liens** de toutes les parties actives, chacun une fois.
**Réponse `200`.** `{ "parts_revision": 5, "order": [78, 77, 79] }`.
**Erreurs spécifiques.** `422 PARTS_ORDER_INVALID` (pas un tableau d'entiers), `422 PARTS_ORDER_MISMATCH` (doublons, manquants ou intrus).

#### 34. `POST /parts/:link_id/move` : Signé
**Corps.** `{ "expected_revision": 4, "position": 0 }` (`position` : 0 à n−1, défaut fin). **Réponse `200`.** Lien + `parts_revision`.
**Erreurs spécifiques.** `404 PART_LINK_NOT_FOUND`, `409 NOT_AN_ACTIVE_PART_LINK`, `422 INVALID_POSITION`.

#### 35. `POST /parts/:link_id/remove` : Signé
**Corps.** `{ "expected_revision": 4 }`. Désactive le lien et retasse les positions. **Réponse `200`.** Lien (statut `inactive`) + `parts_revision`.
**Erreurs spécifiques.** `404 PART_LINK_NOT_FOUND`, `409 NOT_AN_ACTIVE_PART_LINK`.

#### 36. `POST /parts/:link_id/restore` : Signé
**Corps.** `{ "expected_revision": 4, "kind"?, "position"? }` (`kind` par défaut : l'ancien libellé). Réactive un lien retiré, avec les contrôles d'une nouvelle partie. **Réponse `200`.** Lien + `parts_revision`.
**Erreurs spécifiques.** `404 PART_LINK_NOT_FOUND`, `409 NOT_AN_INACTIVE_PART_LINK`, `422 INVALID_POSITION`.

#### 37. `POST /parts/:link_id/replace` : Signé
**Corps.** `{ "expected_revision": 4, "child_content_id": 20, "kind"?, "metadata"? }`. L'ancien lien est désactivé (le contenu remplacé n'est ni supprimé ni modifié) et le nouveau prend **la même position**. **Réponse `200`.** Nouveau lien + `parts_revision`.
**Erreurs spécifiques.** `404 PART_LINK_NOT_FOUND`, `409 NOT_AN_ACTIVE_PART_LINK`, `422 REPLACEMENT_IS_SAME_CONTENT`, `409 COMPONENT_ALREADY_LINKED`.

#### 38. `POST /parts/:link_id/convert` : Signé
**Rôle.** Transformer explicitement une relation simple (`is_part = 0`) en partie. Jamais automatique.
**Corps.** `{ "expected_revision": 4, "kind"?, "position"? }`. Sans `kind` : l'ancien `component_type` s'il correspond à une règle, sinon la règle unique du couple. Le contrôle de cycle est sauté (le lien existe déjà).
**Réponse `200`.** Lien + `parts_revision`.
**Erreurs spécifiques.** `404 PART_LINK_NOT_FOUND`, `409 ALREADY_A_PART`, `409 LINK_INACTIVE`, `422 INVALID_POSITION`.

---

### 5.7 Règles de composition

#### 39. `GET /composition-rules` : Ouvert (portée selon signature)
`{ "items": [Règle] }` triées par `parent_type`, `child_type`, `kind`. En public : règles actives seulement ; en interne : toutes.

#### 40. `POST /composition-rules` : Signé
**Corps (JSON strict).** `{ "parent_type": "audio", "child_type": "audio", "kind": "episode" }`. `kind` : `^[a-z0-9_]{1,40}$`.
**Réponse `201`.** Règle. Si une règle **inactive** identique existe, elle est réactivée (réponse également `201`).
**Erreurs.** `422 INVALID_TYPE`, `422 INVALID_COMPONENT_TYPE`, `409 COMPOSITION_RULE_ALREADY_EXISTS` (déjà active).

#### 41. `POST /composition-rules/:id/deactivate` et 42. `…/reactivate` : Signé
Sans corps utile (objet JSON ou vide). Réponse `200` : règle. Désactiver une règle **n'affecte pas** les parties déjà en place : elle n'est contrôlée qu'à l'écriture. **Erreurs.** `404 COMPOSITION_RULE_NOT_FOUND`.

**Règles initiales (migration 0001, 13 lignes) :**
| Type de l'œuvre | Type de la partie | Libellés (`kind`) |
|---|---|---|
| `training` | `training` | `module` |
| `training` | `video`, `audio`, `book` | `lesson` |
| `audio` | `audio` | `chapter`, `episode`, `part` |
| `video` | `video` | `episode`, `sequence`, `part` |
| `book` | `book` | `chapter`, `part`, `volume` |

---

### 5.8 Livraison

#### 43. `GET /content/:id/deliver` : Preuve d'accès
**Rôle.** Renvoie un lien direct de lecture ou de téléchargement. **Aucun octet ne passe par le Worker.** Toute réponse (succès comme refus) porte `Cache-Control: private, no-store`.
**En-tête obligatoire.** `X-Access-Proof: <charge>.<signature>` (§3.1).
**Paramètre.** `intent=download` : seuls les assets avec `download_allowed = 1` sont éligibles, la capacité exigée du provider devient `download` (au lieu de `resolve`), et un nom de fichier sûr est suggéré. Il n'existe **pas** de paramètre `format` sur cette route.
**Déroulement :**
1. pas d'en-tête → `401 ACCESS_PROOF_MISSING` (audit `access_proof_missing`)
2. vérification de la preuve (§3.1) ; en cas d'échec, même code et même statut, audit correspondant (la preuve n'est jamais journalisée)
3. contenu inexistant → `404 CONTENT_NOT_FOUND` (pas d'audit)
4. `editorial_status` ≠ `published` ou `moderation_status` ≠ `active` → `403 CONTENT_NOT_AVAILABLE` (audit `content_delivery_denied`)
5. une œuvre parente non publiée ou inactive → `403 CONTENT_NOT_AVAILABLE` (audit avec `reason: PARENT_WORK_NOT_PUBLISHED`)
6. sélection de l'asset et appel du provider (§6.3) ; aucun asset → `404 NO_COMPATIBLE_ASSET` (ou `NO_DOWNLOADABLE_ASSET` avec `intent=download`) ; tous les candidats en échec → `404 NO_DELIVERABLE_ASSET` (ou `NO_DOWNLOADABLE_ASSET`)
7. le provider répond sans URL → `502 LINK_UNAVAILABLE_FOR_PROVIDER` (audit `link_unavailable`)
8. succès : audit `link_issued` (avec `user_id`), `view_count` +1

**Réponse `200`.**
```json
{
  "status": "OK",
  "type": "link",
  "content_id": 12,
  "content_type": "book",
  "asset_id": 34,
  "provider_id": "google_drive",
  "format": "pdf",
  "delivery": { "status": "OK", "url": "https://drive.google.com/uc?id=…&export=download", "mime_type": "application/pdf", "size_bytes": "2048000" },
  "suggested_filename": "a-quoi-sert-le-passe.pdf"
}
```
- `delivery.mime_type` et `delivery.size_bytes` n'existent que pour Google Drive ; `size_bytes` y est un **texte** (valeur brute de l'API Google).
- `suggested_filename` n'apparaît qu'avec `intent=download` : slug (caractères hors `[a-zA-Z0-9_-]` remplacés par `-`, repli `content-<id>`) + `.` + format (alphanumérique seul, repli `bin`).
- Le `view_count` augmente à **chaque** lien livré, y compris pour un téléchargement. Un échec de l'incrément n'échoue jamais la livraison.

**Toutes les erreurs de cette route** : `401` `ACCESS_PROOF_MISSING`, `ACCESS_PROOF_MALFORMED`, `ACCESS_PROOF_INVALID_SIGNATURE`, `ACCESS_PROOF_MALFORMED_PAYLOAD`, `ACCESS_PROOF_WRONG_ISSUER`, `ACCESS_PROOF_EXPIRED` ; `403` `ACCESS_SUBSCRIPTION_INACTIVE`, `CONTENT_NOT_AVAILABLE` ; `404` `CONTENT_NOT_FOUND`, `NO_COMPATIBLE_ASSET`, `NO_DOWNLOADABLE_ASSET`, `NO_DELIVERABLE_ASSET` ; `500` `ACCESS_PROOF_PUBLIC_KEY_NOT_CONFIGURED`, `ACCESS_PROOF_PUBLIC_KEY_MALFORMED`, `INTERNAL_ERROR` ; `502` `LINK_UNAVAILABLE_FOR_PROVIDER`. Le corps d'erreur est `{ "error": "CODE" }` avec les mêmes en-têtes `no-store`.

---

### 5.9 Recherche

#### 44. `GET /search` : Ouvert
**Paramètres.** `q` (obligatoire), `type`, `language`, `category_id` (+ `exact_category=true`), `limit` (défaut 20, max 50), `offset`.
**Réponse `200`.** `{ "query": "texte reçu", "items": [Contenu + parts_count + relevance], "limit": 20, "offset": 0 }`, trié par `relevance` croissante (bm25 : plus petit = plus pertinent).
**Règles.**
- Index plein texte FTS5 sur **`title` et `description` uniquement** (pas `metadata` : un nom d'auteur stocké seulement dans `metadata` n'est pas cherchable).
- La requête est découpée sur les espaces ; chaque mot est mis entre guillemets avec préfixe (`"mot"*`) : recherche par début de mot, tous les mots exigés.
- Toujours en portée publique (ignore les signatures). Publiés + actifs, parties exclues.
**Erreurs.** `422 MISSING_QUERY` (vide ou espaces), `422 INVALID_TYPE`.

---

### 5.10 Statistiques et audit

#### 45. `GET /stats` : Signé
Réponse `200` : §4.9.

#### 46. `GET /audit` : Signé
**Paramètres.** `content_id`, `action`, `limit` (défaut 50, max 200), `offset`. Tri `created_at DESC, id DESC`.
**Réponse `200`.** `{ "items": [Ligne d'audit] }`. Actions possibles : §9.

---

### 5.11 Origines CORS

#### 47. `POST /internal/origins` : Signé
**Corps.** `{ "id": "org_<32 hex>", "origin": "https://app.exemple.com", "label"?: "texte" }`. L'`id` est alloué par le Worker Admin et enregistré tel quel.
**Réponse.** `201` si créée, `200` si la même paire (id, origin) existe déjà (idempotent, `already: true`). Corps : `{ "already": bool, "id", "origin", "label", "status", "created_at", "updated_at" }`. Une origine existante restée `inactive` reste inactive (utiliser la route 49).
**Erreurs.** `422 MISSING_ORIGIN_ID`, `422 INVALID_ORIGIN_ID_FORMAT`, `422 MISSING_ORIGIN`, `422 INVALID_ORIGIN_FORMAT`, `409 ORIGIN_ID_CONFLICT` (id déjà lié à une autre origine), `409 ORIGIN_ALREADY_REGISTERED` (origine déjà liée à un autre id). Audit `origin_created`. Le cache KV est rafraîchi aussitôt.

#### 48. `GET /internal/origins` : Signé
`{ "items": [Origine] }`, récentes d'abord.

#### 49. `PATCH /internal/origins/:id` : Signé
**Corps.** `label?`, `status?` (`active` \| `inactive`). La valeur `origin` n'est **pas** modifiable (même identique) : désactiver puis recréer avec un nouvel id. Réponse `200` : origine. Audit `origin_updated`.
**Erreurs.** `404 ORIGIN_NOT_FOUND`, `422 ORIGIN_VALUE_NOT_MODIFIABLE`, `422 INVALID_ORIGIN_STATUS`, `422 NO_FIELDS_TO_UPDATE`.

#### 50. `POST /internal/origins/:id/deactivate` : Signé
Sans corps. Idempotent. Réponse `200` : origine. Audit `origin_deactivated` (seulement si elle était active). **Erreurs.** `404 ORIGIN_NOT_FOUND`.

---

## 6. Livraison et providers

### 6.1 Les six providers

Un provider est une ligne de la table `providers` (`id`, `capabilities` = tableau JSON parmi `resolve`, `metadata`, `availability`, `download`) **et** un adaptateur codé dans `src/providers/adapters/`. Une capacité n'est exécutée que si elle est déclarée en base **et** codée. L'`id` en base doit être exactement l'une des six valeurs ci-dessous.

| `provider_id` | Format de `reference` | Ce que `resolve` / `download` renvoie | Capacités codées | Particularités |
|---|---|---|---|---|
| `google_drive` | identifiant du fichier Drive | `webContentLink` (à défaut `webViewLink`, qui n'est pas lisible directement), plus `mime_type` et `size_bytes` (texte) | resolve, download, metadata, availability | Exige `GOOGLE_SERVICE_ACCOUNT_EMAIL` et `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (sinon statut `NOT_IMPLEMENTED`). Le Worker interroge l'API Drive avec le compte de service (portée `drive.readonly`, jeton gardé en mémoire de l'isolate) pour **lire le lien**, mais le lecteur de l'application doit pouvoir ouvrir ce lien **sans autorisation** : le fichier doit être partagé « toute personne disposant du lien ». Forme usuelle du lien : `https://drive.google.com/uc?id=<id>&export=download` |
| `youtube` | identifiant de la vidéo | `https://www.youtube.com/watch?v=<id>` (aucun appel réseau) | resolve, metadata | Pas de `download`. Ce n'est pas un flux : l'application doit extraire l'identifiant et utiliser un lecteur YouTube. `metadata` exige `YOUTUBE_API_KEY` (route jamais appelée aujourd'hui) |
| `internet_archive` | `identifiant` ou `identifiant/chemin/du/fichier.ext` | `https://archive.org/download/<identifiant>/<chemin encodé>` | resolve, download, metadata, availability | Sans nom de fichier, le Worker interroge `archive.org/metadata/<id>` et prend le premier fichier dont `source = original` et ayant un `format`, sinon le premier. `download` refuse un item restreint (`ITEM_ACCESS_RESTRICTED`) ; `resolve` **ne le contrôle pas** |
| `catbox` | nom du fichier | `https://files.catbox.moe/<nom encodé>` | resolve, download | Fichiers publics, aucun appel réseau |
| `mega` | (sans objet) | `NOT_IMPLEMENTED` | resolve, download (non fonctionnels) | Structure prête, jamais livrable |
| `telegram` | (sans objet) | erreur `PROVIDER_LINK_UNSUPPORTED` | resolve, download (refusent) | **Jamais livrable** : l'URL de fichier de l'API Bot contient le jeton du bot. Les fichiers Telegram doivent être migrés |

Statuts internes d'un provider (jamais renvoyés tels quels au client ; ils finissent dans l'audit `provider_error`) : `OK`, `ERROR` (avec `message` : `Drive API error <code>`, `DRIVE_NO_LINK`, `PROVIDER_LINK_UNSUPPORTED`, `No file found in item`, `ITEM_ACCESS_RESTRICTED`, `Internet Archive error <code>`, `YouTube API error <code>`, `UNEXPECTED_PROVIDER_ERROR`), `NOT_IMPLEMENTED` (« Provider non configuré »).

Le champ `delivery_hint` de l'asset est transmis aux adaptateurs mais **aucun ne l'utilise**.

### 6.2 Formats choisissables par type

| Type du contenu | Formats acceptés par la livraison |
|---|---|
| `book` | `pdf`, `epub`, `txt`, `mobi`, `docx` |
| `audio` | `mp3`, `wav`, `m4a` |
| `video` | `mp4`, `webm`, `youtube_url` |
| `training` | aucun filtre de format : n'importe quel asset actif |

**Conséquence importante.** La livraison ne retient que les assets dont `format` figure dans cette liste. Un asset YouTube rattaché à une vidéo doit donc avoir `format = "youtube_url"` (ou `mp4`/`webm`) pour être livrable ; un asset de format `pdf` sur une vidéo ne sera jamais choisi. Un asset `format = "m4b"` sur un audio est ignoré.

### 6.3 Algorithme de sélection (`deliverContent`)

1. Candidats : assets du contenu avec `status = 'active'`, `download_allowed = 1` si `intent=download`, `format` dans la liste du type (sauf `training`). Tri : `priority` décroissante, puis `created_at` **croissante** (l'ancien d'abord).
2. Pour chaque candidat dans l'ordre :
   - la capacité requise (`resolve`, ou `download` si `intent=download`) doit être déclarée en base pour ce provider ; sinon audit `provider_capability_missing` et candidat suivant ;
   - appel de l'adaptateur ; si le statut est `OK` : `view_count` +1 et retour ; sinon audit `provider_error` et candidat suivant.
3. Aucun candidat : `NO_COMPATIBLE_ASSET` / `NO_DOWNLOADABLE_ASSET` (404). Tous en échec : `NO_DELIVERABLE_ASSET` / `NO_DOWNLOADABLE_ASSET` (404).

Le format n'est pas choisissable par le client. `GET …/assets/best?format=` ne renvoie pas de lien.

---

## 7. Hiérarchie des catégories, œuvres composées, parties

### 7.1 Catégories hiérarchiques
- Une catégorie a un `parent_id` (même type obligatoire). Les triggers de la base refusent un parent d'un autre type ou soi-même (`CATEGORY_PARENT_INVALID` au niveau SQL).
- **Profondeur** : 1 = catégorie principale ; maximum `CATEGORY_MAX_DEPTH` (8 par défaut). Vérifiée à la création, au déplacement (hauteur du sous-arbre incluse) et à l'ingestion.
- **Active effective.** Une catégorie est « effectivement active » si elle **et tous ses ancêtres** sont actifs. En public, une catégorie non effectivement active est introuvable (404), absente des listes et de l'arbre, et un filtre `category_id` dessus renvoie une liste vide. Désactiver un parent n'écrit rien dans les enfants.
- **Filtre par catégorie** (`GET /content`, `GET /search`) : la catégorie et ses descendants (actifs en public) par défaut ; `exact_category=true` pour elle seule.
- Le calcul de l'arbre est fait en mémoire à chaque requête (quelques centaines de lignes au plus) ; un nœud pris dans une boucle déjà présente en base est isolé et ignoré.

### 7.2 Deux sortes de liens entre contenus
| | Relation simple | Partie d'une œuvre |
|---|---|---|
| `is_part` | 0 | 1 |
| Routes d'écriture | `/content/:id/components`, `/components/:id` | `/content/:id/parts`, `/parts/:link_id/*` |
| Plusieurs parents | oui | **non** : une partie active n'appartient qu'à une œuvre (index unique) |
| Apparaît seule dans `GET /content` et `GET /search` | oui | **non** |
| Règle de composition | non | oui (`composition_rules`) |
| Ordre | `position` libre | `position` dense (0..n−1), gérée par le Worker |
| Concurrence | aucune | `expected_revision` obligatoire |

Les liens créés avant la v1.2 restent des relations simples ; **aucun n'est converti automatiquement** (route 38 pour le faire explicitement).

### 7.3 Visibilité d'une partie
Une partie est visible publiquement seulement si **elle-même et chacune de ses œuvres parentes, jusqu'à la racine,** sont `published` + `active`. Sinon : 404 en lecture, 403 `CONTENT_NOT_AVAILABLE` à la livraison. En public, une partie non publiée exclut aussi tout ce qui est sous elle dans l'arbre.

### 7.4 Calcul des durées
- Durée d'une feuille = `contents.duration_seconds`, sinon `duration_seconds` de son **meilleur asset actif** (priorité décroissante, plus ancien d'abord) qui en a une, sinon inconnue.
- Durée d'un nœud ayant des parties = **somme de ses parties** (sa propre `duration_seconds` est ignorée).
- `duration_complete = false` et `unknown_duration_parts` > 0 si au moins une feuille est de durée inconnue (la somme n'en tient alors pas compte).

### 7.5 Profondeur des parties
Comptée œuvre racine comprise ; maximum `PARTS_MAX_DEPTH` (6). Vérifiée à l'ajout, avec la hauteur du sous-arbre de la partie ajoutée. Les lectures vont jusqu'à 16 niveaux quelle que soit la configuration.

### 7.6 Règles de composition
Table de données (modifiable par les routes 40 à 42, sans redéploiement). Une composition parent → enfant n'est acceptée que s'il existe une règle **active** `(type de l'œuvre, type de la partie, kind)`. Les 13 règles initiales sont au §5.7. Un `kind` absent à l'ajout est déduit s'il n'y a qu'une règle active pour le couple de types.

---

## 8. Catalogue complet des erreurs

Format : `{"error":"CODE — texte"}`. « Où » = route(s) ou étape. Les erreurs de signature (§3.2) valent pour toutes les routes signées et pour toute lecture portant des en-têtes de signature.

### 8.1 Authentification et configuration

| Code | Statut | Cause |
|---|---|---|
| `ACCESS_PROOF_MISSING` | 401 | `deliver` sans en-tête `X-Access-Proof` |
| `ACCESS_PROOF_MALFORMED` | 401 | la preuve n'a pas exactement deux segments |
| `ACCESS_PROOF_INVALID_SIGNATURE` | 401 | signature ECDSA fausse (ou au format DER) |
| `ACCESS_PROOF_MALFORMED_PAYLOAD` | 401 | charge illisible (base64url ou JSON) |
| `ACCESS_PROOF_WRONG_ISSUER` | 401 | `issuer` différent de l'attendu |
| `ACCESS_PROOF_EXPIRED` | 401 | `expiresAt` dépassé ou illisible |
| `ACCESS_SUBSCRIPTION_INACTIVE` | 403 | `subscriptionActive` n'est pas le booléen `true` |
| `ACCESS_PROOF_PUBLIC_KEY_NOT_CONFIGURED` | 500 | secret `ACCESS_PROOF_PUBLIC_KEY_JWK` absent |
| `ACCESS_PROOF_PUBLIC_KEY_MALFORMED` | 500 | ce secret n'est pas un JSON lisible |
| `MISSING_INTER_WORKER_HEADERS` | 401 | un des quatre en-têtes de signature manque |
| `INVALID_NONCE_FORMAT` | 401 | nonce différent de 32 hex minuscules |
| `UNKNOWN_SERVICE` | 401 | `X-Service-Id` hors `admin`, `paiement`, `ia`, `utilisateurs` |
| `SERVICE_SECRET_NOT_CONFIGURED` | 500 | `HMAC_SECRET_<SERVICE>` absent |
| `TIMESTAMP_OUT_OF_RANGE` | 401 | horodatage illisible ou à plus de 300 s |
| `NONCE_ALREADY_USED` | 401 | nonce déjà vu en KV (5 minutes) |
| `NONCES_KV_NOT_CONFIGURED` | 500 | binding `NONCES_KV` absent |
| `INVALID_SIGNATURE` | 401 | HMAC différent (secret différent ou corps modifié) |
| `SERVICE_URL_NOT_CONFIGURED` | 500 | appel sortant `callWorkerService` sans `<SERVICE>_URL` (aucune route ne l'utilise aujourd'hui) |

### 8.2 Erreurs générales

| Code | Statut | Cause |
|---|---|---|
| `NOT_FOUND` | 404 | aucune route pour cette méthode et ce chemin |
| `INTERNAL_ERROR` | 500 | toute erreur non prévue (base, Turso, corps JSON invalide sur une ancienne route, `%` invalide dans l'URL, décodage de preuve) ; `details` si `DEBUG=true` |
| `INVALID_JSON_BODY` | 422 | routes récentes : JSON invalide ou non objet. (Anciennes routes : 500 `INTERNAL_ERROR`) |
| `NO_FIELDS_TO_UPDATE` | 422 | `PATCH` sans aucun champ modifiable (contenus, assets, composants, origines ; catégories seulement si corps `{}`) |
| `MISSING_TYPE` | 422 | `GET /content/categories` ou `/tree` sans `type` |
| `INVALID_TYPE` | 422 | type hors `book`, `video`, `audio`, `training` |
| `MISSING_QUERY` | 422 | `GET /search` sans `q` utile |

### 8.3 Contenus

| Code | Statut | Où et cause |
|---|---|---|
| `CONTENT_NOT_FOUND` | 404 | contenu inexistant, **ou non visible en public** ; assets, composants, parties, livraison, like |
| `MISSING_TITLE` | 422 | `POST /content` sans titre texte |
| `INVALID_EDITORIAL_STATUS` | 422 | statut hors `draft`, `published`, `archived` (aussi sur `GET /content`) |
| `INVALID_THUMBNAIL_URL_FORMAT` | 422 | miniature non `http(s)://…` ni `null` |
| `SLUG_ALREADY_EXISTS_FOR_TYPE` | 409 | `POST /content` : slug déjà pris pour ce type |
| `CONTENT_NOT_AVAILABLE` | 403 | `deliver` : non publié, inactif, ou œuvre parente non publiée |

### 8.4 Catégories

| Code | Statut | Où et cause |
|---|---|---|
| `CATEGORY_NOT_FOUND` | 404 | catégorie inexistante ou inactive en public ; aussi `POST/PATCH /content` avec une `category_id` inconnue |
| `CATEGORY_TYPE_MISMATCH` | 422 | catégorie d'un autre type que le contenu |
| `MISSING_NAME` | 422 | nom absent, non texte ou vide |
| `INVALID_CATEGORY_STATUS` | 422 | statut hors `active`, `inactive` |
| `INVALID_SLUG` | 422 | slug vide après normalisation |
| `CATEGORY_SLUG_ALREADY_EXISTS_FOR_TYPE` | 409 | slug déjà pris dans ce type |
| `INVALID_PARENT_CATEGORY` | 422 | `parent_id` non entier ≥ 1 |
| `PARENT_CATEGORY_NOT_FOUND` | 404 | parent inexistant |
| `PARENT_CATEGORY_TYPE_MISMATCH` | 422 | parent d'un autre type |
| `CATEGORY_CANNOT_BE_ITS_OWN_PARENT` | 422 | parent = soi-même |
| `CATEGORY_CYCLE_DETECTED` | 409 | parent = un de ses descendants |
| `CATEGORY_DEPTH_EXCEEDED` | 422 | profondeur maximale dépassée (création, déplacement, chemin) |
| `INVALID_CATEGORY_PATH` | 422 | `ensure` : `path` non tableau, vide, ou élément invalide |
| `CATEGORY_PATH_NOT_FOUND` | 404 | `ensure` avec `create:false` : un niveau manque |
| `CATEGORY_SLUG_ELSEWHERE` | 409 | `ensure` : le slug existe déjà sous un autre parent |

### 8.5 Assets et providers

| Code | Statut | Où et cause |
|---|---|---|
| `ASSET_NOT_FOUND` | 404 | asset inexistant (ou contenu non visible) |
| `NO_AVAILABLE_ASSET` | 404 | `assets/best` : aucun asset actif |
| `MISSING_PROVIDER_ID` | 422 | création d'asset |
| `MISSING_FORMAT` | 422 | création d'asset |
| `MISSING_REFERENCE` | 422 | création d'asset |
| `UNKNOWN_PROVIDER` | 422 | création d'asset : `provider_id` absent de la table `providers` |
| `INVALID_ASSET_STATUS` | 422 | statut hors `active`, `unavailable`, `processing` |
| `ASSET_ALREADY_REGISTERED_FOR_PROVIDER_REFERENCE` | 409 | paire provider + référence déjà enregistrée |
| `NO_COMPATIBLE_ASSET` | 404 | `deliver` : aucun asset actif de format compatible |
| `NO_DOWNLOADABLE_ASSET` | 404 | `deliver?intent=download` : aucun asset téléchargeable livrable |
| `NO_DELIVERABLE_ASSET` | 404 | `deliver` : tous les candidats ont échoué chez leur provider |
| `LINK_UNAVAILABLE_FOR_PROVIDER` | 502 | `deliver` : le provider n'a pas renvoyé d'URL |

Erreurs internes de providers (jamais renvoyées au client, visibles dans l'audit `provider_error` seulement) : `UNKNOWN_PROVIDER` (404), `CAPABILITY_NOT_SUPPORTED` (422), `CAPABILITY_DECLARED_BUT_NOT_IMPLEMENTED` (500).

### 8.6 Composants et parties

| Code | Statut | Où et cause |
|---|---|---|
| `PARENT_CONTENT_NOT_FOUND` | 404 | œuvre ou parent inexistant |
| `CHILD_CONTENT_NOT_FOUND` | 404 | enfant inexistant |
| `MISSING_CHILD_CONTENT_ID` | 422 | `child_content_id` absent |
| `CANNOT_LINK_CONTENT_TO_ITSELF` | 422 | enfant = parent |
| `CYCLE_DETECTED` | 409 | le lien créerait une boucle |
| `COMPONENT_ALREADY_LINKED` | 409 | lien déjà existant pour ce couple (composants : tout statut ; parties : déjà partie active) |
| `COMPONENT_NOT_FOUND` | 404 | composant inexistant |
| `INVALID_COMPONENT_TYPE` | 422 | libellé hors `^[a-z0-9_]+$` (parties/règles : 1 à 40 caractères) |
| `USE_PARTS_ROUTES` | 422 / 409 | 422 à la création avec `is_part` ; 409 en modification ou désactivation d'une partie |
| `PART_LINK_NOT_FOUND` | 404 | lien de partie inexistant |
| `NOT_AN_ACTIVE_PART_LINK` | 409 | le lien n'est pas une partie active |
| `NOT_AN_INACTIVE_PART_LINK` | 409 | `restore` sur un lien non retiré |
| `ALREADY_A_PART` | 409 | `convert` sur une partie |
| `LINK_INACTIVE` | 409 | `convert` sur un lien inactif |
| `LINK_EXISTS_USE_CONVERT` | 409 | `add` alors qu'une relation simple active existe |
| `CHILD_ALREADY_PART_OF_WORK` | 409 | l'enfant est déjà partie active d'une autre œuvre |
| `REPLACEMENT_IS_SAME_CONTENT` | 422 | `replace` par le même contenu |
| `EXPECTED_REVISION_REQUIRED` | 422 | `expected_revision` absent (sauf à l'ajout) |
| `INVALID_EXPECTED_REVISION` | 422 | pas un entier ≥ 0 |
| `PARTS_REVISION_CONFLICT` | 409 | quelqu'un a modifié l'œuvre entre-temps ; le texte donne la révision actuelle |
| `PARTS_ORDER_INVALID` | 422 | `order` n'est pas un tableau d'entiers |
| `PARTS_ORDER_MISMATCH` | 422 | `order` ne contient pas exactement les parties actives |
| `INVALID_POSITION` | 422 | position hors bornes |
| `PARTS_DEPTH_EXCEEDED` | 422 | profondeur maximale des parties dépassée |
| `INVALID_NAVIGATION_SCOPE` | 422 | `scope` hors `parent`, `work` |
| `NOT_A_PART` | 404 | `navigation` sur un contenu qui n'est pas une partie active |

### 8.7 Règles de composition

| Code | Statut | Cause |
|---|---|---|
| `COMPOSITION_NOT_ALLOWED` | 422 | aucune règle active pour ces types (ou ce libellé) |
| `COMPONENT_KIND_REQUIRED` | 422 | plusieurs règles possibles : le texte liste les libellés |
| `COMPOSITION_RULE_ALREADY_EXISTS` | 409 | règle active identique existante |
| `COMPOSITION_RULE_NOT_FOUND` | 404 | règle inexistante |

### 8.8 Origines CORS

| Code | Statut | Cause |
|---|---|---|
| `MISSING_ORIGIN_ID` | 422 | `id` absent |
| `INVALID_ORIGIN_ID_FORMAT` | 422 | `id` hors `org_` + 32 hex minuscules |
| `MISSING_ORIGIN` | 422 | `origin` absent |
| `INVALID_ORIGIN_FORMAT` | 422 | hors `^https?://[^/]+$` |
| `ORIGIN_ID_CONFLICT` | 409 | id déjà lié à une autre origine |
| `ORIGIN_ALREADY_REGISTERED` | 409 | origine déjà liée à un autre id |
| `ORIGIN_NOT_FOUND` | 404 | origine inexistante |
| `ORIGIN_VALUE_NOT_MODIFIABLE` | 422 | `origin` présent dans un `PATCH` |
| `INVALID_ORIGIN_STATUS` | 422 | statut hors `active`, `inactive` |

---

## 9. Journal d'audit

Table `content_audit_log`, en ajout seul. Lecture : route 46. Colonnes : `id`, `content_id` (`null` pour catégories, règles, origines), `action`, `actor`, `detail` (JSON), `created_at`.

**Deux niveaux.**
1. *Structurel* (catégories, règles, parties) : la ligne d'audit est écrite **dans le même lot transactionnel** que la modification ; pas de modification sans trace. L'acteur est le service signataire (ex. `admin`) ; pour les parties `detail.acting_user` reprend `X-Acting-User` s'il est présent.
2. *Courant* (le reste) : écriture « au mieux », acteur `system`. Un échec d'écriture n'interrompt jamais l'opération et est consigné par `console.error`.

| Action | `content_id` | `detail` |
|---|---|---|
| `created` | le contenu | `{type, title}` |
| `updated` | le contenu | `{fields:[clés du corps]}` |
| `archived` | le contenu | — |
| `asset_created` | le contenu | `{asset_id, provider_id, format}` |
| `asset_status_changed` | le contenu | `{asset_id, from, to}` |
| `asset_download_allowed_changed` | le contenu | `{asset_id, from, to}` (booléens) |
| `component_created` | le parent | `{component_id, child_content_id, component_type}` |
| `component_updated` | le parent | `{component_id, fields}` |
| `component_deactivated` | le parent | `{component_id}` |
| `category_created` | `null` | `{category_id, type, name}` |
| `category_updated` | `null` | `{category_id, fields}` |
| `category_moved` | `null` | `{category_id, from_parent_id, to_parent_id}` |
| `category_deactivated`, `category_reactivated` | `null` | `{category_id}` |
| `composition_rule_created` | `null` | `{rule_id, parent_type, child_type, kind}` |
| `composition_rule_reactivated` | `null` | `{rule_id, …}` |
| `composition_rule_deactivated` | `null` | `{rule_id}` |
| `part_added` | l'œuvre | `{child_content_id, kind, position, reactivated}` |
| `parts_reordered` | l'œuvre | `{order}` |
| `part_moved` | l'œuvre | `{link_id, child_content_id, from, to}` |
| `part_removed` | l'œuvre | `{link_id, child_content_id, standalone_again:true}` |
| `part_restored` | l'œuvre | `{link_id, child_content_id, kind, position}` |
| `part_replaced` | l'œuvre | `{link_id, old_child_content_id, new_child_content_id, kind, position}` |
| `part_converted` | l'œuvre | `{link_id, child_content_id, previous_type, kind, position}` |
| `access_proof_missing`, `access_proof_invalid`, `access_proof_wrong_issuer`, `access_proof_expired`, `access_subscription_inactive` | le contenu demandé (texte tel que dans l'URL) | — (jamais la preuve) |
| `content_delivery_denied` | le contenu | `{editorial_status, moderation_status}` ou `{reason:"PARENT_WORK_NOT_PUBLISHED", work_id}` |
| `provider_capability_missing` | le contenu | `{asset_id, provider_id, capability}` |
| `provider_error` | le contenu | `{asset_id, provider_id, status, message}` |
| `link_unavailable` | le contenu | `{asset_id, provider_id}` |
| `link_issued` | le contenu | `{user_id, asset_id, provider_id, download_intent}` |
| `origin_created` | `null` | `{origin_id, origin}` |
| `origin_updated` | `null` | `{origin_id, fields}` |
| `origin_deactivated` | `null` | `{origin_id}` |
| `migration_category_parent_cleared`, `migration_component_dropped` | variable | contenu complet de la ligne écartée (acteur `migration`) |

Non journalisés : `like`, `unlike`, les lectures, les incréments de vues.

---

## 10. Base de données

Source de vérité : `migrations/`. Le fichier `schema/schema.cible.sql` est informatif (produit par exécution locale sur le schéma *reconstitué*, pas sur la vraie base).

### 10.1 Tables

| Table | Colonnes principales | Contraintes |
|---|---|---|
| `contents` | `id` PK auto, `uid` ULID unique, `type`, `slug`, `title`, `description`, `language` (défaut `fr`), `category_id` → `categories`, `editorial_status` (défaut `draft`), `moderation_status` (défaut `active`), `metadata` (JSON texte), `level`, `duration_seconds`, `view_count` (**plus écrit**, conservé), `thumbnail_url`, `import_source`, `import_ref`, `created_at`, `updated_at`, `parts_revision` (défaut 0) | `UNIQUE(type, slug)` |
| `categories` | `id`, `name`, `slug`, `type`, `status` (défaut `active`), `parent_id`, `created_at`, `updated_at` | `UNIQUE(slug, type)` ; triggers sur `parent_id` |
| `content_assets` | `id`, `content_id`, `provider_id`, `format`, `mime_type`, `reference`, `size_bytes`, `duration_seconds`, `quality`, `language`, `delivery_hint`, `download_allowed` (0/1), `status` (défaut `active`), `priority` (défaut 0), dates | `UNIQUE(provider_id, reference)` |
| `providers` | `id` PK texte, `capabilities` (JSON : tableau) | — |
| `content_components` | `id`, `parent_content_id`, `child_content_id`, `component_type` (défaut `resource`), `position`, `status` (`active`/`inactive`), `is_part` (0/1), `metadata`, `created_at`, `updated_at` | `UNIQUE(parent, child)`, `CHECK(parent <> child)`, **index unique partiel** : un enfant n'a qu'un lien `is_part=1` actif |
| `composition_rules` | `id`, `parent_type`, `child_type`, `kind`, `status`, dates | `UNIQUE(parent_type, child_type, kind)` |
| `content_counters` | `content_id` PK → `contents` (cascade), `view_count`, `like_count`, `updated_at` | `CHECK >= 0` ; une ligne par contenu, créée au premier incrément |
| `content_stats` | `type` PK, `total_count`, `published_count`, `updated_at` | — |
| `content_audit_log` | `id`, `content_id` (nullable), `action`, `actor`, `detail`, `created_at` | index `(content_id, created_at DESC)` |
| `allowed_origins` | `id` PK (`org_…`), `origin` unique, `label`, `status`, dates | — |
| `contents_fts` | table virtuelle FTS5 sur `(title, description)`, `rowid` = `contents.id` | maintenue par trois triggers (insert, update, delete) |

Index : `idx_contents_category(category_id)`, `idx_contents_listing(created_at DESC, id DESC)`, `idx_categories_parent(type, parent_id)`, `idx_cc_child(child, status, is_part)`, `idx_cc_parent(parent, status, is_part, position)`, `idx_audit_content`, `uq_cc_one_work_per_part`.

**Pourquoi les compteurs sont dans une table à part.** Un incrément sur `contents` déclencherait le trigger de mise à jour de la recherche (réindexation) à chaque vue.

### 10.2 Clés KV (`NONCES_KV`)
- `<nonce de 32 hex>` → `"1"`, TTL 300 s.
- `cors:allowed_origins` → tableau JSON des origines actives, TTL 14 jours (rafraîchi à chaque écriture d'origine).

### 10.3 Migrations
| Fichier | Effet | Statut |
|---|---|---|
| `0001_hierarchie_et_parties.sql` | ajoute `contents.parts_revision` ; assainit `categories.parent_id` (parents invalides ou en boucle retirés, journalisés) ; triggers de validité du parent ; reconstruit `content_components` (ajout `is_part`, `status` contrôlé, `updated_at`, contraintes d'unicité) ; crée `composition_rules` + 13 règles ; index ; conserve les liens existants comme relations simples | **jamais exécutée sur une base réelle** |
| `0002_compteurs.sql` | crée `content_counters` ; y reprend `contents.view_count` des contenus ayant au moins une vue | **jamais exécutée sur une base réelle** |

0001 est écrite d'après le schéma *reconstitué* : si la vraie base diffère (table ou colonne), elle **échoue sans rien appliquer** (exécution transactionnelle). Elle ne supprime rien en silence ; les lignes écartées sont consignées dans l'audit.

**Migrations non fournies** : aucune ne remplit la table `providers` (seul le jeu de test le fait) ni `allowed_origins`.

---

## 11. Configuration

### 11.1 Variables et secrets lus par le code
| Nom | Type | Rôle | Obligatoire pour |
|---|---|---|---|
| `DB` | binding D1 | données | tout |
| `NONCES_KV` | binding KV | nonces, cache CORS | toute route signée (sinon 500) |
| `TURSO_DATABASE_URL` | variable | active Turso à la place de D1 | optionnel |
| `TURSO_AUTH_TOKEN` | secret | jeton Turso | si Turso |
| `HMAC_SECRET_ADMIN`, `_PAIEMENT`, `_IA`, `_UTILISATEURS` | secrets | signature par service | chaque service qui appelle réellement |
| `ACCESS_PROOF_PUBLIC_KEY_JWK` | secret | clé publique ECDSA P-256 (JWK) | `deliver` |
| `ACCESS_PROOF_EXPECTED_ISSUER` | variable | émetteur attendu (défaut `DSI_PAIEMENT`) | optionnel |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | secret | compte de service Google | livraison Drive |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | secret | clé PEM PKCS#8 | livraison Drive |
| `YOUTUBE_API_KEY` | secret | métadonnées YouTube | optionnel (jamais appelé) |
| `CATEGORY_MAX_DEPTH` | variable | défaut 8, plafond 32 | optionnel |
| `PARTS_MAX_DEPTH` | variable | défaut 6, plafond 16 | optionnel |
| `<SERVICE>_URL` | variable | appels sortants (aucune route ne s'en sert) | inutile |
| `DEBUG` | variable | `"true"` ajoute `details` aux 500 | **jamais en production** |

Mentionnés dans `wrangler.toml` mais **non lus** par le code : `GOOGLE_DRIVE_API_KEY`, `TELEGRAM_BOT_TOKEN`.

### 11.2 `wrangler.toml` (état du zip)
Nom du Worker `dsi-worker` (alors que `/health` répond `worker-contenu`), `main = "src/index.js"`, `compatibility_date = "2025-01-01"`, un binding D1 `DB`, un binding KV `NONCES_KV`. Les variables Turso et de profondeur sont commentées. Les secrets ne sont jamais dans ce fichier.

### 11.3 Diagnostic rapide
| Symptôme | Cause probable |
|---|---|
| `500 NONCES_KV_NOT_CONFIGURED` | binding KV absent |
| `500 SERVICE_SECRET_NOT_CONFIGURED` | `HMAC_SECRET_<SERVICE>` non défini |
| `500 ACCESS_PROOF_PUBLIC_KEY_NOT_CONFIGURED` | clé publique non définie |
| `401 INVALID_SIGNATURE` | secrets différents, ou corps modifié après signature |
| `401 TIMESTAMP_OUT_OF_RANGE` | horloge de l'appelant décalée de plus de 5 minutes |
| `401 INVALID_NONCE_FORMAT` | nonce avec tirets (UUID) |
| `401 ACCESS_PROOF_INVALID_SIGNATURE` | signature au format DER au lieu de 64 octets bruts, ou mauvaise clé |
| Livraison Drive en échec (audit `provider_error` + `NOT_IMPLEMENTED`) | compte de service Google non configuré |
| `UNKNOWN_PROVIDER` à la création d'un asset | table `providers` vide |
| Appel navigateur bloqué | origine absente de `allowed_origins` |
| `500` généralisé après déploiement | migrations non appliquées (§13) |
| `404 NOT_FOUND` sur une route récente | Worker encore en v1 |

---

## 12. Invariants et pièges

### 12.1 Règles à ne jamais casser (décisions de conception)
1. `content_assets.reference` ne sort jamais vers une route publique.
2. Les providers ignorent `content_id`, la catégorie et le type de contenu.
3. La preuve d'accès (membre) et la signature inter-Workers (service) restent indépendantes.
4. L'audit ne fait jamais échouer l'opération qu'il journalise.
5. `GET /content/categories` reste enregistrée avant `GET /content/:id`.

### 12.2 Pièges de comportement
1. Une catégorie parente sans contenu direct est absente de `GET /content/categories` mais présente dans l'arbre.
2. `children` ne donne aucun compteur.
3. `GET /content` est trié par date de création décroissante uniquement ; il n'existe aucun tri par titre, popularité ou vues.
4. Les parties disparaissent des listes et de la recherche, mais pas des listes de composants.
5. Le `view_count` est incrémenté même pour un téléchargement.
6. `deliver` ne permet pas de choisir le format ; un asset YouTube doit avoir `format = youtube_url` pour être livrable sur une vidéo.
7. La recherche ne couvre ni `metadata` ni les noms de catégories.
8. `GET /content/:id/assets` liste aussi les assets `unavailable` et `processing`.
9. Un lien de composant désactivé ne peut jamais être recréé pour le même couple.
10. `moderation_status` n'est modifiable par aucune route.
11. Un JSON invalide sur une ancienne route d'écriture donne 500, pas 4xx.
12. Le nonce HMAC est consommé même si la signature est fausse ; l'anti-rejeu est « au mieux » sous concurrence.
13. Les en-têtes de signature sur une lecture ouverte doivent être valides, sinon 401 ; sur `/search`, `/health` et `deliver` ils sont ignorés.
14. `PUT` n'est pas annoncé dans le préflight CORS ; sans effet pour une application native.
15. `total_count` des statistiques n'est jamais décrémenté.
16. La requête de livraison enchaîne plusieurs lectures de base, un appel au provider et des écritures d'audit : c'est la route la plus coûteuse.

---

## 13. Mise en ligne de la v1.2 sur une base v1 : ordre obligatoire

Constats tirés du code : les requêtes de lecture v1.2 référencent des colonnes et tables absentes d'une base v1 (`content_components.is_part` et `.status` dans le filtre « pas une partie » de `GET /content` et `GET /search` ; la table `content_counters` jointe dans **toute** lecture de contenu ; `contents.parts_revision`). Sans migration préalable, ces routes répondent **500**. À l'inverse, le dépôt indique que **l'ancien Worker fonctionne sur la base migrée** (testé sur base simulée seulement).

**Ordre :**
1. Sauvegarde : `wrangler d1 export <base> --remote --output sauvegarde.sql` (ou export Turso).
2. Lire le vrai schéma : `SELECT type, name, sql FROM sqlite_master ORDER BY type, name;` et le comparer à `schema/schema.reconstitue.sql`.
3. Appliquer `0001` puis `0002` sur une **copie** de la base, vérifier, puis sur la base réelle. L'ancien Worker continue de servir pendant ce temps.
4. Insérer les lignes manquantes de `providers` si besoin.
5. Déployer le Worker v1.2.
6. Contrôler : `GET /health`, `GET /content?type=book`, `GET /content/categories/tree?type=book`, `GET /content/<id>`, puis une livraison de test.
7. Retour arrière possible : redéployer l'ancien Worker (inchangé dans `legacy/worker-contenu.js`) sur la base migrée.

**Ce que la v1.2 change pour une application écrite contre la v1 :**
| Changement | Effet |
|---|---|
| Brouillons, archivés, modérés → 404 en lecture publique | l'application ne voit plus de contenu non publié |
| Parties masquées des listes et de la recherche | sans effet sur l'existant tant qu'aucun lien n'est converti en partie |
| `view_count` lu depuis `content_counters` | valeurs reprises par la migration 0002 |
| Nouveaux champs : `like_count`, `parts_count`, `is_part` | ajouts seulement |
| `GET /assets/:id` et `…/assets` : 404 si le contenu n'est pas visible | |
| Liste des composants publique : liens actifs vers enfants publiés seulement | |
| Aucune route retirée, aucune forme de réponse existante modifiée | formes v1 inchangées |

Le dépôt annonce une équivalence mesurée sur 299 requêtes entre l'ancien et le nouveau Worker (285 identiques, 14 écarts voulus, 0 inexpliqué), sur base simulée et non sur la base réelle.

---

## 14. Documentation du zip : ce qui est périmé

| Où | Dit | Réalité (code) |
|---|---|---|
| `README.md`, `docs/API.md` | 30 routes | 50 routes |
| `docs/API.md`, `docs/NOTES-ET-ECARTS.md` | les `GET` publics ne filtrent pas brouillons et archivés | ils filtrent (404) |
| `wrangler.toml` | 17 routes protégées | 31 |
| `docs/DATA-MODEL.md` | acteur d'audit toujours `system` | acteur = service signataire pour catégories, règles, parties ; `system` ailleurs |
| `README.md` | données : D1 et KV | Turso possible |
| `docs/NOTES-ET-ECARTS.md` n°1 | JSON invalide → 500 | vrai seulement pour les anciennes routes |
| `docs/CONFIGURATION.md` §1 | « aucun test », scripts limités | `package.json` contient `test`, `test:behaviour`, `test:turso`, `test:mutation` |
| Tous les `docs/` | renvois « L… » | numéros de lignes de `legacy/worker-contenu.js`, pas de `src/` |
| `docs/ERRORS-AND-AUDIT.md` | 66 codes, 24 actions | le code en contient davantage (§8, §9) |

Je n'ai pas relu en détail `docs/ARCHITECTURE.md`, `docs/CODE-REFERENCE.md` ni `docs/REFACTOR.md`.

---

## 15. Notes pour le découpage de l'équipe application (catégories)

Observations du code qui touchent directement les lots 1 à 5 proposés :

1. **Un seul appel suffit.** `GET /content/categories/tree?type=<type>` renvoie tout l'arbre d'un type avec `content_count` et `total_count`. La navigation « un niveau à la fois » peut se faire **entièrement en local** sur cet arbre : `GET /categories/:id` et `GET /categories/:id/children` ne sont pas nécessaires et `children` ne renvoie aucun compteur.
2. **Un arbre par type.** Quatre types, donc quatre appels (`book`, `audio`, `video`, `training`). Le paramètre `type` est obligatoire.
3. **`total_count` est cohérent avec la liste.** `GET /content?type=…&category_id=<id>` renvoie la catégorie **et** ses descendants actifs par défaut, soit exactement ce que compte `total_count`. `exact_category=true` correspond à `content_count`.
4. **Les chips actuels** (liste à plat) ne montrent que les catégories ayant du contenu direct ; l'arbre montre aussi les parents qui n'ont du contenu que dans leurs enfants. Les deux sources peuvent donc différer.
5. **Arbre vide = réponse normale** : `{ "items": [], "max_depth": 8 }` quand aucune catégorie n'a de contenu publié (ou aucune catégorie n'existe). Ce n'est pas une erreur.
6. **Worker non encore à jour :** `GET /content/categories/tree` répond `404 {"error":"NOT_FOUND"}` (route inconnue), à distinguer de `404 CATEGORY_NOT_FOUND` (catégorie inconnue). L'application doit traiter `NOT_FOUND` comme « arbre indisponible, retomber sur la liste à plat ».
7. **Catégorie désactivée ou ancêtre désactivé** : disparaît de l'arbre et répond 404 sur `GET /categories/:id` ; un cache de 24 h peut donc afficher une catégorie qui renverra une liste vide. Idem pour les compteurs après publication ou archivage.
8. **Tri** : par nom, comparaison de chaînes brute (majuscules avant minuscules, lettres accentuées après `z`). Si l'affichage doit suivre l'ordre alphabétique français, trier côté application.
9. **Profondeur** : `max_depth` est fourni dans la réponse (8 par défaut) : l'écran « fil d'ariane » doit supporter jusqu'à cette profondeur.
10. **Rien dans le Worker pour « Reprendre »** (progression par membre) : il ne conserve aucune donnée par membre.

---

## 16. Fiches route par route : JSON envoyé, JSON reçu, règles métier

Cette section reprend les 50 routes **une à une**, dans l'ordre de l'index du §5. Chaque fiche donne : l'accès, ce qu'il faut envoyer (en-têtes, paramètres, corps JSON exact), ce qu'on reçoit (JSON exact), toutes les erreurs possibles, et les règles métier.

### 16.0 Éléments communs (à lire une fois)

#### 16.0.1 Bloc « requête signée » (noté **SIG** dans les fiches)
Toute route marquée *Signé* exige ces quatre en-têtes (détails et code au §3.2), en plus de `Content-Type: application/json` quand il y a un corps :
```
X-Service-Id: admin
X-Timestamp: 1790000000
X-Nonce: 0f3a9c1e5b7d4e8a9c217d4e5f6a8b90
X-Signature: <hex minuscule de HMAC-SHA256("admin.1790000000.<nonce>.<corps exact>")>
```
Pour une route sans corps, le corps signé est la chaîne vide.

**Erreurs de signature possibles sur toute route SIG** (et sur toute lecture ouverte qui porte `X-Signature` ou `X-Service-Id`) :
| Statut | Corps |
|---|---|
| 401 | `{"error":"MISSING_INTER_WORKER_HEADERS"}` |
| 401 | `{"error":"INVALID_NONCE_FORMAT"}` |
| 401 | `{"error":"UNKNOWN_SERVICE"}` |
| 500 | `{"error":"SERVICE_SECRET_NOT_CONFIGURED"}` |
| 401 | `{"error":"TIMESTAMP_OUT_OF_RANGE"}` |
| 401 | `{"error":"NONCE_ALREADY_USED"}` |
| 500 | `{"error":"NONCES_KV_NOT_CONFIGURED"}` |
| 401 | `{"error":"INVALID_SIGNATURE"}` |

Ces erreurs ne sont **pas répétées** dans les fiches : une fiche *Signé* les inclut implicitement.

#### 16.0.2 Erreurs communes à toutes les routes
| Statut | Corps | Quand |
|---|---|---|
| 404 | `{"error":"NOT_FOUND"}` | méthode ou chemin inconnu |
| 500 | `{"error":"INTERNAL_ERROR"}` | erreur non prévue (base, Turso, `%` invalide dans l'URL…). Avec `DEBUG=true` : `{"error":"INTERNAL_ERROR","details":"…"}` |
| 500 | `{"error":"INTERNAL_ERROR"}` | JSON invalide dans le corps d'une **ancienne** route d'écriture (routes 6, 8, 14, 15, 22, 23, 24, 27, 47, 49) |
| 422 | `{"error":"INVALID_JSON_BODY"}` | JSON invalide sur une route **récente** (routes 7, 32 à 38, 40 à 42) |
| 422 | `{"error":"INVALID_JSON_BODY — un objet JSON est attendu"}` | corps JSON valide mais non objet (`[]`, `null`, `12`, `"x"`) sur une route récente |

#### 16.0.3 Objets de référence (forme exacte, ordre des clés du code)

**Contenu** : clés toujours présentes. `parts_count` et `is_part` selon la route (voir chaque fiche).
```json
{
  "id": 12,
  "uid": "01JXYZ0ABCDEFGHJKMNPQRSTVW",
  "type": "book",
  "slug": "a-quoi-sert-le-passe",
  "title": "A quoi sert le passé ?",
  "description": "Texte ou null",
  "language": "fr",
  "category_id": 3,
  "editorial_status": "published",
  "moderation_status": "active",
  "metadata": {},
  "level": "Intermédiaire",
  "duration_seconds": null,
  "view_count": 41,
  "like_count": 7,
  "thumbnail_url": "https://exemple.com/miniature.jpg",
  "created_at": 1790000000,
  "updated_at": 1790000500
}
```
- *Fiche* (routes 12 et 13) : le Contenu + `"parts_count": 0, "is_part": false`.
- *Élément de liste* (route 11) : le Contenu + `"parts_count": 0`.
- *Résultat de recherche* (route 44) : le Contenu + `"parts_count": 0, "relevance": -1.23`.
- *Retour d'écriture* (routes 14, 15, 16) : le Contenu seul.

**Catégorie**
```json
{ "id": 3, "name": "Développement", "slug": "developpement", "type": "book", "status": "active", "parent_id": null, "created_at": 1790000000, "updated_at": 1790000000 }
```

**Asset, vue interne** (retours des routes signées 22 et 23)
```json
{
  "id": 34, "content_id": 12, "provider_id": "google_drive", "format": "pdf", "mime_type": "application/pdf",
  "reference": "1AbCdEf…", "size_bytes": 2048000, "duration_seconds": null, "quality": null, "language": "fr",
  "delivery_hint": null, "download_allowed": true, "status": "active", "priority": 0,
  "created_at": 1790000000, "updated_at": 1790000000
}
```
**Asset, vue publique** (routes 19, 20, 21) : mêmes clés **sans** `provider_id`, `reference`, `delivery_hint`, `download_allowed`, **plus** `downloadable` en dernière clé :
```json
{
  "id": 34, "content_id": 12, "format": "pdf", "mime_type": "application/pdf", "size_bytes": 2048000,
  "duration_seconds": null, "quality": null, "language": "fr", "status": "active", "priority": 0,
  "created_at": 1790000000, "updated_at": 1790000000, "downloadable": true
}
```

**Lien (composant ou partie)**
```json
{
  "id": 77, "parent_content_id": 12, "child_content_id": 13, "component_type": "chapter", "position": 0,
  "status": "active", "is_part": true, "metadata": {}, "created_at": 1790000000
}
```
Dans les listes de composants (route 25) s'ajoute `"child": { "uid": "01J…", "title": "Chapitre 1", "type": "book", "slug": "chapitre-1" }`. Dans les retours des routes de parties s'ajoute `"parts_revision": 5`.

**Résumé de contenu** (réponses de parties)
```json
{ "id": 13, "uid": "01J…", "type": "book", "slug": "chapitre-1", "title": "Chapitre 1", "description": null,
  "language": "fr", "level": null, "thumbnail_url": null, "duration_seconds": 600 }
```
Portée interne : + `"editorial_status": "published", "moderation_status": "active"` à la fin.

**Règle de composition**
```json
{ "id": 1, "parent_type": "training", "child_type": "video", "kind": "lesson", "status": "active", "created_at": 1790000000, "updated_at": 1790000000 }
```

**Origine CORS**
```json
{ "id": "org_0f3a9c1e5b7d4e8a9c217d4e5f6a8b90", "origin": "https://app.exemple.com", "label": "Application web", "status": "active", "created_at": 1790000000, "updated_at": 1790000000 }
```

**Ligne d'audit**
```json
{ "id": 901, "content_id": 12, "action": "link_issued", "actor": "system", "detail": { "user_id": "user-42" }, "created_at": 1790000000 }
```

#### 16.0.4 Messages complets des erreurs à suffixe
Le code est ce qui précède ` — `. Texte exact en cas de besoin d'affichage ou de test :
| Code | Message complet |
|---|---|
| `INVALID_TYPE` | `INVALID_TYPE — doit être l'un de: book, video, audio, training` |
| `INVALID_EDITORIAL_STATUS` | `… — doit être l'un de: draft, published, archived` |
| `INVALID_ASSET_STATUS` | `… — doit être l'un de: active, unavailable, processing` |
| `INVALID_CATEGORY_STATUS` | `… — doit être l'un de: active, inactive` |
| `INVALID_THUMBNAIL_URL_FORMAT` | `… — attendu: URL http(s) ou null` |
| `CATEGORY_TYPE_MISMATCH` | `… — cette catégorie n'appartient pas au type du contenu` |
| `PARENT_CATEGORY_TYPE_MISMATCH` | `… — le parent doit avoir le même type` |
| `CATEGORY_CYCLE_DETECTED` | `… — le parent est un descendant de la catégorie` |
| `CATEGORY_DEPTH_EXCEEDED` | `… — profondeur maximale: 8` (la valeur configurée) |
| `INVALID_COMPONENT_TYPE` | `… — attendu: minuscules/chiffres/underscore` |
| `CYCLE_DETECTED` | `… — cette relation créerait une boucle` |
| `USE_PARTS_ROUTES` | 422 : `… — utiliser POST /content/:id/parts pour créer une partie` ; 409 : `… — ce lien est une partie d'œuvre` |
| `EXPECTED_REVISION_REQUIRED` | `… — fournir expected_revision (lu via GET /content/:id/parts)` |
| `PARTS_REVISION_CONFLICT` | `… — révision actuelle: 7` |
| `PARTS_ORDER_INVALID` | `… — order doit être un tableau d'identifiants de liens` |
| `PARTS_ORDER_MISMATCH` | `… — order doit contenir exactement les parties actives, une fois chacune` |
| `INVALID_POSITION` | `… — attendu: entier entre 0 et N` |
| `PARTS_DEPTH_EXCEEDED` | `… — profondeur maximale: 6 niveaux (œuvre comprise)` |
| `COMPOSITION_NOT_ALLOWED` | `… — <type œuvre> ne peut pas contenir <type partie>` ou `… sous le libellé « <kind> »` |
| `COMPONENT_KIND_REQUIRED` | `… — choisir parmi: chapter, episode, part` |
| `CHILD_ALREADY_PART_OF_WORK` | `… — œuvre n°<id>` (ou le code seul si détecté par la contrainte unique) |
| `LINK_EXISTS_USE_CONVERT` | `… — utiliser POST /parts/:link_id/convert` |
| `INVALID_NAVIGATION_SCOPE` | `… — attendu: parent ou work` |
| `MISSING_ORIGIN_ID` | `… — id (org_…) obligatoire sur le canal Admin` |
| `INVALID_ORIGIN_ID_FORMAT` | `… — attendu: org_ suivi de 32 caractères hexadécimaux minuscules` |
| `INVALID_ORIGIN_FORMAT` | `… — attendu: schéma://hôte[:port], sans chemin ni slash final` |
| `ORIGIN_ID_CONFLICT` | `… — cet id est déjà lié à une autre origin` |
| `ORIGIN_ALREADY_REGISTERED` | `… — cette origin est déjà liée à un autre id` |
| `ORIGIN_VALUE_NOT_MODIFIABLE` | `… — deactivate puis recréer avec un nouvel id Admin` |
| `INVALID_ORIGIN_STATUS` | `… — doit être active ou inactive` |

#### 16.0.5 Conventions des fiches
- **Obligatoire** : *oui* = absent ou invalide donne une erreur ; *non* = facultatif (valeur par défaut indiquée).
- Les champs inconnus d'un corps sont **ignorés sans erreur**.
- Les dates sont des entiers en secondes Unix.
- « Portée publique » / « interne » : voir §2.8.

---

### 16.1 Santé

#### Route 1 : `GET /health`
**Accès.** Ouvert.
**Requête.** Aucun paramètre, aucun corps.
**Réponse `200`.**
```json
{ "status": "ok", "service": "worker-contenu" }
```
**Erreurs.** Aucune propre à la route.
**Règles métier.** Ne lit pas la base : répond même si D1/Turso est indisponible. Ne passe pas par la détection de signature.

---

### 16.2 Catégories

#### Route 2 : `GET /content/categories`
**Accès.** Ouvert (portée interne si requête signée par `admin`).
**Requête.** `GET /content/categories?type=book`
| Paramètre | Obligatoire | Règle |
|---|---|---|
| `type` | oui | `book`, `video`, `audio` ou `training` |

**Réponse `200`** (portée publique) :
```json
{ "items": [ { "id": 3, "name": "Développement", "slug": "developpement", "count": 4 } ] }
```
Portée interne : chaque élément porte en plus `"status": "active", "parent_id": null`.
**Erreurs.**
| Statut | Code | Quand |
|---|---|---|
| 422 | `MISSING_TYPE` | `type` absent |
| 422 | `INVALID_TYPE` | type hors liste |

**Règles métier.**
- Seules les catégories ayant **au moins un contenu publié et actif, directement rattaché**, apparaissent (`count` = ce nombre, parties exclues).
- Une catégorie dont un ancêtre est inactif est exclue en public.
- Tri : par `name` croissant. Liste vide `{"items":[]}` si rien ne correspond.

#### Route 3 : `GET /content/categories/tree`
**Accès.** Ouvert (portée interne possible).
**Requête.** `GET /content/categories/tree?type=book&include_empty=true`
| Paramètre | Obligatoire | Règle |
|---|---|---|
| `type` | oui | liste fermée |
| `include_empty` | non | `true` (texte exact) garde les branches sans contenu publié, en public seulement |

**Réponse `200`.**
```json
{
  "items": [
    {
      "id": 3, "name": "Développement", "slug": "developpement", "type": "book", "status": "active",
      "parent_id": null, "depth": 1, "content_count": 4, "total_count": 11,
      "children": [
        { "id": 8, "name": "Python", "slug": "python", "type": "book", "status": "active",
          "parent_id": 3, "depth": 2, "content_count": 7, "total_count": 7, "children": [] }
      ]
    }
  ],
  "max_depth": 8
}
```
**Erreurs.** `422 MISSING_TYPE`, `422 INVALID_TYPE`.
**Règles métier.**
- `depth` : 1 pour une catégorie principale.
- `content_count` : contenus publiés + actifs directement dans la catégorie, parties exclues. `total_count` : `content_count` + somme des `total_count` des enfants retenus.
- Public : les catégories inactives et leur sous-arbre sont retirés ; sans `include_empty`, un nœud dont `total_count` vaut 0 est retiré ; un parent reste si un descendant a du contenu. Interne : tout est montré.
- Tri des frères par `name` (comparaison brute), puis `id`. Réponse vide : `{"items":[],"max_depth":8}`.
- Absente d'un Worker v1 : `404 {"error":"NOT_FOUND"}`.

#### Route 4 : `GET /categories/:id`
**Accès.** Ouvert (portée interne possible).
**Requête.** `GET /categories/3`.
**Réponse `200`.** Objet **Catégorie** (§16.0.3).
**Erreurs.** `404 CATEGORY_NOT_FOUND` : inexistante, ou **effectivement inactive en portée publique**.
**Règles métier.** « Effectivement inactive » = elle ou un de ses ancêtres est inactive.

#### Route 5 : `GET /categories/:id/children`
**Accès.** Ouvert (portée interne possible).
**Requête.** `GET /categories/3/children`.
**Réponse `200`.**
```json
{ "items": [ { "id": 8, "name": "Python", "slug": "python", "type": "book", "status": "active", "parent_id": 3, "depth": 2 } ] }
```
**Erreurs.** `404 CATEGORY_NOT_FOUND` (catégorie parente inexistante ou inactive en public).
**Règles métier.** Enfants **directs** seulement, triés par nom. En public, les enfants inactifs sont retirés. **Aucun compteur** et **aucun filtre sur le vide** : un enfant sans contenu est listé.

#### Route 6 : `POST /categories`
**Accès.** Signé (SIG).
**Requête (corps JSON).**
```json
{ "name": "Python", "type": "book", "slug": "python", "status": "active", "parent_id": 3 }
```
| Champ | Type | Obligatoire | Règle |
|---|---|---|---|
| `name` | texte | oui | non vide |
| `type` | texte | oui | liste fermée |
| `slug` | texte | non | sinon dérivé de `name` ; normalisé ; unique par type |
| `status` | texte | non (`active`) | `active` ou `inactive` |
| `parent_id` | entier | non | absent, `null` ou `0` = catégorie principale ; sinon parent du **même type** |

**Réponse `201`.** Objet **Catégorie**.
**Erreurs.**
| Statut | Code | Quand |
|---|---|---|
| 422 | `MISSING_NAME` | `name` absent ou non texte |
| 422 | `INVALID_TYPE` | type hors liste |
| 422 | `INVALID_SLUG` | slug vide après normalisation |
| 422 | `INVALID_CATEGORY_STATUS` | statut invalide |
| 409 | `CATEGORY_SLUG_ALREADY_EXISTS_FOR_TYPE` | slug déjà pris dans ce type |
| 422 | `INVALID_PARENT_CATEGORY` | `parent_id` pas un entier ≥ 1 |
| 404 | `PARENT_CATEGORY_NOT_FOUND` | parent inexistant |
| 422 | `PARENT_CATEGORY_TYPE_MISMATCH` | parent d'un autre type |
| 422 | `CATEGORY_DEPTH_EXCEEDED` | profondeur max dépassée |
| 500 | `INTERNAL_ERROR` | JSON invalide |

**Règles métier.** Création et ligne d'audit `category_created` dans **la même transaction**. L'ordre des contrôles : nom, type, slug, statut, doublon de slug, parent.

#### Route 7 : `POST /categories/ensure`
**Accès.** Signé (SIG). Déclarée avant `/categories/:id`.
**Requête (corps JSON strict).**
```json
{ "type": "audio", "path": ["Musique", "Hip-hop", "Rap français"], "create": true }
```
| Champ | Type | Obligatoire | Règle |
|---|---|---|---|
| `type` | texte | oui | liste fermée |
| `path` | tableau de textes | oui | non vide, longueur ≤ profondeur max, chaque élément texte non vide |
| `create` | booléen | non (`true`) | seule la valeur `false` empêche la création |

**Réponse `201`** si au moins un niveau a été créé, **`200`** sinon :
```json
{
  "category_id": 14,
  "created": true,
  "path": [
    { "id": 10, "name": "Musique", "slug": "musique", "parent_id": null, "status": "active", "created": false },
    { "id": 12, "name": "Hip-hop", "slug": "hip-hop", "parent_id": 10, "status": "active", "created": false },
    { "id": 14, "name": "Rap français", "slug": "rap-francais", "parent_id": 12, "status": "active", "created": true }
  ]
}
```
**Erreurs.**
| Statut | Code | Quand |
|---|---|---|
| 422 | `INVALID_JSON_BODY` | JSON invalide ou non objet |
| 422 | `INVALID_TYPE` | type hors liste |
| 422 | `INVALID_CATEGORY_PATH` | `path` non tableau, vide, ou élément invalide |
| 422 | `CATEGORY_DEPTH_EXCEEDED` | `path` plus long que la profondeur max |
| 422 | `INVALID_SLUG` | un nom donne un slug vide |
| 404 | `CATEGORY_PATH_NOT_FOUND` | `create:false` et un niveau manque |
| 409 | `CATEGORY_SLUG_ELSEWHERE` | le slug existe déjà sous un **autre** parent |

**Règles métier.** Chaque niveau est retrouvé par son slug **dans tout le type**. Les noms sont rognés. Une catégorie trouvée n'est jamais modifiée (une différence de nom est ignorée). Les catégories créées sont `active` et auditées (`category_created`). Idempotent, sans doublon en cas d'appels simultanés.

#### Route 8 : `PATCH /categories/:id`
**Accès.** Signé (SIG).
**Requête (corps JSON).**
```json
{ "name": "Python 3", "slug": "python-3", "status": "inactive", "parent_id": null }
```
| Champ | Type | Obligatoire | Règle |
|---|---|---|---|
| `name` | texte | non | non vide |
| `slug` | texte | non | normalisé ; unique par type |
| `status` | texte | non | `active` ou `inactive` |
| `parent_id` | entier ou `null` ou `""` | non | `null`/`""` = racine ; sinon parent du même type, ni soi-même ni un descendant |

Au moins un champ requis. `type` non modifiable. Champs inconnus ignorés.
**Réponse `200`.** Objet **Catégorie** à jour.
**Erreurs.**
| Statut | Code | Quand |
|---|---|---|
| 404 | `CATEGORY_NOT_FOUND` | catégorie inexistante |
| 422 | `MISSING_NAME` | `name` non texte ou vide |
| 422 | `INVALID_SLUG` | slug vide après normalisation |
| 409 | `CATEGORY_SLUG_ALREADY_EXISTS_FOR_TYPE` | slug pris par une autre catégorie |
| 422 | `INVALID_CATEGORY_STATUS` | statut invalide |
| 422 | `INVALID_PARENT_CATEGORY` | parent non entier ≥ 1 |
| 404 | `PARENT_CATEGORY_NOT_FOUND` | parent inexistant |
| 422 | `PARENT_CATEGORY_TYPE_MISMATCH` | parent d'un autre type |
| 422 | `CATEGORY_CANNOT_BE_ITS_OWN_PARENT` | parent = elle-même |
| 409 | `CATEGORY_CYCLE_DETECTED` | parent = un de ses descendants |
| 422 | `CATEGORY_DEPTH_EXCEEDED` | hauteur du sous-arbre comprise |
| 422 | `NO_FIELDS_TO_UPDATE` | corps `{}` |
| 500 | `INTERNAL_ERROR` | JSON invalide |

**Règles métier.** Un corps avec des champs sans effet (même parent, même slug) renvoie l'état courant sans erreur. Audit `category_updated` (liste toutes les clés du corps) et `category_moved` si le parent change, dans la même transaction.

#### Route 9 : `POST /categories/:id/deactivate`
**Accès.** Signé (SIG). **Requête.** Aucun corps.
**Réponse `200`.** Objet **Catégorie** avec `"status": "inactive"`.
**Erreurs.** `404 CATEGORY_NOT_FOUND`.
**Règles métier.** Les descendants sont masqués **à la lecture** (aucune ligne descendante n'est modifiée). Les contenus ne sont pas touchés mais deviennent introuvables par filtre de catégorie en public. Idempotent. Audit `category_deactivated`.

#### Route 10 : `POST /categories/:id/reactivate`
**Accès.** Signé (SIG). **Requête.** Aucun corps.
**Réponse `200`.** Objet **Catégorie** avec `"status": "active"`.
**Erreurs.** `404 CATEGORY_NOT_FOUND`.
**Règles métier.** Les descendants retrouvent leur visibilité selon leur propre statut. Audit `category_reactivated`.

---

### 16.3 Contenus

#### Route 11 : `GET /content`
**Accès.** Ouvert (portée interne si signé par `admin`).
**Requête.** `GET /content?type=book&category_id=3&language=fr&limit=30&cursor_created_at=1790000000&cursor_id=12`
| Paramètre | Obligatoire | Règle |
|---|---|---|
| `type` | non | liste fermée |
| `category_id` | non | la catégorie **et ses descendants actifs** ; effectivement inactive en public → liste vide |
| `exact_category` | non | `true` (texte exact) : la catégorie seule |
| `language` | non | égalité exacte (`fr`) |
| `editorial_status` | non | validé (`draft`, `published`, `archived`) mais **ignoré en public** ; filtre effectif en interne |
| `include_parts` | non | `true` : montre aussi les parties (interne seulement) |
| `limit` | non | défaut 30, max 100 ; invalide → 30 |
| `cursor_created_at`, `cursor_id` | non | **les deux** requis ensemble (sinon ignorés) ; reprennent après cet élément |

**Réponse `200`.**
```json
{
  "items": [ { "id": 12, "uid": "…", "type": "book", "slug": "…", "title": "…", "description": null, "language": "fr",
               "category_id": 3, "editorial_status": "published", "moderation_status": "active", "metadata": {},
               "level": "Intermédiaire", "duration_seconds": null, "view_count": 41, "like_count": 7,
               "thumbnail_url": null, "created_at": 1790000000, "updated_at": 1790000500, "parts_count": 0 } ],
  "next_cursor": { "cursor_created_at": 1790000000, "cursor_id": 12 }
}
```
`next_cursor` vaut `null` quand la page n'est pas pleine.
**Erreurs.** `422 INVALID_TYPE`, `422 INVALID_EDITORIAL_STATUS` (même en public).
**Règles métier.**
- Public : `editorial_status = published` **et** `moderation_status = active`, parties exclues. Le test de la chaîne d'œuvres parentes n'est pas nécessaire ici (les parties sont déjà exclues).
- Tri unique : `created_at` décroissant, puis `id` décroissant. Aucun autre tri n'existe.
- `next_cursor` n'est non nul que si `items.length === limit` : une dernière page exactement pleine donne un curseur dont la page suivante est vide.

#### Route 12 : `GET /content/:id`
**Accès.** Ouvert (portée interne possible).
**Requête.** `GET /content/12`.
**Réponse `200`.** **Fiche** : Contenu + `"parts_count": 3, "is_part": false` en dernières clés.
**Erreurs.** `404 CONTENT_NOT_FOUND` : inexistant, **ou non visible** (brouillon, archivé, modéré, œuvre parente non publiée).
**Règles métier.** `parts_count` = nombre de parties actives directes ; `is_part` = ce contenu est une partie active d'une œuvre.

#### Route 13 : `GET /content/by-slug/:type/:slug`
**Accès.** Ouvert (portée interne possible).
**Requête.** `GET /content/by-slug/book/a-quoi-sert-le-passe`.
**Réponse `200`.** **Fiche**, identique à la route 12.
**Erreurs.** `404 CONTENT_NOT_FOUND`. Un `type` invalide n'est pas validé : il donne ce même 404.
**Règles métier.** Le couple (type, slug) est unique. Le slug doit être donné normalisé (minuscules, tirets).

#### Route 14 : `POST /content`
**Accès.** Signé (SIG).
**Requête (corps JSON).**
```json
{
  "type": "book",
  "title": "A quoi sert le passé ?",
  "slug": "a-quoi-sert-le-passe",
  "description": "Texte libre",
  "language": "fr",
  "category_id": 3,
  "editorial_status": "draft",
  "metadata": { "author": "Aurélien STRIDE" },
  "level": "Intermédiaire",
  "duration_seconds": 1200,
  "thumbnail_url": "https://exemple.com/miniature.jpg",
  "import_source": "pipeline-x",
  "import_ref": "ref-123"
}
```
| Champ | Type | Obligatoire | Règle |
|---|---|---|---|
| `type` | texte | oui | liste fermée, immuable ensuite |
| `title` | texte | oui | non vide |
| `slug` | texte | non | sinon dérivé du titre ; normalisé ; unique par type |
| `description` | texte | non | `""` devient `null` |
| `language` | texte | non (`fr`) | libre |
| `category_id` | entier | non | doit exister et être du **même type** |
| `editorial_status` | texte | non (`draft`) | `draft`, `published`, `archived` |
| `metadata` | objet | non (`{}`) | libre |
| `level` | texte | non | libre ; `""` devient `null` |
| `duration_seconds` | entier | non | `0` devient `null` |
| `thumbnail_url` | texte ou `null` | non | doit commencer par `http://` ou `https://` |
| `import_source`, `import_ref` | texte | non | stockés, **jamais renvoyés** |

**Réponse `201`.** Objet **Contenu** (sans `parts_count` ni `is_part`), `moderation_status: "active"`, `view_count: 0`, `like_count: 0`.
**Erreurs.**
| Statut | Code | Quand |
|---|---|---|
| 422 | `INVALID_TYPE` | type hors liste |
| 422 | `MISSING_TITLE` | titre absent ou non texte |
| 422 | `INVALID_EDITORIAL_STATUS` | statut invalide |
| 422 | `INVALID_THUMBNAIL_URL_FORMAT` | miniature mal formée |
| 409 | `SLUG_ALREADY_EXISTS_FOR_TYPE` | slug déjà pris pour ce type |
| 404 | `CATEGORY_NOT_FOUND` | catégorie inconnue |
| 422 | `CATEGORY_TYPE_MISMATCH` | catégorie d'un autre type |
| 500 | `INTERNAL_ERROR` | JSON invalide |

**Règles métier.** Ordre des contrôles : type, titre, statut, miniature, doublon de slug, catégorie. Le compteur du type (`content_stats`) est incrémenté, et celui des publiés si créé directement en `published`. Audit `created` avec `{type, title}`. `moderation_status` vaut toujours `active` à la création. Un titre fait uniquement de symboles produit un slug vide, accepté une seule fois par type.

#### Route 15 : `PATCH /content/:id`
**Accès.** Signé (SIG).
**Requête (corps JSON).**
```json
{
  "title": "Nouveau titre", "description": "…", "language": "fr", "category_id": null, "level": "Avancé",
  "duration_seconds": 1500, "metadata": { "author": "…" }, "thumbnail_url": null, "editorial_status": "published"
}
```
Tous facultatifs, au moins un requis. **Non modifiables** : `type`, `slug`, `uid`, `moderation_status`, compteurs.
| Champ | Règle |
|---|---|
| `category_id` | `null` détache ; sinon catégorie existante du même type |
| `thumbnail_url` | `null` ou `http(s)://…` |
| `editorial_status` | `draft`, `published`, `archived` |
| `metadata` | **remplace** tout l'objet (pas de fusion) |

**Réponse `200`.** Objet **Contenu** à jour (sans `parts_count`/`is_part`).
**Erreurs.**
| Statut | Code | Quand |
|---|---|---|
| 404 | `CONTENT_NOT_FOUND` | contenu inexistant |
| 404 | `CATEGORY_NOT_FOUND` | catégorie inconnue |
| 422 | `CATEGORY_TYPE_MISMATCH` | catégorie d'un autre type |
| 422 | `INVALID_THUMBNAIL_URL_FORMAT` | miniature mal formée |
| 422 | `INVALID_EDITORIAL_STATUS` | statut invalide |
| 422 | `NO_FIELDS_TO_UPDATE` | aucun champ modifiable fourni |
| 500 | `INTERNAL_ERROR` | JSON invalide, ou `title: null` (contrainte base) |

**Règles métier.** Le titre n'est pas revalidé. Le compteur des publiés est ajusté quand le statut passe vers ou depuis `published`. Audit `updated` avec toutes les clés du corps (même ignorées). La modification du titre ou de la description met à jour l'index de recherche.

#### Route 16 : `POST /content/:id/archive`
**Accès.** Signé (SIG). **Requête.** Aucun corps.
**Réponse `200`.** Objet **Contenu** avec `"editorial_status": "archived"`.
**Erreurs.** `404 CONTENT_NOT_FOUND`.
**Règles métier.** Décrémente le compteur des publiés si le contenu l'était. Idempotent. Audit `archived`. Le contenu devient introuvable en public (404) et non livrable (403).

#### Route 17 : `POST /content/:id/like`
**Accès.** Signé (SIG). **Requête.** Aucun corps.
**Réponse `200`.**
```json
{ "content_id": 12, "view_count": 41, "like_count": 8 }
```
**Erreurs.** `404 CONTENT_NOT_FOUND` (inexistant ou non visible publiquement).
**Règles métier.** +1 atomique, créant la ligne de compteur au premier appel. Aucune identité de membre : un même appelant peut liker plusieurs fois, la limitation relève du Worker appelant. Non journalisé.

#### Route 18 : `POST /content/:id/unlike`
**Accès.** Signé (SIG). **Requête.** Aucun corps.
**Réponse `200`.** `{ "content_id": 12, "view_count": 41, "like_count": 6 }`.
**Erreurs.** `404 CONTENT_NOT_FOUND`.
**Règles métier.** −1 avec **plancher à 0**. Si le contenu n'a jamais eu de compteur : `{ "content_id": 12, "view_count": 0, "like_count": 0 }`.

---

### 16.4 Assets

#### Route 19 : `GET /content/:content_id/assets`
**Accès.** Ouvert (portée interne possible).
**Requête.** `GET /content/12/assets?format=pdf&status=active`
| Paramètre | Obligatoire | Règle |
|---|---|---|
| `format` | non | égalité exacte |
| `status` | non | `active`, `unavailable`, `processing` |

**Réponse `200`.**
```json
{ "items": [ { "id": 34, "content_id": 12, "format": "pdf", "mime_type": "application/pdf", "size_bytes": 2048000,
               "duration_seconds": null, "quality": null, "language": "fr", "status": "active", "priority": 0,
               "created_at": 1790000000, "updated_at": 1790000000, "downloadable": true } ] }
```
**Erreurs.** `404 CONTENT_NOT_FOUND` (inexistant ou non visible), `422 INVALID_ASSET_STATUS`.
**Règles métier.** Vue **publique** (jamais `reference`, `provider_id`, `delivery_hint`, `download_allowed`). `downloadable` = `download_allowed` vrai **et** le provider déclare `download`. Tous les statuts sont listés sans filtre. Tri : `priority` décroissante, puis `created_at` décroissante. Ne renvoie **aucun lien**.

#### Route 20 : `GET /content/:content_id/assets/best`
**Accès.** Ouvert (portée interne possible).
**Requête.** `GET /content/12/assets/best?format=pdf` (`format` facultatif).
**Réponse `200`.** Un objet **Asset public**.
**Erreurs.** `404 CONTENT_NOT_FOUND`, `404 NO_AVAILABLE_ASSET` (aucun asset `active`, ou aucun du format demandé).
**Règles métier.** Premier asset `active` par `priority` décroissante puis `created_at` **croissante**. Ne vérifie ni capacité du provider ni accessibilité du fichier. Ne remplace pas `deliver`.

#### Route 21 : `GET /assets/:id`
**Accès.** Ouvert (portée interne possible).
**Requête.** `GET /assets/34`.
**Réponse `200`.** Objet **Asset public**.
**Erreurs.** `404 ASSET_NOT_FOUND` : inexistant, **ou** contenu de l'asset non visible (même code).

#### Route 22 : `POST /content/:content_id/assets`
**Accès.** Signé (SIG).
**Requête (corps JSON).**
```json
{
  "provider_id": "google_drive",
  "format": "pdf",
  "reference": "1AbCdEf…",
  "mime_type": "application/pdf",
  "size_bytes": 2048000,
  "duration_seconds": null,
  "quality": null,
  "language": "fr",
  "delivery_hint": null,
  "download_allowed": true,
  "status": "active",
  "priority": 0
}
```
| Champ | Type | Obligatoire | Règle |
|---|---|---|---|
| `provider_id` | texte | oui | doit exister dans la table `providers` |
| `format` | texte | oui | libre (voir §6.2 pour les formats livrables) |
| `reference` | texte | oui | identifiant chez le provider (§6.1) |
| `mime_type`, `quality`, `language`, `delivery_hint` | texte | non | `""` devient `null` |
| `size_bytes`, `duration_seconds` | entier | non | `0` devient `null` |
| `download_allowed` | booléen | non (faux) | |
| `status` | texte | non (`active`) | `active`, `unavailable`, `processing` |
| `priority` | entier | non (0) | plus grand = choisi en premier |

**Réponse `201`.** Objet **Asset, vue interne** (avec `reference`).
**Erreurs.**
| Statut | Code | Quand |
|---|---|---|
| 404 | `CONTENT_NOT_FOUND` | contenu inexistant |
| 422 | `MISSING_PROVIDER_ID` | absent |
| 422 | `MISSING_FORMAT` | absent |
| 422 | `MISSING_REFERENCE` | absent |
| 422 | `UNKNOWN_PROVIDER` | provider absent de la table |
| 422 | `INVALID_ASSET_STATUS` | statut invalide |
| 409 | `ASSET_ALREADY_REGISTERED_FOR_PROVIDER_REFERENCE` | paire provider + référence déjà enregistrée (tous contenus confondus) |
| 500 | `INTERNAL_ERROR` | JSON invalide |

**Règles métier.** Ordre des contrôles : contenu, provider_id, format, reference, provider connu, statut, doublon. Audit `asset_created`. Le contenu n'a pas besoin d'être publié. Un asset dont le format n'est pas livrable pour le type du contenu ne sera jamais choisi par `deliver`.

#### Route 23 : `PATCH /assets/:id`
**Accès.** Signé (SIG).
**Requête (corps JSON).**
```json
{ "status": "unavailable", "priority": 5, "size_bytes": 2100000, "duration_seconds": 600, "quality": "hd",
  "delivery_hint": null, "mime_type": "application/pdf", "download_allowed": false }
```
Tous facultatifs, au moins un requis. **Non modifiables** : `format`, `reference`, `provider_id`, `content_id`, `language`.
**Réponse `200`.** Objet **Asset, vue interne** à jour.
**Erreurs.** `404 ASSET_NOT_FOUND`, `422 INVALID_ASSET_STATUS`, `422 NO_FIELDS_TO_UPDATE`, `500 INTERNAL_ERROR` (JSON invalide).
**Règles métier.** Audit seulement si `status` change réellement (`asset_status_changed` `{asset_id, from, to}`) ou si `download_allowed` change (`asset_download_allowed_changed`). Passer un asset à `unavailable` l'exclut de la livraison.

---

### 16.5 Composants (relations simples, `is_part = 0`)

#### Route 24 : `POST /content/:parent_id/components`
**Accès.** Signé (SIG).
**Requête (corps JSON).**
```json
{ "child_content_id": 13, "component_type": "resource", "position": 0, "metadata": { "note": "…" } }
```
| Champ | Type | Obligatoire | Règle |
|---|---|---|---|
| `child_content_id` | entier | oui | contenu existant, différent du parent |
| `component_type` | texte | non (`resource`) | `^[a-z0-9_]+$` |
| `position` | entier | non | défaut : dernière position + 1 (0 si aucun lien) ; non validé |
| `metadata` | objet | non (`{}`) | libre |
| `is_part` | booléen | non | **doit être faux ou absent** |

**Réponse `201`.** Objet **Lien** (sans `child`) :
```json
{ "id": 77, "parent_content_id": 12, "child_content_id": 13, "component_type": "resource", "position": 0,
  "status": "active", "is_part": false, "metadata": {}, "created_at": 1790000000 }
```
**Erreurs (dans l'ordre des contrôles).**
| Statut | Code | Quand |
|---|---|---|
| 404 | `PARENT_CONTENT_NOT_FOUND` | parent inexistant |
| 422 | `MISSING_CHILD_CONTENT_ID` | `child_content_id` absent |
| 404 | `CHILD_CONTENT_NOT_FOUND` | enfant inexistant |
| 422 | `CANNOT_LINK_CONTENT_TO_ITSELF` | enfant = parent |
| 409 | `CYCLE_DETECTED` | le lien créerait une boucle (parcours de tous les liens actifs) |
| 422 | `USE_PARTS_ROUTES` | `is_part` vrai : utiliser la route 32 |
| 422 | `INVALID_COMPONENT_TYPE` | libellé invalide |
| 409 | `COMPONENT_ALREADY_LINKED` | un lien existe déjà pour ce couple, **de n'importe quel statut** |
| 500 | `INTERNAL_ERROR` | JSON invalide |

**Règles métier.** Les parents et enfants ne sont pas tenus d'être publiés. Un enfant peut avoir plusieurs parents (relation simple). Audit `component_created`. Un lien désactivé bloque définitivement la recréation du couple.

#### Route 25 : `GET /content/:parent_id/components`
**Accès.** Ouvert (portée interne possible).
**Requête.** `GET /content/12/components?status=active`. `status` : interne seulement (ignoré en public) ; défaut `active`.
**Réponse `200`.**
```json
{ "items": [
  { "id": 77, "parent_content_id": 12, "child_content_id": 13, "component_type": "resource", "position": 0,
    "status": "active", "is_part": false, "metadata": {}, "created_at": 1790000000,
    "child": { "uid": "01J…", "title": "Ressource", "type": "book", "slug": "ressource" } } ] }
```
**Erreurs.** `404 CONTENT_NOT_FOUND` (parent inexistant ou non visible).
**Règles métier.** Tri `position` croissante puis `id`. En public : liens `active` vers des enfants **publiés et actifs** seulement. **Les liens de type partie (`is_part: true`) sont inclus** : filtrer côté application si seules les relations simples sont voulues. En interne, un `status` invalide donne une liste vide (pas d'erreur).

#### Route 26 : `GET /content/:parent_id/components/tree`
**Accès.** Ouvert (portée interne possible).
**Requête.** `GET /content/12/components/tree`.
**Réponse `200`.** L'objet **Contenu** racine (sans `parts_count`/`is_part`) avec une clé `children` ajoutée :
```json
{
  "id": 12, "uid": "…", "type": "training", "slug": "…", "title": "…", "description": null, "language": "fr",
  "category_id": null, "editorial_status": "published", "moderation_status": "active", "metadata": {},
  "level": null, "duration_seconds": null, "view_count": 0, "like_count": 0, "thumbnail_url": null,
  "created_at": 1790000000, "updated_at": 1790000000,
  "children": [
    { "component": { "id": 77, "component_type": "resource", "position": 0 },
      "content": { "id": 13, "uid": "…", "title": "…", "…": "…", "children": [] } }
  ]
}
```
**Erreurs.** `404 CONTENT_NOT_FOUND`.
**Règles métier.** Profondeur maximale 10 niveaux (au-delà `children: []`). Mêmes filtres que la route 25 à chaque niveau. Requêtes en cascade : le coût croît avec la taille. Inclut aussi les liens de type partie.

#### Route 27 : `PATCH /components/:id`
**Accès.** Signé (SIG).
**Requête (corps JSON).** `{ "position": 2, "component_type": "chapter", "metadata": { } }` ; au moins un champ.
**Réponse `200`.** Objet **Lien** (sans `child`).
**Erreurs.**
| Statut | Code | Quand |
|---|---|---|
| 404 | `COMPONENT_NOT_FOUND` | lien inexistant |
| 409 | `USE_PARTS_ROUTES` | le lien est une partie (`is_part: true`) |
| 422 | `INVALID_COMPONENT_TYPE` | libellé invalide |
| 422 | `NO_FIELDS_TO_UPDATE` | aucun champ |
| 500 | `INTERNAL_ERROR` | JSON invalide |

**Règles métier.** `metadata` remplace l'objet entier. Audit `component_updated`. `updated_at` est mis à jour.

#### Route 28 : `POST /components/:id/deactivate`
**Accès.** Signé (SIG). **Requête.** Aucun corps.
**Réponse `200`.** Objet **Lien** avec `"status": "inactive"`.
**Erreurs.** `404 COMPONENT_NOT_FOUND`, `409 USE_PARTS_ROUTES` (c'est une partie : utiliser la route 35).
**Règles métier.** **Aucune route ne réactive** un composant ; et le couple ne peut pas être recréé : désactivation définitive. Audit `component_deactivated`.

---

### 16.6 Parties d'une œuvre (`is_part = 1`)

**Rappel des règles communes aux écritures (routes 32 à 38) :** JSON strict ; `expected_revision` (voir ci-dessous) ; lot transactionnel unique ; positions toujours denses (0..n−1) ; retirer ne supprime jamais le contenu ; une partie active n'appartient qu'à une seule œuvre.

**Comment lire la révision.** `GET /content/:id/parts` en **portée interne** (requête signée `admin`) renvoie `parts_revision` (entier, 0 au départ). Chaque écriture réussie l'incrémente de 1 et la renvoie dans sa réponse.

**Erreurs communes aux routes d'écriture de parties** (non répétées en détail dans chaque fiche) :
| Statut | Code | Quand |
|---|---|---|
| 422 | `INVALID_JSON_BODY` | JSON invalide ou non objet |
| 404 | `PARENT_CONTENT_NOT_FOUND` | œuvre inexistante |
| 422 | `EXPECTED_REVISION_REQUIRED` | `expected_revision` absent (sauf route 32) |
| 422 | `INVALID_EXPECTED_REVISION` | pas un entier ≥ 0 |
| 409 | `PARTS_REVISION_CONFLICT` | révision différente de la courante (`… — révision actuelle: N`) |

**Contrôles d'une nouvelle partie** (routes 32, 36, 37, 38), dans l'ordre :
`422 MISSING_CHILD_CONTENT_ID` → `404 CHILD_CONTENT_NOT_FOUND` → `422 CANNOT_LINK_CONTENT_TO_ITSELF` → `409 CHILD_ALREADY_PART_OF_WORK` → `409 CYCLE_DETECTED` (sauf route 38) → règle de composition (`422 COMPOSITION_NOT_ALLOWED`, `422 COMPONENT_KIND_REQUIRED`, `422 INVALID_COMPONENT_TYPE`) → `422 PARTS_DEPTH_EXCEEDED`.

#### Route 29 : `GET /content/:id/parts`
**Accès.** Ouvert (portée interne possible).
**Requête.** `GET /content/12/parts` ; en interne `GET /content/12/parts?status=inactive`.
**Réponse `200`** (cas normal) :
```json
{
  "work": { "id": 12, "uid": "…", "type": "training", "slug": "…", "title": "…", "description": null,
            "language": "fr", "level": null, "thumbnail_url": null, "duration_seconds": null },
  "is_work": true,
  "total_parts": 2,
  "total_duration_seconds": 5400,
  "duration_complete": true,
  "unknown_duration_parts": 0,
  "items": [
    { "index": 1, "link_id": 77, "kind": "module", "position": 0, "depth": 1,
      "content": { "id": 13, "uid": "…", "type": "training", "slug": "…", "title": "Module 1", "description": null,
                   "language": "fr", "level": null, "thumbnail_url": null, "duration_seconds": null },
      "parts_count": 3, "duration_seconds": 3600, "duration_complete": true },
    { "index": 2, "link_id": 78, "kind": "module", "position": 1, "depth": 1,
      "content": { "id": 14, "…": "…" }, "parts_count": 0, "duration_seconds": 1800, "duration_complete": true }
  ],
  "parts_revision": 4
}
```
`parts_revision` n'existe qu'en portée interne ; les `work` et `content` portent alors aussi `editorial_status` et `moderation_status`.
**Variante interne `?status=inactive`** (liens retirés) :
```json
{ "work": { "…": "…" }, "parts_revision": 4,
  "items": [ { "link_id": 79, "kind": "lesson", "position": 2, "content": { "…": "…" } } ] }
```
Tri : date de retrait décroissante.
**Erreurs.** `404 CONTENT_NOT_FOUND` (inexistant ou non visible).
**Règles métier.**
- `items` = parties **directes** seulement, triées par `position`. `total_parts` = leur nombre.
- Un contenu qui n'est pas une œuvre donne `{ "is_work": false, "total_parts": 0, "total_duration_seconds": 0, "duration_complete": true, "unknown_duration_parts": 0, "items": [] }` (avec `work`), sans erreur.
- Durée d'une feuille : `duration_seconds` du contenu, sinon celle de son meilleur asset actif, sinon inconnue. Durée d'un nœud avec parties : somme de ses parties. `duration_complete: false` et `unknown_duration_parts > 0` si une feuille est de durée inconnue.
- Public : une partie non publiée/active est absente, avec tout ce qui est sous elle.

#### Route 30 : `GET /content/:id/parts/tree`
**Accès.** Ouvert (portée interne possible).
**Requête.** `GET /content/12/parts/tree?depth=3` (`depth` : 1 à 16, défaut 16).
**Réponse `200`.** Même enveloppe que la route 29 (`work`, `is_work`, `total_parts`, `total_duration_seconds`, `duration_complete`, `unknown_duration_parts`, `items`, `parts_revision` interne) ; chaque élément de `items` porte en plus `children`, récursif :
```json
{ "index": 1, "link_id": 77, "kind": "module", "position": 0, "depth": 1,
  "content": { "id": 13, "…": "…" }, "parts_count": 2, "duration_seconds": 3600, "duration_complete": true,
  "children": [
    { "index": 1, "link_id": 80, "kind": "lesson", "position": 0, "depth": 2,
      "content": { "id": 20, "…": "…" }, "parts_count": 0, "duration_seconds": 1800, "duration_complete": true,
      "children": [] }
  ] }
```
**Erreurs.** `404 CONTENT_NOT_FOUND`.
**Règles métier.** `depth` absent, `0` ou illisible donne 16 ; une valeur négative donne 1 ; une valeur supérieure à 16 est ramenée à 16 (jamais d'erreur). Les lectures ne s'arrêtent pas à `PARTS_MAX_DEPTH`, seulement à 16.

#### Route 31 : `GET /content/:id/navigation`
**Accès.** Ouvert (portée interne possible).
**Requête.** `GET /content/20/navigation?scope=work`
| Paramètre | Obligatoire | Règle |
|---|---|---|
| `scope` | non (`parent`) | `parent` ou `work` (rien à voir avec la portée d'accès) |

**Réponse `200`.**
```json
{
  "content": { "id": 20, "uid": "…", "type": "video", "slug": "…", "title": "Leçon 2", "description": null,
               "language": "fr", "level": null, "thumbnail_url": null, "duration_seconds": 1800 },
  "work":    { "id": 12, "…": "…" },
  "parent":  { "id": 13, "…": "…" },
  "path": [ { "id": 12, "uid": "…", "type": "training", "slug": "…", "title": "Formation" },
            { "id": 13, "uid": "…", "type": "training", "slug": "…", "title": "Module 1" } ],
  "kind": "lesson", "position": 1, "depth": 2,
  "scope": "work", "index": 2, "total": 5,
  "previous": { "link_id": 80, "kind": "lesson", "position": 0,
                "content": { "id": 19, "…": "…" }, "parts_count": 0 },
  "next": null
}
```
**Erreurs.**
| Statut | Code | Quand |
|---|---|---|
| 422 | `INVALID_NAVIGATION_SCOPE` | `scope` autre que `parent`/`work` |
| 404 | `CONTENT_NOT_FOUND` | contenu inexistant ou non visible |
| 404 | `NOT_A_PART` | le contenu n'est pas une partie active |

**Règles métier.**
- `path` : de l'œuvre racine jusqu'au parent direct ; le contenu lui-même n'y figure pas. `work` = racine ; `parent` = parent direct (identiques pour une partie de premier niveau).
- `scope=parent` : voisins dans le même parent ; `index` et `total` parmi les frères.
- `scope=work` : voisins dans l'ordre de lecture de toute l'œuvre, **feuilles seulement** (parcours en profondeur) ; `index`/`total` parmi les feuilles ; pour un nœud ayant des parties, `previous`/`next` sautent hors de son sous-arbre.
- `previous`/`next` valent `null` aux extrémités. En public, seules les parties publiées et actives comptent.

#### Route 32 : `POST /content/:id/parts`
**Accès.** Signé (SIG). Corps JSON strict.
**Requête.**
```json
{ "child_content_id": 20, "kind": "lesson", "position": 1, "metadata": { }, "expected_revision": 4 }
```
| Champ | Type | Obligatoire | Règle |
|---|---|---|---|
| `child_content_id` | entier | oui | contenu existant ≠ œuvre |
| `kind` | texte | non | libellé ; sinon déduit s'il n'existe **qu'une** règle active pour (type œuvre, type partie) |
| `position` | entier | non | 0 à n (n = nombre de parties actives) ; défaut fin |
| `metadata` | objet | non (`{}`) | libre |
| `expected_revision` | entier | **non** (seule route où c'est facultatif) | s'il est fourni, il doit correspondre |

**Réponse `201`.** Objet **Lien** + `parts_revision` :
```json
{ "id": 81, "parent_content_id": 12, "child_content_id": 20, "component_type": "lesson", "position": 1,
  "status": "active", "is_part": true, "metadata": {}, "created_at": 1790000000, "parts_revision": 5 }
```
**Erreurs.** Les erreurs communes, les contrôles d'une nouvelle partie, et :
| Statut | Code | Quand |
|---|---|---|
| 409 | `COMPONENT_ALREADY_LINKED` | déjà partie **active** de cette œuvre |
| 409 | `LINK_EXISTS_USE_CONVERT` | une relation simple active existe pour ce couple : route 38 |
| 422 | `INVALID_POSITION` | position non entière ou hors 0..n |

**Règles métier.**
- Un lien **inactif** existant pour ce couple est **réactivé** comme partie (au lieu d'en créer un autre).
- Les parties suivantes sont décalées ; les positions restent denses.
- La composition (type œuvre → type partie → `kind`) doit être autorisée par une règle active (§5.7).
- Profondeur totale ≤ `PARTS_MAX_DEPTH` (6), hauteur du sous-arbre de la partie comprise.
- Audit `part_added` `{child_content_id, kind, position, reactivated}` dans le même lot.

#### Route 33 : `PUT /content/:id/parts/order`
**Accès.** Signé (SIG). Corps JSON strict. **Note : méthode `PUT`** (non annoncée dans le préflight CORS : usage Worker à Worker).
**Requête.**
```json
{ "expected_revision": 4, "order": [78, 77, 79] }
```
| Champ | Type | Obligatoire | Règle |
|---|---|---|---|
| `expected_revision` | entier | oui | |
| `order` | tableau d'entiers | oui | **identifiants de liens** (`link_id`) de **toutes** les parties actives, chacun une fois |

**Réponse `200`.**
```json
{ "parts_revision": 5, "order": [78, 77, 79] }
```
**Erreurs.** Les erreurs communes, et `422 PARTS_ORDER_INVALID` (pas un tableau d'entiers), `422 PARTS_ORDER_MISMATCH` (doublons, manquants ou intrus).
**Règles métier.** Positions réécrites 0..n−1 selon `order`. Audit `parts_reordered` `{order}`.

#### Route 34 : `POST /parts/:link_id/move`
**Accès.** Signé (SIG). Corps JSON strict.
**Requête.** `{ "expected_revision": 4, "position": 0 }` (`position` : 0 à n−1, défaut dernière).
**Réponse `200`.** Objet **Lien** + `parts_revision`.
**Erreurs.** Les erreurs communes, et `404 PART_LINK_NOT_FOUND`, `409 NOT_AN_ACTIVE_PART_LINK` (lien non partie ou inactif), `422 INVALID_POSITION`.
**Règles métier.** L'œuvre concernée est celle du lien. Audit `part_moved` `{link_id, child_content_id, from, to}`.

#### Route 35 : `POST /parts/:link_id/remove`
**Accès.** Signé (SIG). Corps JSON strict.
**Requête.** `{ "expected_revision": 4 }`.
**Réponse `200`.** Objet **Lien** avec `"status": "inactive"` + `parts_revision`.
**Erreurs.** Les erreurs communes, et `404 PART_LINK_NOT_FOUND`, `409 NOT_AN_ACTIVE_PART_LINK`.
**Règles métier.** Le lien est désactivé (jamais supprimé) ; le contenu **n'est pas supprimé** et réapparaît seul dans le catalogue s'il est publié ; les positions restantes sont retassées. Audit `part_removed` `{link_id, child_content_id, standalone_again: true}`.

#### Route 36 : `POST /parts/:link_id/restore`
**Accès.** Signé (SIG). Corps JSON strict.
**Requête.** `{ "expected_revision": 4, "kind": "lesson", "position": 2 }` (`kind` défaut : ancien libellé ; `position` défaut fin).
**Réponse `200`.** Objet **Lien** actif + `parts_revision`.
**Erreurs.** Erreurs communes, contrôles d'une nouvelle partie, et `404 PART_LINK_NOT_FOUND`, `409 NOT_AN_INACTIVE_PART_LINK`, `422 INVALID_POSITION`.
**Règles métier.** Revalide la composition et la profondeur au moment de la restauration (la règle peut avoir été désactivée entre-temps). Audit `part_restored`.

#### Route 37 : `POST /parts/:link_id/replace`
**Accès.** Signé (SIG). Corps JSON strict.
**Requête.**
```json
{ "expected_revision": 4, "child_content_id": 25, "kind": "lesson", "metadata": { } }
```
| Champ | Obligatoire | Règle |
|---|---|---|
| `expected_revision` | oui | |
| `child_content_id` | oui | nouveau contenu, différent de l'ancien |
| `kind` | non | sinon déduit |
| `metadata` | non | sinon reprend celles de l'ancien lien |

**Réponse `200`.** **Nouveau** lien actif + `parts_revision`.
**Erreurs.** Erreurs communes, contrôles d'une nouvelle partie, et `404 PART_LINK_NOT_FOUND`, `409 NOT_AN_ACTIVE_PART_LINK`, `422 REPLACEMENT_IS_SAME_CONTENT`, `409 COMPONENT_ALREADY_LINKED` (le nouveau contenu est déjà partie active ici).
**Règles métier.** L'ancien lien devient inactif ; le contenu remplacé n'est ni supprimé ni modifié. Le nouveau lien prend la **même position**. Audit `part_replaced`.

#### Route 38 : `POST /parts/:link_id/convert`
**Accès.** Signé (SIG). Corps JSON strict.
**Rôle.** Transformer explicitement une relation simple active (`is_part: false`) en partie. Jamais automatique.
**Requête.** `{ "expected_revision": 4, "kind": "lesson", "position": 2 }`.
**Réponse `200`.** Objet **Lien** avec `"is_part": true` + `parts_revision`.
**Erreurs.** Erreurs communes, contrôles d'une nouvelle partie (sans le contrôle de cycle), et `404 PART_LINK_NOT_FOUND`, `409 ALREADY_A_PART`, `409 LINK_INACTIVE`, `422 INVALID_POSITION`.
**Règles métier.** Sans `kind` : l'ancien `component_type` s'il correspond à une règle active ; sinon la règle unique du couple de types ; sinon `COMPONENT_KIND_REQUIRED`. Audit `part_converted` `{link_id, child_content_id, previous_type, kind, position}`.

---

### 16.7 Règles de composition

#### Route 39 : `GET /composition-rules`
**Accès.** Ouvert (portée interne possible). **Requête.** Aucun paramètre.
**Réponse `200`.**
```json
{ "items": [ { "id": 1, "parent_type": "audio", "child_type": "audio", "kind": "chapter", "status": "active",
               "created_at": 1790000000, "updated_at": 1790000000 } ] }
```
**Erreurs.** Aucune propre à la route.
**Règles métier.** Tri `parent_type`, `child_type`, `kind`. Public : règles actives ; interne : toutes.

#### Route 40 : `POST /composition-rules`
**Accès.** Signé (SIG). Corps JSON strict.
**Requête.** `{ "parent_type": "audio", "child_type": "audio", "kind": "episode" }`
| Champ | Obligatoire | Règle |
|---|---|---|
| `parent_type`, `child_type` | oui | liste fermée des types |
| `kind` | oui | `^[a-z0-9_]{1,40}$` |

**Réponse `201`.** Objet **Règle**.
**Erreurs.** `422 INVALID_JSON_BODY`, `422 INVALID_TYPE`, `422 INVALID_COMPONENT_TYPE` (kind invalide), `409 COMPOSITION_RULE_ALREADY_EXISTS` (règle active identique).
**Règles métier.** Si une règle **inactive** identique existe, elle est **réactivée** (réponse également `201`, audit `composition_rule_reactivated`). Sinon audit `composition_rule_created`. Effet immédiat sur les prochaines écritures de parties.

#### Route 41 : `POST /composition-rules/:id/deactivate`
**Accès.** Signé (SIG). Corps vide ou objet JSON.
**Réponse `200`.** Objet **Règle** avec `"status": "inactive"`.
**Erreurs.** `404 COMPOSITION_RULE_NOT_FOUND`, `422 INVALID_JSON_BODY`.
**Règles métier.** N'affecte **pas** les parties déjà en place : la règle n'est contrôlée qu'à l'écriture. Audit `composition_rule_deactivated`.

#### Route 42 : `POST /composition-rules/:id/reactivate`
**Accès.** Signé (SIG). Corps vide ou objet JSON.
**Réponse `200`.** Objet **Règle** avec `"status": "active"`.
**Erreurs.** `404 COMPOSITION_RULE_NOT_FOUND`, `422 INVALID_JSON_BODY`.
**Règles métier.** Audit `composition_rule_reactivated`.

---

### 16.8 Livraison

#### Route 43 : `GET /content/:id/deliver`
**Accès.** Preuve d'accès du membre. **N'utilise pas** la signature entre Workers (les en-têtes `X-Signature` sont ignorés ici).
**Requête.**
```
GET /content/12/deliver?intent=download
X-Access-Proof: eyJpc3N1ZXIiOiJEU0lfUEFJRU1FTlQi….MEUCIQD…
```
| Élément | Obligatoire | Règle |
|---|---|---|
| En-tête `X-Access-Proof` | oui | `<charge base64url>.<signature base64url 64 octets>` (§3.1) |
| `intent` | non | `download` : n'accepte que les assets `download_allowed`, exige la capacité `download`, ajoute `suggested_filename`. Toute autre valeur = lecture |
| Paramètre `format` | **n'existe pas** | le format ne peut pas être demandé |

**Charge de la preuve (JSON avant encodage base64url) :**
```json
{ "issuer": "DSI_PAIEMENT", "userId": "user-42", "expiresAt": "2026-11-18T10:30:00.000Z", "subscriptionActive": true }
```
**Réponse `200`** (lecture) :
```json
{
  "status": "OK",
  "type": "link",
  "content_id": 12,
  "content_type": "book",
  "asset_id": 34,
  "provider_id": "google_drive",
  "format": "pdf",
  "delivery": {
    "status": "OK",
    "url": "https://drive.google.com/uc?id=1AbCdEf…&export=download",
    "mime_type": "application/pdf",
    "size_bytes": "2048000"
  }
}
```
Avec `?intent=download` s'ajoute, en dernière clé : `"suggested_filename": "a-quoi-sert-le-passe.pdf"`.
Selon le provider, `delivery` vaut :
| Provider | `delivery` |
|---|---|
| `google_drive` | `{ "status":"OK", "url":"…", "mime_type":"…", "size_bytes":"…" }` (`size_bytes` en **texte**) |
| `youtube` | `{ "status":"OK", "url":"https://www.youtube.com/watch?v=<id>" }` |
| `internet_archive` | `{ "status":"OK", "url":"https://archive.org/download/<id>/<fichier>" }` |
| `catbox` | `{ "status":"OK", "url":"https://files.catbox.moe/<fichier>" }` |

**En-têtes de réponse (succès et erreurs).** `Content-Type: application/json; charset=utf-8` et `Cache-Control: private, no-store`.
**Erreurs (corps `{"error":"CODE"}`).**
| Statut | Code | Quand |
|---|---|---|
| 401 | `ACCESS_PROOF_MISSING` | en-tête absent |
| 401 | `ACCESS_PROOF_MALFORMED` | pas exactement deux segments |
| 401 | `ACCESS_PROOF_INVALID_SIGNATURE` | signature fausse ou au format DER |
| 401 | `ACCESS_PROOF_MALFORMED_PAYLOAD` | charge illisible |
| 401 | `ACCESS_PROOF_WRONG_ISSUER` | émetteur différent de l'attendu |
| 401 | `ACCESS_PROOF_EXPIRED` | `expiresAt` dépassé ou illisible |
| 403 | `ACCESS_SUBSCRIPTION_INACTIVE` | `subscriptionActive` ≠ `true` |
| 404 | `CONTENT_NOT_FOUND` | contenu inexistant |
| 403 | `CONTENT_NOT_AVAILABLE` | non publié, inactif ou œuvre parente non publiée |
| 404 | `NO_COMPATIBLE_ASSET` | aucun asset actif de format livrable (lecture) |
| 404 | `NO_DOWNLOADABLE_ASSET` | aucun asset téléchargeable livrable (`intent=download`) |
| 404 | `NO_DELIVERABLE_ASSET` | tous les candidats ont échoué chez leur provider (lecture) |
| 502 | `LINK_UNAVAILABLE_FOR_PROVIDER` | le provider a répondu sans URL |
| 500 | `ACCESS_PROOF_PUBLIC_KEY_NOT_CONFIGURED` | secret absent |
| 500 | `ACCESS_PROOF_PUBLIC_KEY_MALFORMED` | secret illisible |
| 500 | `INTERNAL_ERROR` | erreur inattendue (dont signature en base64url invalide) |

**Règles métier (dans l'ordre d'exécution).**
1. Preuve vérifiée **avant** tout accès au catalogue.
2. Le contenu doit être `published` **et** `active`, et **toute** la chaîne de ses œuvres parentes aussi.
3. Les assets candidats : `status = active`, format livrable pour le type (§6.2 ; aucun filtre pour `training`), `download_allowed = 1` si `intent=download`. Tri : `priority` décroissante, puis `created_at` croissante.
4. Pour chaque candidat : la capacité (`resolve`, ou `download`) doit être déclarée en base pour son provider ; sinon on passe au suivant. Premier provider qui répond `OK` gagne ; sinon on passe au suivant.
5. Aucun relais d'octets : l'application télécharge l'URL elle-même (Range, reprise, hors ligne).
6. Succès : `view_count` +1 (même pour un téléchargement) ; audit `link_issued` avec l'`userId` de la preuve.
7. Chaque refus est journalisé sans jamais écrire la preuve.

---

### 16.9 Recherche

#### Route 44 : `GET /search`
**Accès.** Ouvert. Toujours en portée publique (les signatures sont ignorées).
**Requête.** `GET /search?q=excellence&type=book&language=fr&category_id=3&exact_category=true&limit=20&offset=0`
| Paramètre | Obligatoire | Règle |
|---|---|---|
| `q` | oui | non vide après rognage |
| `type` | non | liste fermée |
| `language` | non | égalité exacte |
| `category_id` | non | catégorie + descendants actifs ; `exact_category=true` : la catégorie seule |
| `limit` | non | défaut 20, max 50 |
| `offset` | non | défaut 0 |

**Réponse `200`.**
```json
{
  "query": "excellence",
  "items": [ { "id": 15, "uid": "…", "type": "book", "slug": "atteindre-l-excellence", "title": "Atteindre l'excellence",
               "description": null, "language": "fr", "category_id": 3, "editorial_status": "published",
               "moderation_status": "active", "metadata": {}, "level": "Intermédiaire", "duration_seconds": null,
               "view_count": 3, "like_count": 0, "thumbnail_url": null, "created_at": 1790000000,
               "updated_at": 1790000000, "parts_count": 0, "relevance": -2.31 } ],
  "limit": 20,
  "offset": 0
}
```
**Erreurs.** `422 MISSING_QUERY` (`q` absent ou vide), `422 INVALID_TYPE`.
**Règles métier.**
- Plein texte FTS5 sur `title` et `description` **uniquement** (pas `metadata`, pas le nom de la catégorie).
- Chaque mot de `q` (séparé par des espaces) est mis entre guillemets avec préfixe : recherche par **début de mot**, **tous** les mots exigés.
- Résultats : publiés + actifs, parties exclues. Tri par `relevance` croissante (plus petit = plus pertinent).
- `query` répète `q` tel que reçu.

---

### 16.10 Statistiques et audit

#### Route 45 : `GET /stats`
**Accès.** Signé (SIG). **Requête.** Aucun paramètre.
**Réponse `200`.**
```json
{
  "by_type": [
    { "type": "book", "total_count": 40, "published_count": 31, "updated_at": 1790000000 },
    { "type": "video", "total_count": 12, "published_count": 9, "updated_at": 1790000100 }
  ],
  "grand_total": 52
}
```
**Erreurs.** Aucune propre à la route.
**Règles métier.** Une ligne par type ayant déjà eu un contenu, triée par `type`. `total_count` n'est **jamais décrémenté** (un contenu archivé reste compté) ; `published_count` suit les passages vers et depuis `published`. `grand_total` = somme des `total_count`.

#### Route 46 : `GET /audit`
**Accès.** Signé (SIG).
**Requête.** `GET /audit?content_id=12&action=link_issued&limit=50&offset=0`
| Paramètre | Obligatoire | Règle |
|---|---|---|
| `content_id` | non | égalité |
| `action` | non | égalité exacte (liste au §9) |
| `limit` | non | défaut 50, max 200 |
| `offset` | non | défaut 0 |

**Réponse `200`.**
```json
{ "items": [
  { "id": 901, "content_id": 12, "action": "link_issued", "actor": "system",
    "detail": { "user_id": "user-42", "asset_id": 34, "provider_id": "google_drive", "download_intent": false },
    "created_at": 1790000000 } ] }
```
**Erreurs.** Aucune propre à la route.
**Règles métier.** Tri `created_at` décroissant puis `id` décroissant. `detail` vaut `null` si la ligne n'en a pas. Les lignes de catégories, règles et origines ont `content_id: null`. Les actions de livraison enregistrent `content_id` tel que reçu dans l'URL.

---

### 16.11 Origines CORS

#### Route 47 : `POST /internal/origins`
**Accès.** Signé (SIG).
**Requête (corps JSON).**
```json
{ "id": "org_0f3a9c1e5b7d4e8a9c217d4e5f6a8b90", "origin": "https://app.exemple.com", "label": "Application web" }
```
| Champ | Type | Obligatoire | Règle |
|---|---|---|---|
| `id` | texte | oui | `org_` + 32 hex minuscules, **alloué par le Worker Admin**, enregistré tel quel |
| `origin` | texte | oui | `^https?://[^/]+$` (schéma + hôte [+ port], sans chemin ni `/` final) |
| `label` | texte | non | libre |

**Réponse `201`** (nouvelle origine) ou **`200`** (même paire déjà connue) :
```json
{ "already": false, "id": "org_0f3a9c1e5b7d4e8a9c217d4e5f6a8b90", "origin": "https://app.exemple.com",
  "label": "Application web", "status": "active", "created_at": 1790000000, "updated_at": 1790000000 }
```
**Erreurs.**
| Statut | Code | Quand |
|---|---|---|
| 422 | `MISSING_ORIGIN_ID` | `id` absent |
| 422 | `INVALID_ORIGIN_ID_FORMAT` | `id` hors format |
| 422 | `MISSING_ORIGIN` | `origin` absent |
| 422 | `INVALID_ORIGIN_FORMAT` | `origin` hors format |
| 409 | `ORIGIN_ID_CONFLICT` | cet `id` est déjà lié à une autre origine |
| 409 | `ORIGIN_ALREADY_REGISTERED` | cette origine est déjà liée à un autre `id` |
| 500 | `INTERNAL_ERROR` | JSON invalide |

**Règles métier.** Idempotent : rejouer la même paire renvoie `200` avec `"already": true` (une origine restée `inactive` reste inactive). Le cache KV de la liste blanche est rafraîchi **immédiatement**. Audit `origin_created` `{origin_id, origin}`. La casse de l'origine est conservée telle quelle : l'en-tête `Origin` du navigateur doit correspondre **exactement**.

#### Route 48 : `GET /internal/origins`
**Accès.** Signé (SIG). **Requête.** Aucun paramètre.
**Réponse `200`.** `{ "items": [ Origine, … ] }`, de la plus récente à la plus ancienne ; toutes les origines (actives et inactives).
**Erreurs.** Aucune propre à la route.

#### Route 49 : `PATCH /internal/origins/:id`
**Accès.** Signé (SIG).
**Requête (corps JSON).** `{ "label": "Nouveau libellé", "status": "inactive" }` ; au moins un champ.
| Champ | Règle |
|---|---|
| `label` | texte libre |
| `status` | `active` ou `inactive` |
| `origin` | **interdit** : toute présence de `origin` donne une erreur, même identique |

**Réponse `200`.** Objet **Origine** à jour.
**Erreurs.**
| Statut | Code | Quand |
|---|---|---|
| 404 | `ORIGIN_NOT_FOUND` | id inconnu (le format de l'id n'est pas validé ici) |
| 422 | `ORIGIN_VALUE_NOT_MODIFIABLE` | `origin` présent dans le corps |
| 422 | `INVALID_ORIGIN_STATUS` | statut invalide |
| 422 | `NO_FIELDS_TO_UPDATE` | ni `label` ni `status` |
| 500 | `INTERNAL_ERROR` | JSON invalide |

**Règles métier.** Pour changer l'adresse d'une origine : la désactiver, puis en créer une nouvelle avec un nouvel `id` alloué par Admin. Cache KV rafraîchi aussitôt. Audit `origin_updated`.

#### Route 50 : `POST /internal/origins/:id/deactivate`
**Accès.** Signé (SIG). **Requête.** Aucun corps.
**Réponse `200`.** Objet **Origine** avec `"status": "inactive"`.
**Erreurs.** `404 ORIGIN_NOT_FOUND`.
**Règles métier.** Idempotent (déjà inactive : `200`, sans nouvelle ligne d'audit). Cache KV rafraîchi aussitôt ; les navigateurs de cette origine sont bloqués dès la prochaine requête. Audit `origin_deactivated` seulement si elle était active.

---

### 16.12 Récapitulatif : qui envoie quoi à qui

| Appelant | Routes qu'il utilise | Ce qu'il doit porter |
|---|---|---|
| Application (web ou mobile) | 1 à 5, 11 à 13, 19 à 21, 25, 26, 29 à 31, 39, 44 | rien (lecture ouverte) |
| Application (web ou mobile) | 43 | `X-Access-Proof` émis par le Worker « paiement » |
| Application web seulement | toutes | son origine doit être enregistrée (route 47) |
| Worker Admin | 6 à 10, 14 à 16, 22 à 24, 27, 28, 32 à 38, 40 à 42, 45 à 50 et toutes les lectures « internes » | signature `admin` (SIG) |
| Worker relais (utilisateurs, paiement ou autre) | 17, 18 | signature de son service (SIG) |
| Services `ia`, `paiement`, `utilisateurs` | aucune route ne leur est réservée | ils sont *autorisés* à signer, mais le code ne leur donne que la lecture publique ; seule leur signature sur 17 et 18 (ou tout autre appel signé) est acceptée |
