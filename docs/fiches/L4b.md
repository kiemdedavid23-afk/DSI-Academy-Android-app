# Fiche L4b : moteur de livraison de contenu

**Source de vérité :** docs du Worker Contenu (mode LIEN unique) et décision du propriétaire : l'app lit en direct chez la source, en streaming, sans sauvegarde ni redirection. Lot précédent : L4a (client du Worker).

## Rôle du moteur
`openMedia(contentId)` (core/media/engine.ts) : demande le lien (`/content/:id/deliver`), choisit la stratégie, vérifie que la source répond avec un fichier, puis rend une `MediaSource`. Il ne lit pas les octets d'un média : le lecteur (lot suivant) le fait. Aucun lien n'est conservé ni journalisé ; quand la source refuse en cours de lecture, le lecteur rappelle `openMedia`.

## Stratégies (strategy.ts)
| Contenu | Formats | Stratégie |
|---|---|---|
| Livre | pdf, epub, mobi, docx | `tempFile` : fichier temporaire, effacé à la fermeture |
| Livre | txt | `boundedText` : lu en mémoire, plafond 5 Mio |
| Audio | mp3, wav, m4a | `nativeStream` : lecteur natif, Range géré par lui |
| Vidéo | mp4, webm | `nativeStream` |
| Vidéo | youtube_url (provider youtube) | `embeddedYoutube` : lecteur intégré, identifiant extrait |
| Telegram, Mega, formation | tous | refusés (le Worker ne les livre pas en lien) |

## Sondage de la source (core/network/sourceProbe.ts)
Une requête `Range: bytes=0-0` (en-têtes seulement, corps jamais lu) : détecte la taille, le support de Range, une page web à la place du fichier (confirmation ou quota Drive), un lien refusé (401/403), introuvable (404/410), limité (429) ou en erreur. Seul endroit, avec le client HTTP, où `fetch` est utilisé.

## Reprise et expiration
- Lien refusé, introuvable ou page web : une seule nouvelle résolution, puis échec classé.
- Réseau, délai, limite : échec marqué `retryable`, sans nouvelle résolution automatique.
- `planResume` / `buildRangeHeader` (range.ts) servent la reprise d'un fichier temporaire.

## Décisions techniques par défaut (à confirmer)
1. Plafond du texte : 5 Mio.
2. Délai du sondage : 15 s.
3. Une seule nouvelle résolution du lien.

## Hors périmètre
Lecteurs (PDF, audio, vidéo, texte), écriture du fichier temporaire, écrans, stores : lots suivants (L4c).
