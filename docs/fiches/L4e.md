# Fiche L4e (partie 1) : lecteur de texte, progression, favoris

**Sources :** contrat du Worker Contenu (fait foi) ; fiche L4b (moteur) ; site : `TxtViewer.jsx`, `progressStore`, `favoritesStore`, `useReadingPrefs`.

## Livré
- **Texte brut** (stratégie `boundedText`, 5 Mio max) : `core/network/textSource.ts` lit le texte en mémoire chez la source, `core/media/textReader.ts` enchaîne moteur puis lecture. Lien refusé ou introuvable en cours de lecture : une seule nouvelle demande de lien. Rien n'est écrit sur le disque.
- **Écran lecteur** : défilement continu par blocs (liste virtualisée), taille du texte (5 niveaux, mémorisée), progression enregistrée une seconde après le dernier défilement et à la fermeture, reprise avec message « Reprise à X % » et bouton « Recommencer » (seuils du site : pas de reprise sous 3 % ni au-delà de 97 %).
- **Progression locale** : `shared/store/progressStore.ts` (un pourcentage par contenu, purgé à la déconnexion). Chaque lecture met aussi à jour « Reprendre » du hub (`id` = id du contenu, `house` = library).
- **Favoris** : `favoritesStore.has/toggle`, bouton sur la fiche détail.
- **Fiche détail** : bouton « Lire » actif (ouvre le lecteur), bouton favori.

## Pas encore livré (décision requise)
PDF, EPUB, MOBI, DOCX : le moteur renvoie `tempFile`, l'écran affiche « Ce format sera disponible dans une prochaine mise à jour ». Aucun lecteur choisi : il faut trancher entre écrire un fichier temporaire (effacé à la fermeture, contraire au « sans sauvegarde » strict) et un rendu en mémoire (WebView + visionneuse), puis valider les dépendances natives (aucune n'est installable ici).

## Limites connues
- Reprise par pourcentage de hauteur : approximative sur un très long texte (la hauteur des blocs non encore affichés est estimée) ; à valider sur APK.
- Pas de thèmes de lecture sépia/nuit : le site en a, mais l'app n'a pas encore ces couleurs dans les tokens (R-DS-1).
- Le contrat de livraison n'a pas été validé sur téléphone (L4c sautée) : première vraie lecture à faire sur APK.
- Non exécuté ici (pas de réseau) : typecheck, lint, jest à lancer en CI.

# Fiche L4e (partie 2) : lecteur PDF natif Android

## Livré
- **Module Kotlin `DsiPdf`** (`android/.../pdf/`) basé sur `android.graphics.pdf.PdfRenderer`, sans dépendance tierce, enregistré dans `MainApplication`. Pas de WebView.
- Le lien obtenu par le moteur (stratégie `tempFile`) est téléchargé par OkHttp dans le **cache privé de l'app** (`cacheDir/dsi-pdf`), plafond 200 Mio, refus d'une page HTML. Le fichier et les images de pages sont effacés à la fermeture, à la destruction du module et au démarrage. Rien dans le stockage partagé.
- Pages rendues **à la demande** (JPEG dans le cache), une seule à la fois côté natif ; liste virtualisée côté JS.
- Progression par page (pourcentage, mêmes seuils 3 %/97 %), reprise à la dernière page, entrée « Reprendre » du hub.
- Lien refusé, introuvable ou page web : une seule nouvelle demande de lien. Erreurs classées, textes via i18n (PDF protégé, PDF illisible).

## Écart assumé avec « sans sauvegarde »
`PdfRenderer` exige un fichier à accès aléatoire : le streaming pur est impossible. Le fichier est temporaire, privé et effacé ; c'est la stratégie `tempFile` de L4b.

## Limites connues
- Pas de zoom par pincement, pas de recherche ni de table des matières.
- Hauteur de page = ratio de la première page (PDF aux formats mixtes : bandes blanches).
- Pas de reprise partielle du téléchargement (nouveau téléchargement complet).
- EPUB, MOBI, DOCX : toujours sans lecteur.
- **Non exécuté ici** : build Gradle, typecheck, lint, jest. À valider sur APK avec un vrai PDF (Drive, Internet Archive, Catbox).

# Fiche L4e (partie 3) : lecture par morceaux et formats natifs

## PDF par morceaux (API 26+)
`RangeSource` + `ProxyFileDescriptorCallback` : `PdfRenderer` lit un faux fichier dont chaque lecture devient une requête Range de 256 Kio vers la source. L'app affiche la première page après quelques blocs (fin du fichier pour la table, puis la page). Cache **en mémoire** (192 blocs, ~48 Mio), **aucun fichier sur le disque**. Repli sur le téléchargement complet (partie 2) si la source n'accepte pas Range ou sous Android 8.

## EPUB, MOBI, DOCX (module `DsiDoc`)
Lus **en mémoire** (plafond 60 Mio) puis analysés en Kotlin (zip, XML, PalmDOC), sans disque ni WebView ni application externe. Rendu : titres h1–h3 et paragraphes, taille réglable, progression par bloc, reprise.
- EPUB : suit l'ordre de lecture (spine). Images, styles, polices ignorés.
- DOCX : paragraphes et styles Titre/Heading 1–3. Tableaux aplatis, images ignorées.
- MOBI : PalmDOC (compression 1 et 2). KF8/AZW3 pur, Huffman et DRM : message d'erreur dédié.
- Ces trois formats sont lus en entier avant affichage (fichiers petits), pas par morceaux.

## Limites connues
- Lien expiré **pendant** la lecture d'un PDF par morceaux : pas de nouvelle demande automatique (seulement à l'ouverture).
- Pas de zoom PDF, pas de recherche, pas de table des matières.
- Non exécuté ici : Gradle, typecheck, lint, jest. `ProxyFileDescriptorCallback` + `PdfRenderer` jamais testé ici : à valider sur APK.
