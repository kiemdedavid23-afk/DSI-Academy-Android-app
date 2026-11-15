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
