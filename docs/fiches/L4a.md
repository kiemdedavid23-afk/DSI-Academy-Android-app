# Fiche L4a : fondations contenu (Worker Contenu)

**Source de vérité :** documentation du Worker Contenu (docs.zip : API.md, PROVIDERS.md, SECURITY.md, NOTES-ET-ECARTS.md). Priorité 1 du contrat Grok. Le site n'est pas la référence pour la livraison (il attend encore le mode relais et les jetons de lecture).

## Périmètre
Endpoints publics : `GET /content`, `/content/:id`, `/content/by-slug/:type/:slug`, `/search`, `/content/categories`, `/content/:id/assets`, `/assets/best`, `/assets/:id`, `/content/:id/components`, `/components/tree`. Endpoint protégé : `GET /content/:id/deliver` (X-Access-Proof). Hors périmètre : routes inter-Worker (admin), `intent=download`, stores, écrans.

## Décisions
1. Mode LIEN : `deliver` renvoie `{ status, type: 'link', delivery: { url } }`. Les réponses de l'ancien mode relais sont détectées et refusées (`unsupportedMode`).
2. Visibilité (NOTES-ET-ECARTS n°2) : les GET publics ne filtrent pas le statut. L'app demande `editorial_status=published` au catalogue et écarte tout contenu non `published` + `active` au mapper (listes, détail, arbre).
3. Liens et vignettes : https uniquement, sinon refus (lien) ou `null` (vignette).
4. Erreurs : le code stable du Worker (partie avant « — ») est conservé, aucun texte n'est inventé ; les textes viendront de shared/i18n.
5. Streaming seul : `intent=download` n'est jamais envoyé.

## Questions restées sans réponse
- Taille maximale utile de `limit` côté app (défaut Worker 30, max 100) : à fixer au lot du catalogue.
- Fixtures : construites d'après API.md, pas capturées sur le Worker réel (voir LIVRAISON.md).
