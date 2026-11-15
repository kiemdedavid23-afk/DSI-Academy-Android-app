# Contrat Worker Notifications — V1.0.1

Document unique. Il remplace la lecture du code pour tout appelant du Worker : Workers producteurs, Console Admin, GitHub Actions, site web, application, Gateway WhatsApp, bot Telegram.

| | |
|---|---|
| Service | `worker-notifications` (`GET /health` → `{ service, version: "1.0.1", status: "ok" }`) |
| Version du contrat | 1.0.1 |
| Statut | **Figé à la validation réelle sur Cloudflare.** Jusque-là : candidat à la validation (RC). |
| Exception | §8 (bot Telegram) : **projet, non figé**, à valider séparément. |
| Source de vérité | Ce document décrit le comportement réel du code V1.0.1 (relevé route par route, vérifié par `tests/contract-sync.test.js`). |

## Sommaire
1. Rôle du Worker
2. Conventions communes
3. Authentification (HMAC DSI, Access Proof, HMAC Gateway WhatsApp)
4. Index des routes
5. **Contrat A — Workers producteurs et services internes**
6. **Contrat B — Site web et application**
7. **Contrat C — Gateway WhatsApp**
8. **Contrat D — Bot Telegram (projet, non figé)**
9. Contrat E — Fournisseurs sortants (Email, FCM, WhatsApp, SMS, Telegram, Paiement)
10. Règles de distribution
11. Garanties et limites
12. Exploitation
13. Points ouverts
14. Règle de modification du contrat
Annexe 1 — Exemple de signature HMAC DSI
Annexe 2 — Exemples de requêtes

---

## 1. Rôle du Worker

Le Worker Notifications **reçoit des événements métier** des autres Workers, en fait des **notifications**, et les **distribue** aux membres par plusieurs canaux : In-App (boîte de notifications), Push (FCM), Email, WhatsApp, SMS, Telegram. Il gère aussi les annonces de la Console Admin, les installations (application + jeton push), les préférences et destinations de canaux, la distribution des versions de l'application, et la liste des Origins autorisées (CORS).

