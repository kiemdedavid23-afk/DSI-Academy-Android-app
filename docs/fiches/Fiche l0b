# Fiche L0b — Réseau

> Étape 0, lot 2 sur 4. Lis `docs/CONTRAT-GROK.md` avant de commencer. Ta première réponse suit le §4 du contrat (reformulation, fichiers, questions), sans code. **Ne démarre qu'une fois L0a validé par l'architecte.**

## 1. Objectif

Livrer **le seul client HTTP de l'app** (`src/core/network`). Il remplace les quatre clients du site, qui n'ont pas la même authentification ni les mêmes réponses. Après ce lot, plus aucun code ne fait `fetch` ailleurs, et toute adresse passe par le registre.

Ce lot est de l'infrastructure : aucun endpoint de Worker, aucun store, aucun écran.

## 2. Sources

**Site à lire (`.js`) avant d'écrire :**
- `src/services/api/client.js` (Worker Paiement)
- `src/services/api/community/communityClient.js` et `rateLimitGate.js`
- `src/services/api/marketplace/marketplaceClient.js`
- `src/services/api/shop/shopClient.js`
- `src/services/api/content/delivery.service.js` (uniquement l'appel `fetch` : en-têtes `X-Access-Proof` et `Range`)
- `src/shared/session/sessionStore.js` (noms des données de session : jeton et `accessProof`)

**Contrat de Worker :** aucun n'est encore fourni. Le comportement décrit ici est celui du site. Tout écart avec un contrat réel sera corrigé à l'étape où le Worker est intégré. Tu le signales dans `LIVRAISON.md` s'il apparaît.

**Règles d'ARCHITECTURE :** R-NET-1 à R-NET-11, R-SEC-1 à R-SEC-3, R-SEC-5, R-LAY-1, R-LAY-2, R-TEST-1 à R-TEST-3.

## 3. Ce que tu observes dans le site (à respecter, et à ne pas reproduire tel quel)

- Paiement : `Authorization: Bearer` quand `auth` est demandé ; jeton de suivi dans `X-Payment-Tracking-Token` ; réponses « brutes » ; erreurs métier parfois en HTTP 200 (`erreur`, `status: 'refuse'`). Le client interprète seulement le code HTTP.
- Communauté, Boutique, Marketplace : `X-Access-Proof` (jamais le Bearer) ; enveloppe `{ success, error, code, data }` retournée telle quelle avec le statut HTTP, sans exception pour une erreur métier ; seules les vraies pannes (réseau, corps non JSON) sont traitées à part. La Communauté envoie l'en-tête sur tous les appels ; la Marketplace et la Boutique selon un indicateur `auth`.
- Méthodes : GET, POST, PUT, PATCH, DELETE. Envoi de fichiers en `FormData` (jamais de `Content-Type` posé à la main dans ce cas).
- Limitation de débit : un 429 ou un code `RATE_LIMITED` fournit `retryAfterSeconds` (corps de la réponse, ou `data.retryAfterSeconds`) ; 30 secondes si la valeur est absente ou invalide. Le site pause ses sondages jusque-là.
- Contenu : appel direct avec `X-Access-Proof` et `Range`, sans enveloppe.
- **À ne pas reproduire :** le `...options` qui écrase les en-têtes et passe `auth` à `fetch` dans `client.js` ; le repli sur `API_BASE_URL` ; le passage d'une adresse absolue ; l'absence de délai maximum.

## 4. Périmètre : ce que tu livres

Tout dans `src/core/network/`, avec un fichier `*.tests.ts` à côté de chaque fichier, et un `index.ts` qui exporte l'API publique (les autres couches importent `@core/network`).

### 4.1 `types.ts`
- `AuthMode` : `'none' | 'bearer' | 'accessProof'`.
- `RequestOptions` : `auth?`, `headers?`, `query?` (valeurs `undefined` ignorées), `body?` (objet JSON ou `FormData`), `timeoutMs?`, `signal?`.
- `HttpResponse` : `status`, `ok`, `body` (JSON ou `null`), `bodyKind` (`'json' | 'empty' | 'invalid'`).

### 4.2 `errors.ts`
Erreurs typées, avec une propriété `code`, **sans adresse ni en-têtes dans le message** : `NetworkError` (`NETWORK_ERROR`), `TimeoutError` (`TIMEOUT`), `RequestAbortedError` (`ABORTED`). Aucun texte français : ils sont portés par `shared/i18n` en L0d. Dans `LIVRAISON.md`, liste les textes du site à porter plus tard (par exemple « Erreur réseau. Vérifiez votre connexion. » et « Réponse invalide du serveur. »).

### 4.3 `authProviders.ts`
`configureHttpAuth({ getBearerToken, getAccessProof, onUnauthorized })`. Par défaut, tous renvoient `null` ou ne font rien. Le module de session (L1a) s'y branchera. `onUnauthorized` reçoit `{ service, status, code, auth }`. Il n'est appelé que si `auth` n'est pas `'none'` et que la réponse est un 401. Un 401 d'une requête sans authentification (par exemple le jeton de suivi d'inscription expiré) ne le déclenche pas.

### 4.4 `serviceAuth.ts`
Mode d'authentification par défaut de chaque service : `community` = `'accessProof'`, tous les autres `'none'`. L'appel peut le remplacer par `auth`. Si le fournisseur de jeton ou de preuve renvoie `null`, l'en-tête est omis (comme le site).

### 4.5 `httpClient.ts`
`http.service(id)` renvoie `get`, `post`, `put`, `patch`, `delete`, `postForm`. Chaque appel renvoie une `HttpResponse` **pour toute réponse HTTP, quel que soit le statut**. Il lance seulement `NetworkError`, `TimeoutError` ou `RequestAbortedError` quand il n'y a pas de réponse.
- URL : `resolveServiceUrl(id, path)` du registre. **Un chemin absolu (`http://`, `https://`) est refusé par une erreur** (R-NET-9). Paramètres `query` encodés.
- En-têtes : `Content-Type: application/json` sauf pour `FormData` ; `Authorization: Bearer <jeton>` ou `X-Access-Proof: <preuve>` selon le mode ; **les en-têtes fournis par l'appelant ne peuvent jamais écraser ces deux-là** ; ils peuvent ajouter par exemple `X-Payment-Tracking-Token`. Une requête GET n'a pas de corps.
- Délai maximum par défaut : **20 000 ms**, remplaçable par appel, avec `AbortController` combiné au `signal` éventuel de l'appelant. **Cette valeur est une valeur de départ technique, pas une valeur du site** (qui n'en a pas) : signale-la comme telle dans `LIVRAISON.md`.
- Lecture de la réponse : texte puis JSON ; corps vide donne `bodyKind: 'empty'` ; corps non JSON donne `bodyKind: 'invalid'`.
- 429 ou `code === 'RATE_LIMITED'` : appelle `rateLimitGate` avec `retryAfterSeconds` pris dans l'ordre (corps, `data` du corps, en-tête `Retry-After`, 30 par défaut).
- `prepareRequest(service, path, options)` : retourne `{ url, headers }` sans appeler le réseau. Même résolution d'adresse et mêmes règles d'authentification que ci-dessus. Il servira aux lecteurs audio et vidéo (étapes 5 et 6).
- **Aucun log, aucune réessai automatique** (le site n'en a pas).

### 4.6 `envelope.ts`
- `parseEnvelope(response)` : retourne `{ success, error, code, field, retryAfterSeconds, data, status }` selon la logique de `communityClient.js` (`success` n'est vrai que si le corps contient `success === true`). Si `bodyKind` n'est pas `'json'`, retourne `success: false` avec `code: 'INVALID_RESPONSE'`.
- `safeEnvelope(promise)` : attrape les erreurs du §4.2 et retourne une enveloppe (`code: 'NETWORK_ERROR'` avec `status: 0`, comme le site) sans jamais lancer.

### 4.7 `rateLimitGate.ts`
Reprend `community/rateLimitGate.js` (même logique : durée valide sinon 30 s, `max` des échéances), **indexé par service** (`notifyRateLimited(service, seconds?)`, `isRateLimited(service)`). Ajoute `msUntilAvailable(service)` et `resetRateLimits()` (utilisé à la déconnexion et dans les tests). Il ne bloque pas les appels (R-NET-11).

### 4.8 Tests (`*.tests.ts`, `fetch` simulé, registre de test)
Résolution d'adresse ; refus d'adresse absolue ; en-têtes par mode d'authentification ; les en-têtes de l'appelant n'écrasent pas `Authorization` ni `X-Access-Proof` ; en-tête de suivi de paiement accepté ; `FormData` sans `Content-Type` ; corps JSON ; `query` ; délai maximum (temps simulé) ; panne réseau ; corps vide ; corps non JSON ; 429 (secondes du corps, de `data`, de l'en-tête, défaut 30) ; `RATE_LIMITED` en 200 ; `onUnauthorized` (appelé pour `bearer`/`accessProof`, pas pour `none`) ; `prepareRequest` identique à la requête réelle ; aucun `console.*` appelé ; `parseEnvelope` (succès, échec, `field` et `retryAfterSeconds` dans le corps ou dans `data`, réponse invalide) ; `safeEnvelope` ; `rateLimitGate` avec temps simulé.

## 5. Hors périmètre

WebSocket et temps réel (étape 10), endpoints, mappers, stores, module de session (L1a), textes français (L0d), nouvelle dépendance (aucune n'est attendue : `fetch`, `AbortController` et `FormData` viennent de React Native).

## 6. Questions attendues (avec recommandation)

1. Confirmer la séparation `HttpResponse` (toute réponse HTTP) et `parseEnvelope` (enveloppe), plutôt qu'un seul résultat unifié.
2. Typage de `FormData` dans React Native (fichiers avec `uri`, `name`, `type`).
3. Comportement de `AbortController` et lecture de l'en-tête `Retry-After` avec le `fetch` de React Native 0.88 (à vérifier dans la documentation, pas de mémoire).
4. Tout autre point que tu rencontres.

## 7. Critères d'acceptation

1. `ci.yml` : typecheck, lint et jest verts.
2. Aucun `fetch` ailleurs que dans `src/core/network` (test d'architecture existant) ; aucune adresse en dur.
3. Chaque point du §4.8 est couvert par un test.
4. Aucune dépendance ajoutée.
5. Aucun `console.*` dans `core/network`.
6. `LIVRAISON.md` : textes du site à porter en L0d, valeur de délai signalée comme choix technique, écarts éventuels avec les clients du site.