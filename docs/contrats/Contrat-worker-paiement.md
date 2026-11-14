# CONTRAT — Worker Paiement (côté application)

Version : 2026-11-14 · Source : code réel du Worker (après modifications frais / parrainage / marketplace / retraits 8h–16h).
Destination suggérée : `docs/contrats/payment/CONTRAT-WORKER-PAIEMENT.md` et fixtures dans `contracts/payment/`.

Tous les jetons, numéros et identifiants ci-dessous sont des exemples masqués.

---

## 0. Règles générales

| Sujet | Règle |
|---|---|
| Format | JSON, `Content-Type: application/json` |
| Auth membre | Header `Authorization: Bearer <token>` (token reçu à la connexion, valable 7 jours = `expiresIn` 604800 s) |
| Auth suivi paiement | Header `X-Payment-Tracking-Token: <paymentTrackingToken>` (valable 24 h) |
| CORS | Headers autorisés : `Content-Type`, `Authorization`, `X-Payment-Tracking-Token` |
| Résultat métier | **HTTP 200**, même pour un refus. L'app lit `status` / `erreur` dans le corps. |
| 400 | Format invalide |
| 401 | Session / jeton invalide : `{ "erreur": "Session invalide ou expirée" }` → l'app déconnecte |
| 429 | Trop de requêtes (voir limites par route) |
| 503 | Service indisponible momentanément |
| 404 | `{ "erreur": "Route inconnue" }` |
| 500 | `{ "erreur": "Erreur serveur" }` |
| Montants | DSI = entiers. FCFA = entiers. **1 DSI = 0,4 FCFA** (5000 DSI = 2000 FCFA) |
| Dates | ISO 8601 UTC |

**Règle d'or pour l'app** : toujours tester `status` (ou la présence de `erreur`) dans le corps avant de considérer un succès. Ne jamais se baser seulement sur le code HTTP.

---

## 1. Routes publiques (sans session)

### 1.1 `POST /api/inscription`
Limite : 5 par heure et par IP → 429.

Requête :
```json
{
  "nom": "Ouedraogo",
  "prenom": "Awa",
  "whatsapp": "+22670123456",
  "email": "awa@example.com",
  "pays": "BF",
  "formule": "acces_initial",
  "motDePasse": "motdepasse8+",
  "codeParrain": "DSI-XXXXXX"
}
```
- Obligatoires : `nom`, `whatsapp`, `pays`, `formule`, `motDePasse` (≥ 8 caractères).
- Optionnels : `prenom`, `email`, `codeParrain`.
- WhatsApp : format international (`+`, `00`) ou national si le pays est connu (BF, BJ, CI, ML, NE, SN, TG, GW, GN, CM, CF, CG, GA, TD, CD, GH, KE). 8 à 15 chiffres.

Succès (HTTP 200) :
```json
{
  "userId": "DSI-000123",
  "status": "pending_payment",
  "paymentUrl": null,
  "paymentMode": "direct",
  "paymentTrackingToken": "ptt_****"
}
```
- `paymentMode: "direct"` → `paymentUrl` est `null`, l'app affiche son propre formulaire (réseau + numéro, voir 1.4).
- `paymentMode: "hosted"` → `paymentUrl` = page de paiement à ouvrir dans une WebView / navigateur.

Refus (HTTP 200) :
```json
{ "erreur": "Numéro WhatsApp invalide", "champs": ["whatsapp"] }
```
(`champs` présent seulement quand le champ fautif est identifiable.)

