CONTRAT — POST /api/auth/connexion  (source : code du Worker Paiement, 2026-11-14)
Public, sans Authorization. Corps : { "identifiant": "...", "motDePasse": "..." }

HTTP
- 200 pour TOUS les résultats métier (connecté, en attente, refus, suspendu).
  Un refus n'est PAS une erreur HTTP : le mapper doit lire "status".
- 400 { "erreur": "identifiant ou motDePasse manquant" } si un champ est vide.

IDENTIFIANT ACCEPTÉ
- Email, ou numéro WhatsApp au format international (avec ou sans "+" ou "00").
- L'identifiant DSI (DSI-12345) n'est PAS accepté pour se connecter.

1) COMPTE ACTIF
{
  "status": "connecte",
  "authenticated": true,
  "userId": "DSI-12345",
  "accountStatus": "active",
  "subscriptionStatus": "active",
  "subscriptionActive": true,
  "dateFin": "2026-12-11T10:00:00.000Z",
  "token": "<masqué>",
  "expiresIn": 604800,
  "accessProof": null
}
- expiresIn = 604800 secondes (7 jours).
- accessProof est null tant que la clé de signature n'est pas configurée : cas normal.
- Abonnement expiré : status reste "connecte", subscriptionActive = false.
- subscriptionStatus et dateFin peuvent être null s'il n'y a aucun abonnement.

2) EN ATTENTE DE PAIEMENT — mode direct (AlphaPay, pays couverts)
{
  "status": "pending_payment",
  "userId": "DSI-12345",
  "paymentTrackingToken": "<masqué>",
  "paymentMode": "direct",
  "paymentUrl": null
}

3) EN ATTENTE DE PAIEMENT — mode hosted (page de paiement)
{
  "status": "pending_payment",
  "userId": "DSI-12345",
  "paymentTrackingToken": "<masqué>",
  "paymentMode": "hosted",
  "paymentUrl": "https://..."
}
- Aucune session, aucun token, aucun accessProof dans ces cas.
- paymentTrackingToken : valable 24 h. Il est présent en pratique ; s'il manquait, traiter comme échec.
- Si le paiement a été confirmé entre-temps, la réponse est le cas 1 (connecté) directement.

4) REFUS (mauvais identifiant, mauvais mot de passe, compte expiré, compte bloqué)
{ "status": "refuse", "message": "Identifiant ou mot de passe incorrect." }
- Message identique dans tous les cas, ne jamais deviner la cause.
- Anti-bruteforce : après 5 échecs sur un même identifiant, blocage 15 minutes,
  avec la MÊME réponse "refuse" (même avec le bon mot de passe). Pas de code 429.

5) COMPTE SUSPENDU (forme à ne pas oublier)
{
  "status": "suspendu",
  "authenticated": false,
  "message": "Votre compte est actuellement suspendu. Veuillez contacter le service client pour obtenir plus d'informations."
}
- Le message est fait pour être affiché. À mapper en { kind: 'failure', message }.

RECOMMANDATION MAPPER
- "connecte" + token présent        → kind 'session'
- "pending_payment" + tracking token → kind 'pendingPayment'
- "refuse" | "suspendu" | inconnu   → kind 'failure' (message du Worker si présent)

COMPTES DE TEST (sur le Worker de production)
- Actif : un compte déjà payé (le tien).
- En attente : créer un nouveau compte via l'inscription SANS payer
  (email jetable). Il répond le cas 2 ou 3 selon le pays.
- Mauvais mot de passe : 1 ou 2 essais maximum sur le même identifiant,
  pour ne pas déclencher le blocage de 15 minutes.