Ce qu'il **ne fait pas** :
- il ne décide pas du métier : le producteur reste propriétaire de l'événement et de son sens ;
- il n'émet pas d'Access Proof (émise par le Worker Paiement) ;
- il ne contacte jamais le Worker Paiement pendant une requête membre (l'Access Proof est vérifiée localement avec la clé publique) ;
- il ne scrute jamais GitHub (les versions lui sont poussées).

## 2. Conventions communes

### 2.1 Format
- JSON UTF-8. Dates en ISO 8601 UTC (`2026-11-15T02:20:00.000Z`). Horodatages HMAC en secondes epoch.
- Les noms de champs sont en `camelCase` dans les corps de requêtes et de réponses ; plusieurs routes acceptent aussi la forme `snake_case` en **entrée** (indiqué route par route). Certaines réponses exposent des lignes de base de données en `snake_case` (indiqué route par route : l'appelant ne doit pas supposer l'uniformité).
- Le `Content-Type` des requêtes avec corps est `application/json`.

### 2.2 Enveloppe de réponse standard
Toutes les routes, **sauf `/internal/origins` (§5.4)**, répondent :

Succès :
```json
{ "success": true, "error": null, "code": null, "data": { } }
```
Échec :
```json
{ "success": false, "error": "message lisible", "code": "CODE_STABLE" }
```
Le champ `code` est stable et destiné aux programmes ; `error` est un texte et peut évoluer. Les routes HMAC (internes) renvoient pour `error` la même valeur que `code`.

### 2.3 Codes d'erreur communs
| HTTP | `code` | Sens |
|---|---|---|
| 400 | `INVALID_SCHEMA`, `UNSUPPORTED_CONTRACT_VERSION` | Callbacks Gateway : corps incomplet / version de contrat inconnue |
| 401 | `MISSING_HEADERS`, `SERVICE_NOT_ALLOWED`, `NONCE_FORMAT_INVALID`, `TIMESTAMP_SKEW`, `BAD_SIGNATURE`, `NONCE_REPLAY` | HMAC DSI (§3.1) |
| 401 | `ACCESS_PROOF_MISSING`, `ACCESS_PROOF_INVALID`, `ACCESS_PROOF_EXPIRED` | Access Proof (§3.2) |
| 401 | `UNKNOWN_KEY`, `NONCE_REPLAYED`, `TIMESTAMP_EXPIRED`, `BAD_SIGNATURE` | HMAC Gateway WhatsApp (§3.3) |
| 403 | `ORIGIN_NOT_ALLOWED` | Origin de navigateur non autorisée |
| 403 | `SUBSCRIPTION_INACTIVE` | Route nécessitant un abonnement actif |
| 404 | `NOT_FOUND` | Ressource ou route inconnue |
| 409 | `CONFLICT` | Conflit (installation d'un autre membre ; Origin) |
| 410 | `TELEGRAM_CONFIRM_NOT_CLIENT_SIDE` | Route supprimée côté membre (§6.5) |
| 422 | `VALIDATION`, `INVALID_TARGET`, `INVALID_TARGET_MODE` | Corps invalide |
| 500 | `CONFIG` | Secret ou clé non configuré (côté Worker) |
| 500 | `INTERNAL` | Erreur interne inattendue |
| 501 | `DEPENDENCY_PENDING` | Dépendance contractuelle non finalisée (§9.5) |
| 503 | `NOT_CONFIGURED`, `CONFIG` | Service ou secret non configuré (activation WhatsApp, callbacks) |

### 2.4 CORS
- **Origin autorisée** (présente dans la liste active, §5.4) : réponses avec `Access-Control-Allow-Origin: <origin>`, `Allow-Methods: GET, POST, PATCH, OPTIONS`, `Allow-Headers: Content-Type, X-Access-Proof, X-Service-Id, X-Timestamp, X-Nonce, X-Signature`, `Max-Age: 86400`, `Vary: Origin`.
- **Origin refusée** : `403 ORIGIN_NOT_ALLOWED` (routes membre) ou `403` vide (préflight `OPTIONS`), **sans aucun en-tête `Access-Control-*`** : le navigateur ne peut pas lire la réponse.
- **Origin absente** (application native, appel serveur à serveur) : acceptée, aucun en-tête CORS ajouté.
- La comparaison d'Origin est **exacte** (texte, après suppression des espaces aux extrémités). `https://site.com` et `https://site.com/` sont deux valeurs différentes.

### 2.5 Taille et temps
- Le Worker ne fixe pas de taille maximale de corps propre ; les limites de la plateforme Cloudflare s'appliquent.
- Les routes internes de réception d'événements répondent **avant** la fin des envois externes (§5.1).

## 3. Authentification

Trois mécanismes distincts, selon l'appelant.

### 3.1 HMAC inter-Workers DSI (Contrat A, Telegram)
En-têtes obligatoires :

| En-tête | Valeur |
|---|---|
| `X-Service-Id` | Identifiant de l'appelant (§3.1.1) |
| `X-Timestamp` | Secondes epoch, entier en texte |
| `X-Nonce` | **32 caractères hexadécimaux minuscules** (`^[0-9a-f]{32}$`), à usage unique |
| `X-Signature` | HMAC-SHA256 en hexadécimal minuscule |

Chaîne signée (concaténation avec des points, **corps brut exact**, chaîne vide pour une requête sans corps) :
```
{X-Service-Id}.{X-Timestamp}.{X-Nonce}.{corpsBrut}
```
Clé HMAC : le secret propre à l'appelant. La comparaison est faite en temps constant sur le corps **tel qu'envoyé** : l'appelant signe exactement les octets qu'il transmet (pas de re-sérialisation).

Contrôles, dans l'ordre : en-têtes présents (`MISSING_HEADERS`) → service autorisé **pour cette route** (`SERVICE_NOT_ALLOWED`) → secret configuré (`CONFIG`, 500) → format du nonce (`NONCE_FORMAT_INVALID`) → horodatage dans la fenêtre (`TIMESTAMP_SKEW`) → signature (`BAD_SIGNATURE`) → nonce jamais vu (`NONCE_REPLAY`).

**Fenêtre** : `|maintenant − X-Timestamp| ≤ 300 s` (variable `TIMESTAMP_WINDOW_SECONDS`). Les horloges des appelants doivent être synchronisées (NTP).

**Anti-rejeu** : chaque nonce n'est accepté qu'**une fois** par service, pendant 360 s (fenêtre + 60 s). Mécanisme principal : insertion atomique en D1. Repli : KV (garantie plus faible, voir §11 et `docs/ANTI_REPLAY.md`). Chaque requête, **y compris une relance, doit utiliser un nouveau nonce** (et un nouveau timestamp conseillé).

#### 3.1.1 Services et secrets
| `X-Service-Id` | Secret (côté Worker) | Routes autorisées |
|---|---|---|
| `paiement` | `HMAC_SECRET_PAIEMENT` | `POST /internal/events` |
| `boutique` | `HMAC_SECRET_BOUTIQUE` | `POST /internal/events` |
| `community` | `HMAC_SECRET_COMMUNITY` | `POST /internal/events` |
| `marketplace` | `HMAC_SECRET_MARKETPLACE` | `POST /internal/events` |
| `admin` | `HMAC_SECRET_ADMIN` | `POST /internal/events`, `/internal/admin/notifications*`, `POST /internal/releases`, `/internal/origins*` |
| `github-actions` | `HMAC_SECRET_GITHUB_ACTIONS` | `POST /internal/releases` |
| `telegram-bot` | `HMAC_SECRET_TELEGRAM_BOT` | `POST /internal/telegram/confirm` (§8) |

Un service appelant une route qui ne lui est pas ouverte reçoit `401 SERVICE_NOT_ALLOWED`. Les secrets sont distincts par service et jamais partagés entre services. **Il n'existe pas de mécanisme de rotation « NEXT »** pour ces secrets en V1 : une rotation se fait par remplacement coordonné (§13).

### 3.2 Access Proof (Contrat B)
En-tête `X-Access-Proof: <chargeEncodee>.<signatureEncodee>` (deux parties base64url séparées par un point).

- Émise par le **Worker Paiement** ; vérifiée **localement** par le Worker Notifications avec la clé publique (`ACCESS_PROOF_PUBLIC_KEY_JWK`, ECDSA P-256 ; une clé privée dans cette variable est refusée : `CONFIG`). Aucun appel réseau.
- Signature : ECDSA P-256 / SHA-256, **64 octets bruts (r‖s)**, calculée sur les octets UTF-8 de `chargeEncodee` **tels quels**.
- Charge (JSON) : `issuer` (doit valoir `"DSI_PAIEMENT"`), `userId` (texte, obligatoire), `expiresAt` (date ; refusée si dépassée), `subscriptionActive` (booléen ; toute valeur autre que `true` = abonnement inactif), `accountStatus` (optionnel).
- Erreurs : `ACCESS_PROOF_MISSING` (absente), `ACCESS_PROOF_INVALID` (format, signature, issuer ou userId), `ACCESS_PROOF_EXPIRED` — toutes en 401 ; `CONFIG` (500) si la clé du Worker est absente ou invalide.
- L'identité du membre est **toujours** `userId` de la preuve. Aucune route membre n'accepte un `userId` fourni par le client.

#### 3.2.1 Matrice « abonnement actif »
| Route | Access Proof | `subscriptionActive` exigé |
|---|---|---|
| `/api/installations*` | oui | **oui** |
| `/api/channels*` (sauf WhatsApp activate) | oui | **oui** |
| `POST /api/channels/telegram/associate` | oui | **oui** |
| `POST /api/channels/whatsapp/activate` | oui | non (logique propre) |
| `GET /api/notifications`, `PATCH /api/notifications/:id/read` | oui | non (permet de lire les annonces destinées aux membres inactifs) |
| `POST /api/releases/check` | oui | non (mises à jour pour tous) |

Abonnement inactif sur une route qui l'exige : `403 SUBSCRIPTION_INACTIVE`.

### 3.3 HMAC Gateway WhatsApp (Contrat C)
Protocole distinct du HMAC DSI (contrat Gateway WhatsApp V1.0.0, clé « C » pour les callbacks Gateway → Worker).

| En-tête | Valeur |
|---|---|
| `X-WA-Contract-Version` | `1` (optionnel ; autre valeur → `400 UNSUPPORTED_CONTRACT_VERSION`) |
| `X-WA-Key-Id` | Identifiant de clé : `[A-Za-z0-9_.-]{1,32}` |
| `X-WA-Timestamp` | Secondes epoch |
| `X-WA-Nonce` | base64url, 22 à 43 caractères `[A-Za-z0-9_-]` |
| `X-WA-Signature` | `v1=` + HMAC-SHA256 hexadécimal minuscule (64 caractères) |

Chaîne signée : 6 lignes séparées par `\n`, sans saut de ligne final :
```
WA-HMAC-V1
{METHOD}
{PATH}
{timestamp}
{nonce}
{sha256_hex(corpsBrut)}
```
`PATH` = le chemin de la route appelée (ex. `/internal/whatsapp/activation`), sans paramètre de requête. Fenêtre ±300 s ; nonce mémorisé 600 s. Rotation de clé supportée : le Worker accepte deux clés à la fois (courante `WHATSAPP_GATEWAY_CALLBACK_KEY_ID` et suivante `..._KEY_ID_NEXT`), sélectionnées par `X-WA-Key-Id`.

## 4. Index des routes

Cet index est vérifié automatiquement contre le code (`tests/contract-sync.test.js`).

| Méthode | Chemin | Authentification | Section |
|---|---|---|---|
| POST | `/internal/events` | HMAC DSI (`paiement`, `boutique`, `community`, `marketplace`, `admin`) | 5.1 |
| POST | `/internal/admin/notifications` | HMAC DSI (`admin`) | 5.2 |
| GET | `/internal/admin/notifications` | HMAC DSI (`admin`) | 5.2 |
| POST | `/internal/admin/notifications/:id/disable` | HMAC DSI (`admin`) | 5.2 |
| POST | `/internal/releases` | HMAC DSI (`github-actions`, `admin`) | 5.3 |
| GET | `/internal/origins` | HMAC DSI (`admin`) | 5.4 |
| POST | `/internal/origins` | HMAC DSI (`admin`) | 5.4 |
| PATCH | `/internal/origins/:id` | HMAC DSI (`admin`) | 5.4 |
| POST | `/internal/origins/:id/deactivate` | HMAC DSI (`admin`) | 5.4 |
| POST | `/api/installations` | Access Proof + abonnement | 6.1 |
| GET | `/api/installations` | Access Proof + abonnement | 6.1 |
| PATCH | `/api/installations/:id` | Access Proof + abonnement | 6.1 |
| GET | `/api/notifications` | Access Proof | 6.2 |
| PATCH | `/api/notifications/:id/read` | Access Proof | 6.2 |
| GET | `/api/channels` | Access Proof + abonnement | 6.3 |
| POST | `/api/channels` | Access Proof + abonnement | 6.3 |
| POST | `/api/channels/dsi` | Access Proof + abonnement | 6.3 |
| PATCH | `/api/channels/preferences` | Access Proof + abonnement | 6.4 |
| POST | `/api/channels/:id/deactivate` | Access Proof + abonnement | 6.3 |
| POST | `/api/channels/whatsapp/activate` | Access Proof | 6.5 |
| POST | `/api/channels/telegram/associate` | Access Proof + abonnement | 6.6 |
| POST | `/api/channels/telegram/confirm` | Access Proof + abonnement | 6.6 (410) |
| POST | `/api/releases/check` | Access Proof | 6.7 |
| POST | `/internal/whatsapp/delivery` | HMAC Gateway WhatsApp | 7.1 |
| POST | `/internal/whatsapp/activation` | HMAC Gateway WhatsApp | 7.2 |
| POST | `/internal/whatsapp/connection` | HMAC Gateway WhatsApp | 7.3 |
| POST | `/internal/telegram/confirm` | HMAC DSI (`telegram-bot`) | 8 |
| GET | `/health` et `/` | aucune | 12.3 |
| OPTIONS | toute route | aucune (préflight CORS) | 2.4 |

Toute autre route : `404 NOT_FOUND`. Les barres obliques finales sont ignorées.

---

# 5. CONTRAT A — Workers producteurs et services internes

## 5.1 `POST /internal/events` — réception d'un événement

**Appelants** : `paiement`, `boutique`, `community`, `marketplace`, `admin` (événements de test). **Auth** : HMAC DSI.

### Principe
Le producteur envoie un événement métier. Le Worker le **normalise**, crée **une notification In-App** pour le membre concerné, puis lance la distribution sur les canaux du membre **en arrière-plan**. Une réponse de succès signifie **« reçu et pris en charge »**, **pas « délivré »**.

### Enveloppes acceptées
Chaque producteur garde son enveloppe ; le Worker les normalise en `{ eventId, source, type, userId, occurredAt, data }`.

| Producteur (`X-Service-Id`) | `eventId` | `type` | Destinataire (`userId`) | Date | Données |
|---|---|---|---|---|---|
| `paiement`, `community` (ou `source` = `worker_paiement` / `worker_community`) | `eventId` | `type` | `destinataireDsi`, sinon `identifiantDsi`, sinon `userId` | `date` ou `occurredAt` | `donnees` ou `data` |
| `marketplace` (ou `source` = `worker_marketplace`) | `eventId` | `type` | `data.memberId`, sinon `data.buyerId`, sinon `data.sellerId` | `occurredAt` | `data` |
| `boutique` (ou `producer` = `boutique`) | `eventId` | `eventName`, sinon `type` | `payload.memberId` | `occurredAt` | `payload` |
| autre (dont `admin`) | `eventId` (généré si absent) | `type` ou `eventName` | `userId`, `destinataireDsi`, `identifiantDsi`, `data.memberId`, `data.userId` | `occurredAt` ou `date` | `data`, `donnees` ou `payload` |

La source stockée vaut `worker_paiement`, `worker_community`, `worker_marketplace`, `worker_boutique`, ou la valeur de `source` / `X-Service-Id` pour les autres.

### Exigences
- `eventId` : **obligatoire** pour paiement, boutique, community, marketplace (`422 VALIDATION` sinon). Texte, **unique par événement**, stable entre les relances (§ Idempotence).
- `type` : texte. Catalogue connu ci-dessous ; un type inconnu est **accepté** (pas de rejet), avec le type brut comme titre.
- Destinataire : si aucun `userId` n'est déterminé, l'événement est enregistré et marqué traité, **sans notification** (`notificationId: null`) ; aucune erreur.
- Corps : objet JSON (`422 VALIDATION` si JSON invalide ou non-objet).

### Contenu de la notification
Titre : table ci-dessous (sinon = `type`). Corps : `data.message`, sinon `data.reason`, sinon `data.title`, sinon `null`. `data` complet est conservé et transmis au Push.

| Producteur | `type` → titre affiché |
|---|---|
| Paiement | `inscription_recue` Inscription reçue · `paiement_confirme` Paiement confirmé · `inscription_confirmee` Compte activé · `abonnement_active` Abonnement activé · `parrainage_effectue` Parrainage enregistré · `recompense_dsi_attribuee` Récompense DSI attribuée · `retrait_demande` Demande de retrait enregistrée · `retrait_valide` Retrait validé · `retrait_envoye` Retrait envoyé · `retrait_paye` Retrait payé · `retrait_refuse` Retrait refusé · `code_recompense_utilise` Code de récompense utilisé |
| Communauté | `message_created` Nouveau message · `support_message_created` Nouveau message support · `contact_requested` Demande de contact · `call_missed` Appel manqué · `call_monthly_quota_exhausted` Quota d'appels épuisé |
| Boutique | `SHOP_ORDER_PAID` Commande payée · `SHOP_ORDER_PAYMENT_FAILED` Échec de paiement commande |
| Marketplace | `APPLICATION_SUBMITTED` Candidature vendeur soumise · `APPLICATION_APPROVED` … approuvée · `APPLICATION_REJECTED` … rejetée · `ORDER_PAID` Commande Marketplace payée · `ORDER_FAILED` Échec commande Marketplace |

Le moteur de contenu V1 est volontairement minimal (pas de gabarits). Un producteur qui veut un texte précis le fournit dans `data.message`.

### Réponses
`200` (toujours ; pas de `201`) :
```json
{ "success": true, "error": null, "code": null,
  "data": { "received": true, "eventId": "evt_123", "notificationId": "notif_…",
            "resumed": false, "dispatch": "scheduled" } }
```
| Champ `data` | Valeurs |
|---|---|
| `received` | toujours `true` |
| `notificationId` | identifiant de la notification, ou `null` (pas de destinataire) |
| `already` | `true` si l'événement est déjà traité ou en cours : **aucune action, c'est un succès** |
| `resumed` | `true` si l'événement a été repris après une interruption |
| `dispatch` | `"scheduled"` (distribution en arrière-plan), `"inline"` (sans arrière-plan), `"none"` (rien à distribuer : notification déjà livrée/échouée/lue) |

Erreurs : `401` (HMAC), `422 VALIDATION`, `500 CONFIG`.

### Idempotence et reprise (**obligations du producteur**)
1. Un même `eventId` ne crée **jamais deux notifications** ni deux distributions.
2. Le producteur **doit relancer avec le même `eventId`** après tout timeout, erreur réseau ou réponse 5xx. Chaque relance doit avoir un **nouveau nonce**.
3. Une relance après succès est sans effet (`already: true`).
4. **C'est la seule reprise** : si le Worker est interrompu après avoir accepté l'événement mais avant d'avoir distribué, l'événement n'est repris que lorsqu'il est **reçu à nouveau**. Il n'y a pas de balayage automatique en V1 (§11, §13).
5. États internes : `received` → `notified` → `processed`. Un événement `notified` est repris après 120 s sans fin de traitement.
6. Une notification déjà `delivered`, `failed` ou `read` n'est **jamais** redistribuée par une reprise.

---

## 5.2 Notifications administratives (Console Admin)

**Appelant** : `admin`. **Auth** : HMAC DSI. Annonces affichées dans la boîte In-App des membres (D1/D2 : **aucune copie par membre** ; la visibilité est évaluée à la consultation).

### `POST /internal/admin/notifications` — créer
```json
{
  "title": "Maintenance ce soir",
  "body": "Texte optionnel",
  "type": "admin_announcement",
  "target": { "mode": "member" | "all" | "segment", "userId": "…", "segment": "subscription_active" | "subscription_inactive" },
  "channels": { "push": true },
  "idempotencyKey": "clé-unique"
}
```
- `title` : obligatoire, texte non vide. `body`, `type` (défaut `admin_announcement`) : optionnels.
- `target.mode` : `member` (exige `target.userId`), `all`, `segment` (exige `target.segment` parmi `subscription_active`, `subscription_inactive`). Erreurs `422` : `INVALID_TARGET`, `INVALID_TARGET_MODE`, `VALIDATION`.
- `channels` : objet libre **conservé tel quel mais non utilisé en V1** : les annonces admin sont affichées **In-App uniquement** ; elles ne déclenchent ni Push, ni Email, ni WhatsApp.
- `idempotencyKey` (ou `idempotency_key`) : recommandé. Même clé → `200 { already: true, notification }` sans création.
- Réponse `201` : `{ id, title, body, type, target: { mode, userId, segment }, channels, status: "active", createdAt, origin: "admin" }`.

### `GET /internal/admin/notifications?limit=50&status=active`
`limit` : 1 à 100 (défaut 50). `status` : filtre optionnel (`active` | `disabled`). Réponse : `{ items: [ { id, title, body, type, target, channels, status, createdAt, updatedAt, createdBy, idempotencyKey, origin } ] }`, du plus récent au plus ancien. Pas de pagination en V1.

### `POST /internal/admin/notifications/:id/disable`
Désactive (l'annonce disparaît des boîtes des membres). `200 { id, status: "disabled", updatedAt }` ; `404 NOT_FOUND` si inconnue. La désactivation est définitive (pas de réactivation en V1).

### Visibilité côté membre
| `target.mode` | Visible par |
|---|---|
| `member` | uniquement le membre `target.userId` |
| `all` | tout membre authentifié (Access Proof valide) |
| `segment` = `subscription_active` | membres dont la preuve indique `subscriptionActive = true` |
| `segment` = `subscription_inactive` | membres dont la preuve indique `subscriptionActive` ≠ `true` |

Le segment est évalué **au moment de la consultation**, avec l'état d'abonnement de la preuve courante.

---

## 5.3 `POST /internal/releases` — publier une version de l'application

**Appelants** : `github-actions`, `admin`. **Auth** : HMAC DSI. Principe : GitHub Actions **pousse** la version ; le Worker ne scrute jamais GitHub.

Corps :
```json
{ "applicationId": "dsi-academy-android", "version": "1.4.0", "versionCode": 140,
  "url": "https://…", "sha256": "<64 hex>", "metadata": { } }
```
- `applicationId`, `version` : obligatoires (`422 VALIDATION`). Aussi acceptés : `application_id`, `version_code`.
- `url` : optionnelle ; si fournie, **URL HTTPS absolue**.
- `sha256` : optionnel ; si fourni, hexadécimal de **64 caractères** (stocké en minuscules).
- `versionCode` : informatif, stocké et renvoyé, **jamais utilisé pour décider**.
- `metadata` : objet libre.
- Idempotence : `(applicationId, version)` est unique. Première publication → `201` `{ id, applicationId, version, versionCode, url, sha256, status: "active", publishedAt }`. Republication identique → `200 { already: true, release: { id, application_id, version, version_code, url, sha256, status, published_at } }` (la release existante n'est **pas** modifiée).
- Il n'existe pas de route de retrait de version en V1.

---

## 5.4 `/internal/origins` — Origins autorisées (CORS)

**Appelant** : `admin` uniquement. **Auth** : HMAC DSI. **Enveloppe : celle du Rapport C2 (Origins), différente de §2.2** :

| Route | Succès | Erreurs |
|---|---|---|
| `GET /internal/origins` | `200 { "success": true, "data": [ { id, origin, label, status, created_at, updated_at } ] }` | HMAC : enveloppe standard §2.2 |
| `POST /internal/origins` | `201 { "data": { id, origin, label, status: "active", created_at, updated_at } }` ; même `id` + même `origin` : `200 { "already": true, "data": {…} }` | `{ "error": "…", "code": "VALIDATION" \| "CONFLICT" }` |
| `PATCH /internal/origins/:id` | `200 { "data": { id, origin, label, status, updated_at } }` | `404 NOT_FOUND`, `422 VALIDATION` |
| `POST /internal/origins/:id/deactivate` | `200 { "data": { id, status: "inactive" } }` ; déjà inactive : `200 { "already": true }` | `404 NOT_FOUND`, `422 VALIDATION` |

- `POST` : corps `{ id, origin, label }`. `id` : **attribué uniquement par le Worker Admin**, format `^org_[0-9a-f]{32}$`. `origin` : obligatoire (`https://domaine`, sans chemin). Une `origin` déjà liée à un autre `id` : `409 CONFLICT`.
- `PATCH` : seuls `label` et `status` (`active` | `inactive`) sont modifiables. Modifier `origin` : `422` (désactiver puis créer).
- Toute mutation rafraîchit immédiatement la liste utilisée par le CORS.
- Aucune Origin n'est autorisée tant qu'aucune n'a été créée : **le site ne peut pas appeler l'API avant que l'Admin ait enregistré son Origin**.

---

# 6. CONTRAT B — Site web et application

**Auth** : `X-Access-Proof` (§3.2). Une application native n'envoie pas d'`Origin` (acceptée) ; le site web envoie son Origin, qui doit être enregistrée (§5.4).
L'identité vient de la preuve. Un membre ne voit et ne modifie **que ses propres données** ; l'accès à une ressource d'un autre membre répond `404 NOT_FOUND` (ou `409 CONFLICT` pour une installation, §6.1).

## 6.1 Installations (abonnement actif requis)

Une **installation** = une copie de l'application sur un appareil, liée à un membre, portant ses jetons push.

### `POST /api/installations` — enregistrer ou ré-associer
```json
{ "idInstallation": "INST-…", "applicationId": "dsi-academy-android",
  "platform": "android", "version": "1.4.0",
  "pushRegistrations": [
    { "projectRole": "PRIMARY", "projectId": "<projet FCM>", "registrationToken": "<jeton>" },
    { "projectRole": "BACKUP",  "projectId": "<projet FCM de secours>", "registrationToken": "<jeton>" } ] }
```
- `applicationId` : obligatoire. `idInstallation` : optionnel ; absent → généré (`INST-` + 16 hex). Fourni → créé s'il n'existe pas, mis à jour sinon (**idempotent**).
- Installation déjà liée à un **autre** membre : `409 CONFLICT`.
- Jetons push, deux formes :
  - **recommandée** : `pushRegistrations[]`, chaque élément `{ projectRole: "PRIMARY"|"BACKUP", projectId, registrationToken }` (aussi `provider`, défaut `fcm`) ; un élément sans jeton ou avec un autre rôle est **ignoré silencieusement** ;
  - **historique** : `pushToken` (+ `pushProvider`, défaut `fcm`) : enregistré comme jeton `PRIMARY`.
- Renvoyer un jeton réactive l'enregistrement (statut `active`). **Une application dont un jeton a été invalidé doit renvoyer son jeton courant** (§10.3).
- Réponse `200` : la ligne installation `{ id_installation, user_id, application_id, platform, version, push_token, push_provider, push_enabled, status, created_at, updated_at, last_seen_at }` **en snake_case**, plus `pushRegistrations: [ { id, projectRole, projectId, provider } ]` (sans le jeton).

### `PATCH /api/installations/:idInstallation`
Champs optionnels : `version`, `pushToken` / `pushProvider`, `pushRegistrations`, `pushEnabled` (booléen : `true`/`false`/`0`/`1`/`"true"`/`"false"`/`"0"`/`"1"`, sinon `422`), `status` (`active` | `inactive` | `revoked`, sinon `422`). Met à jour `last_seen_at`. `404` si l'installation n'est pas celle du membre. Réponse : comme ci-dessus.

### `GET /api/installations`
Installations du membre, de la plus récemment vue à la moins récente : `[ { id_installation, application_id, platform, version, push_enabled, status, created_at, updated_at, last_seen_at } ]` (sans jeton).

## 6.2 Notifications (Access Proof seule)

Boîte commune : notifications personnelles (issues d'événements) + annonces admin visibles pour le membre.

### `GET /api/notifications?limit=50&status=unread&before=<ISO>`
- `limit` : 1 à 100, défaut 50. `status` : `unread` | `read` (absent = tout). `before` : date ISO ; renvoie les éléments **strictement plus anciens**.
- Réponse : tableau `data: [ item ]`, du plus récent au plus ancien :
```json
{ "id": "notif_…", "origin": "event" | "admin", "eventId": "evt_…" | null,
  "source": "worker_paiement" | "admin" | …, "type": "paiement_confirme",
  "title": "…", "body": "…" | null, "data": { } | null,
  "status": "unread" | "read", "createdAt": "ISO", "readAt": "ISO" | null }
```
- Pour `origin: "admin"`, `data` vaut `{ "targetMode", "targetSegment" }`.
- **Pagination** : pour la page suivante, passer `before` = `createdAt` du dernier élément reçu. Des éléments strictement identiques à la milliseconde au point de coupure pourraient être sautés (limite connue, §11).
- Une notification dont les données stockées sont corrompues est renvoyée avec `data: null` ; elle ne fait jamais échouer la requête.
- Le statut externe n'a que deux valeurs. Le statut interne de distribution (`pending`, `delivered`, `failed`) n'est pas exposé.

### `PATCH /api/notifications/:id/read`
Sans corps. Accepte l'`id` d'une notification personnelle **ou** d'une annonce admin visible. `200 { id, origin, status: "read", readAt }`. Introuvable ou non visible : `404 NOT_FOUND`. Répétable sans erreur. La lecture d'une annonce admin est propre au membre.

## 6.3 Canaux et destinations (abonnement actif requis)

### `GET /api/channels`
```json
{ "destinations": [ { "id", "channel", "reference", "source", "enabled", "verified", "created_at", "updated_at" } ],
  "preferences": { "user_id", "channel_email", "channel_whatsapp", "channel_sms", "channel_telegram", "channel_push", "updated_at" },
  "pushInstallations": [ { "id_installation", "platform", "push_enabled", "version" } ] }
```
Valeurs de `channel` : `EMAIL`, `WHATSAPP`, `SMS`, `TELEGRAM`. `source` vaut `CUSTOM` en V1 (`DSI` est réservée aux coordonnées futures fournies par le Worker Paiement). `enabled` et `verified` valent 0 ou 1. Sans préférences enregistrées, valeurs par défaut : email 1, push 1, WhatsApp 0, SMS 0, Telegram 0.

### `POST /api/channels` — déclarer une destination
`{ "channel": "EMAIL" | "WHATSAPP" | "SMS", "reference": "…", "enabled": true }`
- `reference` : Email valide, ou numéro **E.164 strict** pour WhatsApp et SMS (`+` puis indicatif pays et numéro, 8 à 15 chiffres au total, premier chiffre ≠ 0). Espaces, tirets, points et parenthèses d'affichage sont retirés ; **un numéro sans `+` ou local est refusé** (`422`), jamais complété.
- **Une destination ainsi déclarée est NON VÉRIFIÉE (`verified: 0`) et n'est jamais utilisée pour un envoi.** Déclarer ne vérifie rien ; renvoyer la même référence ne change jamais `verified`.
- Réponse : `201` (créée) ou `200` (existante) : `{ id, channel, reference, source: "CUSTOM", enabled, verified }`.
- **Conséquence en V1** : seules deviennent utilisables les destinations **WhatsApp** (§6.5) et **Telegram** (§6.6, §8). **Email et SMS restent hors service réel** tant qu'aucun contrat ne permet à DSI de fournir une destination vérifiée (§13).

### `POST /api/channels/dsi`
Corps `{ "channel": "EMAIL" | "WHATSAPP" | "SMS" }`. **Toujours `501 DEPENDENCY_PENDING`** (dépendance Paiement non contractualisée, §9.5).

### `POST /api/channels/:id/deactivate`
Désactive (`enabled = 0`) une destination du membre. `200 { id, enabled: 0 }` ; `404` sinon. Désactivation uniquement (aucune suppression).

## 6.4 Préférences (abonnement actif requis)
`PATCH /api/channels/preferences` — corps : un ou plusieurs de `email`, `whatsapp`, `sms`, `telegram`, `push` (ou `channel_email`, …), valeurs booléennes (`true`/`false`/`0`/`1`/`"true"`/`"false"`/`"0"`/`"1"`). Toute autre valeur : `422 VALIDATION` (aucune modification). Aucun champ valide : `422`. Réponse : la ligne `preferences` complète (snake_case). Créée au premier appel si absente.
Les préférences décident quels canaux sont **tentés** ; elles ne rendent jamais utilisable une destination non vérifiée.

## 6.5 Activation WhatsApp

### `POST /api/channels/whatsapp/activate` (Access Proof seule)
Sans corps. Prépare l'association du numéro WhatsApp du membre.
Réponse `200` :
```json
{ "code": "AB3K9XQ2", "expiresAt": "ISO (+10 min)", "waLink": "https://wa.me/<numéroGateway>?text=<message encodé>", "instructions": "…" }
```
- `code` : 8 caractères parmi `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, usage unique, valable **10 minutes**. Un nouveau code **invalide** les précédents non utilisés du membre. Le Worker ne conserve que son empreinte SHA-256.
- `waLink` : lien à ouvrir ; WhatsApp s'ouvre sur le numéro de la Gateway avec un message prérempli contenant le code sur la ligne `Code de validation : <code>`. Le membre envoie le message **depuis le numéro à associer**, sans le modifier.
- `503 NOT_CONFIGURED` si le numéro de la Gateway n'est pas configuré.
- Parcours complet : membre → `activate` → ouvre `waLink` → envoie le message → la Gateway relaie le code au Worker (§7.2) → destination vérifiée → l'application relit `GET /api/channels` (aucun rappel vers l'application).

## 6.6 Association Telegram
- `POST /api/channels/telegram/associate` (abonnement actif requis) : sans corps ; `200 { code, expiresAt, status: "pending", message }`. Code de 8 caractères, 10 minutes, un nouveau code invalide les précédents. Le membre envoie ce code **au bot** ; l'association est confirmée par le bot (§8). Aucune destination n'est créée à cet appel.
- `POST /api/channels/telegram/confirm` : **supprimée côté membre**, répond toujours `410 TELEGRAM_CONFIRM_NOT_CLIENT_SIDE`. Un identifiant de conversation fourni par l'application n'est pas une preuve.

## 6.7 `POST /api/releases/check` — mise à jour disponible (Access Proof seule)
Corps : `{ "applicationId", "currentVersion", "idInstallation"? }` (aussi `application_id`, `current_version`, `version`, `id_installation`). `applicationId` et `currentVersion` obligatoires (`422`). Si `idInstallation` est celle du membre, sa version et sa dernière activité sont mises à jour.
- Comparaison : versions séparées par des points, segments entiers (non numérique = 0), pas de pré-version. Retourne la **plus haute** version active **strictement supérieure** à `currentVersion` ; jamais de retour en arrière.
- Aucune mise à jour : `{ "updateAvailable": false, "currentVersion", "version": null, "latestVersion": null }`.
- Mise à jour : `{ "updateAvailable": true, "version", "latestVersion", "url", "sha256", "versionCode", "currentVersion", "publishedAt", "metadata" }` (`url` et `sha256` peuvent être `null`).

---

# 7. CONTRAT C — Gateway WhatsApp (callbacks Gateway → Worker)

**Auth** : HMAC Gateway WhatsApp (§3.3), `Content-Type: application/json`. Contrat de la Gateway : WHATSAPP_GATEWAY_CONTRACT_V1.0.0 (le Worker n'en modifie aucune règle). Secrets absents côté Worker : `503 CONFIG`.

## 7.1 `POST /internal/whatsapp/delivery` — résultat d'un envoi
Corps : `{ "contractVersion"?: "1", "eventId", "requestId", "state", "code"? }` (`eventId`, `requestId`, `state` obligatoires : `400 INVALID_SCHEMA`).
- `requestId` : celui que le Worker a envoyé (`whatsapp_<idNotification>`).
- États **finals** : `sent`, `permanent_error`, `expired`, `unknown_outcome`. Les autres états sont intermédiaires.
- Effet : `sent` → la notification passe `delivered` (sauf si déjà lue). `permanent_error`, `expired`, `unknown_outcome` → `failed`, **seulement si elle est encore `pending`** (un canal ayant déjà livré n'est pas dégradé).
- Idempotence par `eventId` : doublon → `200 { ok: true, duplicate: true, eventId }`.
- Réponse : `200 { ok: true, eventId, requestId, state }` (dans l'enveloppe §2.2).

## 7.2 `POST /internal/whatsapp/activation` — message d'activation reçu
Corps : `{ "eventId", "token", "senderNumber", "senderIdKind" }`.
- `token` : le code extrait **par la Gateway** du message (le Worker ne lit jamais le texte du message ; il attend le code seul).
- `senderIdKind` : `"phone"` ou `"lid"`. `senderNumber` : numéro de l'expéditeur, ou `null`.
- **Format de `senderNumber`** : `+E.164` (`^\+[1-9][0-9]{7,14}$`), forme du contrat Gateway (exemple §11.4 : `+2250102030405`). Par défense, des chiffres seuls sans `+` sont acceptés **uniquement** si `senderIdKind` vaut explicitement `"phone"`. La valeur stockée est toujours `+chiffres`.
- Si `senderNumber` est `null`, ou `senderIdKind` = `"lid"`, ou le format est invalide : `rejected`, **aucun numéro n'est lié**, le code n'est pas consommé.
- Réponse : **toujours HTTP 200** (après authentification) : `{ "result": "...", "replyText": "..." }` ; la Gateway renvoie `replyText` à l'expéditeur.

| `result` | Sens | `replyText` |
|---|---|---|
| `confirmed` | Numéro lié et vérifié ; WhatsApp activé dans les préférences | texte de confirmation (numéro masqué) |
| `rejected` | Code inconnu, déjà utilisé, identifiant non exploitable, numéro invalide, ou `eventId` déjà reçu | texte, ou `null` pour un `eventId` rejoué |
| `expired` | Code expiré | texte |
| `too_many_attempts` | 5 tentatives atteintes | texte |
| `number_already_linked` | Numéro déjà vérifié chez un autre membre ; tentative comptée | texte |

- Effet de `confirmed` : destination `WHATSAPP` (`enabled: 1`, `verified: 1`) ; les autres numéros WhatsApp du membre sont désactivés (**un seul numéro actif**) ; `preferences.channel_whatsapp = 1` (ligne créée si absente). Seul un numéro **vérifié** chez un autre membre bloque l'association (une simple déclaration n'a aucun effet de blocage).
- Idempotence par `eventId` : **un `eventId` déjà reçu répond `rejected` avec `replyText: null`**, même si la première réception avait réussi. La Gateway ne doit donc pas réutiliser un `eventId` pour réessayer un message dont elle ignore le résultat ; elle peut relire l'état via `GET /api/channels` côté membre.

## 7.3 `POST /internal/whatsapp/connection` — état de connexion de la Gateway
Corps : `{ "eventId"?, "state", "previousState"?, "lastDisconnectCode"? }`. Information opérationnelle : journalisée sans logique métier. `200 { ok: true }` ; doublon d'`eventId` : `200 { ok: true, duplicate: true }`.

---

# 8. CONTRAT D — Bot Telegram

> **PROJET — NON FIGÉ.** Ce qui suit décrit l'implémentation V1 actuelle. Le bot n'existe pas encore. Cette section ne devient officielle qu'après validation séparée par DSI. Détail et points à trancher : `docs/TELEGRAM_BOT_CONFIRMATION_DRAFT.md`.

## 8.1 `POST /internal/telegram/confirm`
**Appelant** : le bot Telegram (`X-Service-Id: telegram-bot`). **Auth** : HMAC DSI (§3.1), secret `HMAC_SECRET_TELEGRAM_BOT`.

Corps : `{ "code": "AB3K9XQ2", "chatId": "123456789" }` — `code` : normalisé en majuscules, espaces retirés ; `chatId` : chaîne de chiffres, `-` initial toléré, 1 à 20 caractères (`422 VALIDATION` sinon).

Réponse `200`, `data.result` :
| `result` | Sens |
|---|---|
| `confirmed` | Association faite : destination `TELEGRAM` vérifiée, préférence Telegram activée |
| `rejected` + `reason: "INVALID_CODE"` | Code inconnu |
| `rejected` + `reason: "CODE_ALREADY_USED"` | Code déjà consommé |
| `expired` | Code expiré (10 minutes) |
| `too_many_attempts` | 5 tentatives atteintes |
| `chat_already_linked` | Ce `chatId` est déjà lié (vérifié) à un autre membre |

## 8.2 Preuve, persistance, idempotence
- **Preuve du `chatId`** : le Worker **ne la vérifie pas auprès de Telegram** ; il fait confiance au bot, authentifié par HMAC. Le bot doit transmettre le `chatId` observé dans la conversation privée où le membre a envoyé le code, jamais un identifiant saisi par l'utilisateur. Le secret du bot est donc la seule garantie.
- **Persisté** : empreinte SHA-256 du code (jamais le code), destination `TELEGRAM` (`reference` = `chatId`, `verified = 1`), préférence. Un seul `chatId` actif par membre.
- **Idempotence** : code à usage unique. **Limite** : un nouvel appel avec le même code après un succès (réponse perdue) répond `CODE_ALREADY_USED`, pas `confirmed`.
- **Envoi** : `TELEGRAM_BOT_TOKEN` doit être configuré dans ce Worker pour que les notifications soient envoyées (§12.1).

---

# 9. CONTRAT E — Fournisseurs sortants (Worker → externe)

Le Worker est **client** de ces services. Leurs contrats propres font foi ; ce qui suit précise ce que le Worker envoie et attend.

## 9.1 Push — FCM HTTP v1
Deux projets Firebase indépendants : **PRIMARY** (utilisé en premier) et **BACKUP** (continuité). Aucune clé serveur historique. Authentification OAuth2 par compte de service ; le jeton OAuth est mis en cache et purgé sur `401` (une ré-authentification est tentée). Les valeurs de `data` sont transmises en texte (les objets imbriqués sont sérialisés en JSON).
Classification des erreurs : un jeton n'est invalidé que si FCM l'établit explicitement (`UNREGISTERED`, ou `400` désignant le jeton). Un `400` de charge (payload) ne touche pas aux jetons. Un jeton invalidé passe `invalid` ; l'application doit renvoyer son jeton courant (§6.1).

## 9.2 Email — pool de Gateways Google Apps Script
Jusqu'à 5 Gateways (`EMAIL_GATEWAY_1..5_URL`). Requête signée en HMAC (`X-Email-Service-Id: notifications`, `X-Email-Timestamp`, `X-Email-Nonce`, `X-Email-Signature`, même chaîne que §3.1). `requestId` = `email_<idNotification>`, **identique sur tous les Gateways**. Bascule vers le Gateway suivant sur erreur temporaire ou propre au Gateway ; une erreur permanente propre à un Gateway l'écarte sans bloquer les autres. **Pas d'exactly-once** : un timeout après acceptation suivi d'une bascule peut produire un doublon.

## 9.3 WhatsApp — Gateway
`POST {WHATSAPP_GATEWAY_URL}/v1/messages`, signé en HMAC Gateway (§3.3, clé « W »). Corps : `{ contractVersion: "1", requestId: "whatsapp_<idNotification>", to: "+E.164", message: { type: "text", text }, priority, maxAgeSec }` (texte limité à 1000 caractères). `202 queued` signifie **accepté, pas livré** : le résultat final arrive par le callback `/internal/whatsapp/delivery` (§7.1). Numéro invalide : échec permanent sans appel.

## 9.4 SMS et Telegram
- **SMS** : non implémenté (toujours « non configuré »).
- **Telegram** : envoi via l'API Bot (`sendMessage`) si `TELEGRAM_BOT_TOKEN` est configuré.

## 9.5 Worker Paiement
Seule dépendance sortante contractuelle : l'**Access Proof** (reçue, jamais demandée) et, à terme, la récupération de coordonnées DSI (`POST /api/channels/dsi` → `501` tant que le contrat Paiement n'existe pas). `PAIEMENT_WORKER_URL` est réservée et inutilisée.

---

# 10. Règles de distribution

## 10.1 Sélection des canaux
Pour chaque notification personnelle, le Worker tente, **en parallèle** :
1. **Push** : si `preferences.channel_push = 1` : chaque installation `active` du membre avec `push_enabled = 1`, via ses enregistrements `active` (PRIMARY puis BACKUP).
2. **Email, WhatsApp, SMS, Telegram** : pour chaque destination du membre **`enabled = 1` ET `verified = 1`** dont la préférence de canal est activée.

**Règle de sécurité absolue** : une destination non vérifiée n'est **jamais** utilisée, quelle que soit la préférence.

## 10.2 Statut de distribution d'une notification (interne)
- `delivered` : au moins un canal a **réellement** livré.
- `failed` : au moins une tentative réelle a échoué et aucun succès réel.
- `pending` : aucune tentative réelle (canaux non configurés, WhatsApp « accepté, en attente de callback », ou aucun canal).
La notification **reste toujours consultable en In-App**, quel que soit le résultat des canaux externes.

## 10.3 Jetons push invalides
Un jeton refusé par FCM comme invalide est marqué `invalid` et ignoré ensuite. L'application doit, au démarrage et à chaque renouvellement de jeton, **appeler `POST /api/installations` ou `PATCH /api/installations/:id`** avec son jeton courant.

---

# 11. Garanties et limites

**Le Worker garantit**
- Un `eventId` ne produit jamais deux notifications ni deux distributions.
- Une destination non vérifiée n'est jamais utilisée ; un membre ne peut pas faire envoyer de message vers le numéro, l'email ou la conversation d'un tiers.
- Un membre ne lit et ne modifie que ses propres données.
- Aucun numéro, email, identifiant de conversation, jeton, secret ni contenu de message n'est écrit en clair dans les journaux.
- Une Origin refusée ne reçoit aucun en-tête CORS.

**Le Worker ne garantit pas**
- **Livraison** : « reçu » ≠ « délivré ». Les canaux externes sont en meilleur effort.
- **Exactly-once entre Gateways Email** : un doublon est possible.
- **Reprise automatique** : un événement interrompu n'est repris que s'il est reçu à nouveau (§5.1).
- **Anti-rejeu en repli KV** : si D1 est indisponible, la protection passe sur KV (lecture puis écriture non atomiques, cohérence éventuelle) : une rafale simultanée de la même requête signée peut alors être acceptée plusieurs fois, dans la fenêtre de 300 s. La signature HMAC empêche toujours de forger une requête.
- **Pagination des notifications** : éléments de même date à la milliseconde au point de coupure pouvant être sautés.
- **Cooldown des Gateways Email** : en mémoire par instance, non partagé.
- **Nettoyage des nonces** : opportuniste (pas de tâche planifiée) ; sans effet sur la sécurité.

---

# 12. Exploitation

## 12.1 Variables et secrets
Variables (non secrètes, dans `wrangler.toml`) : `SERVICE_ID`, `TIMESTAMP_WINDOW_SECONDS` (300), `ENVIRONMENT`, `FCM_PRIMARY_PROJECT_ID`, `FCM_BACKUP_PROJECT_ID`, `WHATSAPP_GATEWAY_URL`, `WHATSAPP_GATEWAY_HMAC_KEY_ID`, `WHATSAPP_GATEWAY_CALLBACK_KEY_ID` (+ `_NEXT`), `WHATSAPP_GATEWAY_PAIRING_NUMBER` (E.164 du numéro de la Gateway), `EMAIL_GATEWAY_1..5_URL`, `EMAIL_GATEWAY_COOLDOWN_SECONDS`, `PAIEMENT_WORKER_URL` (réservée).
Secrets (`wrangler secret put`) : `HMAC_SECRET_ADMIN`, `HMAC_SECRET_PAIEMENT`, `HMAC_SECRET_BOUTIQUE`, `HMAC_SECRET_COMMUNITY`, `HMAC_SECRET_MARKETPLACE`, `HMAC_SECRET_GITHUB_ACTIONS`, `HMAC_SECRET_TELEGRAM_BOT`, `ACCESS_PROOF_PUBLIC_KEY_JWK` (clé **publique** uniquement), `FCM_PRIMARY_CLIENT_EMAIL`, `FCM_PRIMARY_PRIVATE_KEY`, `FCM_BACKUP_CLIENT_EMAIL`, `FCM_BACKUP_PRIVATE_KEY`, `WHATSAPP_GATEWAY_HMAC_SECRET`, `WHATSAPP_GATEWAY_CALLBACK_HMAC_SECRET` (+ `_NEXT`), `EMAIL_GATEWAY_1..5_HMAC_SECRET`.
Liaisons : D1 `DB`, KV `NONCE_KV` (repli anti-rejeu) et `CORS_KV` (cache des Origins).
**Note** : `TELEGRAM_BOT_TOKEN` (envoi Telegram) n'est pas encore listée dans `wrangler.toml` (§13).

## 12.2 Base de données
Chaîne `0001 → 0006` (voir `docs/MIGRATIONS_CHAIN.md`) : 15 tables, 20 index. `0002` est neutralisée (no-op).

## 12.3 Santé
`GET /health` ou `GET /` : `200 { "service": "worker-notifications", "version": "1.0.1", "status": "ok" }`. Sans authentification, **sans** enveloppe §2.2, et sans vérification de la base : il atteste que le Worker répond, pas que D1 est joignable.

## 12.4 Journaux
Aucune donnée personnelle ni secret. Les cibles sont masquées. Les incidents notables : `[nonce] D1 indisponible, repli KV`, `[push:config_incident]`, `dispatch error`.

---

# 13. Points ouverts

1. **Bot Telegram** (§8) : contrat à valider ; idempotence du retry, preuve du `chatId`, rotation du secret, désassociation, format du code.
2. **Email / SMS** : tant qu'aucun contrat ne permet à DSI de fournir une destination vérifiée, ces canaux sont **hors service réel**.
3. **Catalogue des types d'événements** : aujourd'hui ouvert (un type inconnu est accepté et affiché tel quel). À arrêter avec les producteurs : liste officielle, textes, champs `data`.
4. **Reprise des événements interrompus** : dépend de la relance du producteur. Un balayage automatique reste à décider.
5. **Format de `senderNumber`** : confirmé `+E.164` par le contrat Gateway ; reste à vérifier en réel avec la Gateway déployée si elle fournit un numéro (`phone`) ou seulement un identifiant anonymisé (`lid`, `senderNumber: null` → rejeté).
6. **Message d'activation WhatsApp** : la Gateway doit extraire le code de la ligne `Code de validation : …` du message prérempli et le relayer comme `token`.
7. **`TELEGRAM_BOT_TOKEN`** : à documenter dans `wrangler.toml` si l'envoi Telegram est activé.
8. **Rotation des secrets HMAC DSI** : sans mécanisme « NEXT » en V1.
9. **Validations sur Cloudflare réel** : `docs/REAL_CLOUDFLARE_VALIDATION_CHECKLIST.md`. Rien n'a été déployé ni testé hors simulation.

# 14. Règle de modification du contrat

*(Proposée ; à aligner sur la règle de gel des autres contrats DSI.)*
- **Précision de texte** sans changement de comportement : version `1.0.x`.
- **Ajout rétrocompatible** (nouvelle route, champ optionnel, nouvelle valeur ignorée par les anciens clients) : version `1.x`.
- **Rupture** (champ retiré, sens modifié, valeur obligatoire nouvelle) : version `2.0`, annoncée à tous les appelants avant déploiement.
- Toute modification est datée, numérotée et listée dans un journal en fin de document. Les appelants ne doivent pas se fier à un comportement non décrit ici.

---

# Annexe 1 — Exemple de signature HMAC DSI (JavaScript, WebCrypto)

```js
// serviceId : ex. "paiement" — secret : le secret propre à ce service
async function appelerWorkerNotifications(baseUrl, serviceId, secret, path, method, bodyObj) {
  const corps = bodyObj ? JSON.stringify(bodyObj) : "";          // octets signés = octets envoyés
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0")).join("");       // 32 hex, NOUVEAU à chaque requête
  const message = `${serviceId}.${timestamp}.${nonce}.${corps}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  const signature = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return fetch(baseUrl + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Service-Id": serviceId,
      "X-Timestamp": timestamp,
      "X-Nonce": nonce,
      "X-Signature": signature,
    },
    body: corps || undefined,
  });
}
```

# Annexe 2 — Exemples de requêtes

Événement Paiement :
```json
POST /internal/events
{ "eventId": "evt_2026_000123", "source": "worker_paiement", "type": "paiement_confirme",
  "destinataireDsi": "DSI-000042", "date": "2026-11-15T02:20:00.000Z",
  "donnees": { "message": "Votre paiement de 5 000 F a été confirmé." } }
```
Événement Boutique :
```json
POST /internal/events
{ "producer": "boutique", "eventId": "shop_evt_77", "eventName": "SHOP_ORDER_PAID",
  "occurredAt": "2026-11-15T02:21:00.000Z", "payload": { "memberId": "DSI-000042", "orderId": "CMD-9" } }
```
Annonce admin à tous :
```json
POST /internal/admin/notifications
{ "title": "Maintenance ce soir", "body": "Service indisponible de 23h à 23h30.",
  "target": { "mode": "all" }, "idempotencyKey": "maint-2026-11-15" }
```
Version de l'application :
```json
POST /internal/releases
{ "applicationId": "dsi-academy-android", "version": "1.4.0", "versionCode": 140,
  "url": "https://exemple.org/dsi-academy-1.4.0.apk", "sha256": "<64 hex>" }
```
Enregistrement d'installation :
```json
POST /api/installations           (X-Access-Proof: …)
{ "applicationId": "dsi-academy-android", "platform": "android", "version": "1.4.0",
  "pushRegistrations": [ { "projectRole": "PRIMARY", "projectId": "burkinasapp", "registrationToken": "<jeton>" } ] }
```
Callback d'activation WhatsApp (corps) :
```json
POST /internal/whatsapp/activation
{ "eventId": "wa_evt_1", "token": "AB3K9XQ2", "senderNumber": "+2250102030405", "senderIdKind": "phone" }
```