### 1.2 `POST /api/auth/connexion`
Requête :
```json
{ "identifiant": "awa@example.com", "motDePasse": "motdepasse8+" }
```
- `identifiant` = **email** ou **WhatsApp international** uniquement (pas l'identifiant DSI).
- Anti-bruteforce : 5 échecs / 15 min → même réponse générique (le blocage n'est jamais révélé).

**A. Connecté (compte actif)** :
```json
{
  "status": "connecte",
  "authenticated": true,
  "userId": "DSI-000123",
  "accountStatus": "active",
  "subscriptionStatus": "active",
  "subscriptionActive": true,
  "dateFin": "2027-11-14T10:00:00.000Z",
  "token": "sess_****",
  "expiresIn": 604800,
  "accessProof": "ap_****"
}
```
`subscriptionActive` peut être `false` (abonnement expiré) tout en étant connecté : l'app doit alors orienter vers le renouvellement. `subscriptionStatus` / `dateFin` peuvent être `null` si aucun abonnement.

**B. Paiement en attente (aucune session émise)** :
```json
{
  "status": "pending_payment",
  "userId": "DSI-000123",
  "paymentTrackingToken": "ptt_****",
  "paymentMode": "direct",
  "paymentUrl": null
}
```
Le worker vérifie le paiement à la connexion : si entre-temps il est confirmé, on reçoit directement la réponse A. Si l'ancienne tentative est périmée/refusée, une nouvelle tentative est créée (nouveau token).

**C. Suspendu** :
```json
{
  "status": "suspendu",
  "authenticated": false,
  "message": "Votre compte est actuellement suspendu. Veuillez contacter le service client pour obtenir plus d'informations."
}
```

**D. Refus** (mauvais identifiant/mot de passe, blocage, compte expiré, etc. — message unique) :
```json
{ "status": "refuse", "message": "Identifiant ou mot de passe incorrect." }
```

### 1.3 `GET /api/paiement/statut`
Header : `X-Payment-Tracking-Token`. 401 si jeton invalide. Interroge réellement le fournisseur (les webhooks ne font que déclencher une revérification).

```json
{ "status": "attente" }
```
Valeurs de `status` : `non_initie` · `attente` · `active` · `refuse` · `introuvable`.
Quand `active` : le compte est activé → l'app renvoie l'utilisateur vers la connexion (aucune session n'est créée par cette route).
Conseil app : interroger toutes les 3–5 s pendant l'attente, arrêt sur `active`/`refuse`.

### 1.4 `GET /api/paiement/reseaux?pays=BF&type=inscription`
`type` = `inscription` | `renouvellement`. Limite 60 / 15 min.

```json
{
  "mode": "direct",
  "montant": 2100,
  "prix": 2000,
  "frais": 100,
  "devise": "XOF",
  "reseaux": [
    { "code": "orange", "libelle": "Orange Money", "otpRequis": true },
    { "code": "moov", "libelle": "Moov Money", "otpRequis": false }
  ]
}
```
- **`montant` = ce que le client paie** = prix + 5 % (inscription 2000 → 2100 ; renouvellement 1000 → 1050). `prix` = prix de la formule, `frais` = les 5 %.
- L'app affiche `montant` comme total à payer.
- ⚠ La liste exacte des champs de chaque réseau dépend du fournisseur configuré : l'app doit utiliser `code` pour l'envoyer à `/api/paiement/initier` et ignorer les champs inconnus. **À figer avec une capture réelle** (voir §6).

### 1.5 `POST /api/paiement/initier`
Header : `X-Payment-Tracking-Token`.
```json
{ "reseau": "orange", "numeroPaiement": "70123456", "otp": "123456", "email": "awa@example.com" }
```
- `otp` : uniquement pour les réseaux qui l'exigent (Orange). L'instruction affichée au client mentionne le **montant total** (frais inclus).
- `email` : optionnel.

Réponses (HTTP 200) :
```json
{ "status": "attente", "message": "Validez le paiement sur votre téléphone.", "paymentUrl": null, "paymentTrackingToken": "ptt_****" }
```
```json
{ "status": "refuse", "message": "Numéro invalide.", "champ": "numeroPaiement" }
```
```json
{ "status": "active" }
```
Après `attente`, l'app suit avec `GET /api/paiement/statut` (en utilisant le `paymentTrackingToken` renvoyé s'il a changé).

### 1.6 `GET /api/retrait/moyens-disponibles?pays=BF`
Liste des moyens de retrait du pays (réseaux). Utilisée par l'écran de retrait. **Corps à figer avec une capture réelle** (§6).

---

## 2. Routes membre (`Authorization: Bearer <token>`)

Toute réponse 401 `{ "erreur": "Session invalide ou expirée" }` → déconnexion + retour à l'écran de connexion.

### 2.1 `GET /api/membre/profil`
```json
{
  "identifiantDsi": "DSI-000123",
  "nom": "Ouedraogo",
  "prenom": "Awa",
  "whatsapp": "+22670123456",
  "email": "awa@example.com",
  "pays": "BF",
  "statut": "active",
  "codeParrainagePersonnel": "DSI-ABC123"
}
```

### 2.2 `GET /api/membre/solde`
```json
{ "identifiantDsi": "DSI-000123", "soldeDsiActuel": 5000, "totalDsiGagnes": 12000 }
```
Équivalent FCFA = DSI × 0,4 (calcul côté app pour l'affichage).

### 2.3 `GET /api/membre/abonnement`
```json
{
  "formule": "acces_initial",
  "dateDebut": "2026-11-14T10:00:00.000Z",
  "dateFin": "2027-11-14T10:00:00.000Z",
  "statut": "active",
  "modePaiement": "fcfa",
  "renouvellements": []
}
```

### 2.4 `GET /api/membre/paiements?page=1&limit=20`
```json
{ "paiements": [ { "...": "voir §6" } ], "page": 1, "limit": 20, "total": 3, "totalPages": 1 }
```

### 2.5 `GET /api/membre/dsi/historique?limite=50&avant=<date|id>`
Journal des mouvements DSI (récompenses, parrainage, codes, retraits, marketplace…). Pagination par curseur : passer `avant` = dernier élément reçu pour la page suivante. **Corps à figer avec une capture réelle** (§6).

### 2.6 `GET /api/membre/parrainage`
```json
{
  "codeParrainagePersonnel": "DSI-ABC123",
  "filleulsDirectsTotal": 12,
  "filleulsDirectsActifs": 10,
  "recompensesNiveau1Dsi": 10000,
  "recompensesNiveau2Dsi": 2500,
  "totalDsiParrainage": 12500,
  "historique": [],
  "historiqueLimite": 50
}
```
HTTP 200, ou 404 si introuvable.

**Récompenses actuelles (nouveaux parrainages)** : niveau 1 = **1000 DSI (400 FCFA)**, niveau 2 = **250 DSI (100 FCFA)**. Message produit : « Gagne au moins 500 FCFA dans le parrainage ». Les anciens parrainages gardent leurs anciens montants.

**Niveaux (filleuls directs actifs)** et plafond de retrait cumulé sur 7 jours glissants :

| Niveau | Filleuls actifs | Plafond FCFA / 7 jours |
|---|---|---|
| explorateur | 0–4 | 0 |
| contributeur | 5–19 | 10 000 |
| batisseur | 20–49 | 15 000 |
| leader | 50–99 | 20 000 |
| referent | 100–249 | 25 000 |
| ambassadeur | 250–499 | 30 000 |
| pilier_dsi | 500+ | 35 000 |

### 2.7 `POST /api/dsi/utiliser-code`
Limite : 10 essais / 10 min.
```json
{ "code": "CADEAU123" }
```
Succès :
```json
{ "status": "succes", "montantDsi": 500, "message": "+500 DSI crédités." }
```
Refus (message volontairement unique, ne révèle pas la raison) :
```json
{ "status": "refuse", "message": "Ce code est invalide ou a expiré." }
```
Le montant vient toujours de la fiche du code, jamais de l'app.

### 2.8 `POST /api/abonnement/renouveler`
Limite : 8 / 15 min. Fenêtre : **7 derniers jours** avant l'expiration (pas de prépaiement).

Paiement par solde DSI :
```json
{ "modePaiement": "dsi" }
```
→ `{ "status": "active", "message": "..." }` ou `{ "status": "refuse", "message": "..." }`

Paiement FCFA :
```json
{ "modePaiement": "fcfa", "paiement": { "reseau": "orange", "numeroPaiement": "70123456", "otp": "123456", "email": "awa@example.com" } }
```
→ `{ "status": "pending_payment", "paymentMode": "direct", "paymentUrl": null, "paymentTrackingToken": "ptt_****" }` puis suivi via `GET /api/paiement/statut`.
Montant à payer en FCFA : voir `GET /api/paiement/reseaux?type=renouvellement` (prix + 5 %).

Refus typiques (`status: "refuse"`) : hors fenêtre de 7 jours, solde DSI insuffisant, compte spécial plateforme.

### 2.9 `POST /api/retrait/demander`
```json
{ "montantDsi": 5000, "moyenPaiement": "orange", "numeroPaiement": "70123456" }
```
Succès :
```json
{
  "status": "demande_enregistree",
  "idRetrait": "RET-****",
  "identifiantDsi": "DSI-000123",
  "montantDsiDemande": 5000,
  "montantDsiNet": 5000,
  "montantFcfaDemande": 2000,
  "fraisRetraitFcfa": 190,
  "montantFcfa": 1810,
  "statut": "en_attente",
  "dateDemande": "2026-11-14T09:30:00.000Z",
  "moyenPaiement": "orange",
  "numeroPaiement": "70123456",
  "referenceSequestre": "SEQ-****",
  "message": "..."
}
```
Refus :
```json
{ "status": "refuse", "message": "..." }
```
**Règles de retrait** :
- Ouvert **tous les jours de 8h à 16h** (heure UTC = heure du Burkina).
- **1 demande par membre et par jour.**
- Plafond selon le niveau (tableau 2.6), cumulé sur 7 jours glissants.
- **Frais : 100 FCFA fixes + 4,5 %**, déduits du montant FCFA demandé. Exemple : 5000 DSI = 2000 FCFA → frais 100 + 90 = **190** → le membre reçoit **1810 FCFA**. L'app doit afficher `montantFcfa` (net reçu) et `fraisRetraitFcfa`.
- Abonnement actif requis ; compte plateforme interdit.
- L'app peut afficher la fenêtre 8h–16h et griser le bouton hors horaires, mais le serveur reste l'autorité (il renvoie un `refuse` avec message).

### 2.10 `GET /api/membre/retraits`
```json
{
  "total": 1,
  "retraits": [
    {
      "idRetrait": "RET-****",
      "montantDsiDemande": 5000,
      "contributionStabiliteDsi": 0,
      "montantDsiNet": 5000,
      "montantFcfa": 1810,
      "statut": "en_attente",
      "dateDemande": "2026-11-14T09:30:00.000Z",
      "dateTraitement": null,
      "moyenPaiement": "orange",
      "numeroPaiement": "70123456",
      "pays": "BF",
      "reglesAppliquees": "...",
      "referenceSequestre": "SEQ-****"
    }
  ]
}
```
`contributionStabiliteDsi` vaut 0 par défaut (mécanisme désactivé).

### 2.11 `GET /api/membre/retraits/{idRetrait}/historique`
```json
{
  "idRetrait": "RET-****",
  "evenements": [
    { "champ": "statut", "ancienneValeur": "en_attente", "nouvelleValeur": "traite", "date": "2026-11-14T12:00:00.000Z" }
  ]
}
```
Introuvable : `{ "erreur": "Retrait introuvable" }`.

---

## 3. Frais — récapitulatif pour l'affichage

| Opération | Règle |
|---|---|
| Dépôt / inscription | Prix + 5 % payé par le client (2000 → **2100** ; renouvellement 1000 → **1050**) |
| Retrait | **100 FCFA + 4,5 %** déduits du montant demandé |
| Transfert marketplace | Commission + frais gérés par le Worker Marketplace / Paiement ; invisibles côté app Paiement |

---

## 4. Statuts à gérer dans l'app

| Où | Valeurs |
|---|---|
| Connexion `status` | `connecte` · `pending_payment` · `suspendu` · `refuse` |
| Paiement `status` | `non_initie` · `attente` · `active` · `refuse` · `introuvable` |
| Retrait `statut` | `en_attente` · … (valeurs de traitement à figer, §6) |
| Profil `statut` | `active` · `suspended` · `pending_payment` · `expired` |

---

## 5. Parcours types

**Inscription** : `POST /api/inscription` → (mode direct) `GET /api/paiement/reseaux` → `POST /api/paiement/initier` → boucle `GET /api/paiement/statut` → `active` → écran de connexion. (mode hosted) ouvrir `paymentUrl` → boucle `statut`.

**Reprise d'une inscription non payée** : `POST /api/auth/connexion` → `pending_payment` → reprendre au même point que ci-dessus avec le nouveau `paymentTrackingToken`.

**Connexion** : `POST /api/auth/connexion` → `connecte` → stocker `token` en stockage sécurisé → toutes les routes membre avec `Bearer`. 401 → effacer et revenir à la connexion.

**Renouvellement** : `GET /api/membre/abonnement` → si dans les 7 jours : `POST /api/abonnement/renouveler`.

---

## 6. Lacunes connues (à ne pas inventer côté app)

1. **Pas de route de notifications membre** dans le Worker Paiement (L3d : cloche, notifications → Worker admin).
2. **Pas de « mot de passe oublié »** dans le Worker Paiement pour l'instant.
3. Pas de route de déconnexion serveur documentée : la déconnexion = suppression locale du token (la session expire après 7 jours).
4. Corps réels **à capturer sur le Worker déployé** pour figer les fixtures : `GET /api/paiement/reseaux` (liste des réseaux par pays), `GET /api/retrait/moyens-disponibles`, `GET /api/membre/paiements` (un élément), `GET /api/membre/dsi/historique` (un élément), valeurs de `statut` des retraits, élément de `historique` du parrainage.
5. Compte de test : à créer côté Worker (inscription + paiement de test, ou activation manuelle) pour tourner les fixtures ; le compte plateforme `DSI-000001` ne doit **jamais** servir de compte de test (il ne peut ni retirer, ni renouveler, ni acheter, ni vendre).
6. Commission marketplace : taux encore à fixer par le propriétaire (`CONFIG_COMMISSION_MARKETPLACE`), sans impact sur ce contrat.
