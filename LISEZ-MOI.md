# Livraison complète : visuel (Academy → maison → fiche) + lecteurs

Ce zip contient TOUT (visuel + lecteurs) : il remplace le zip précédent. Chaque dossier se dépose à la racine de son dépôt (les fichiers existants sont écrasés).
⚠ Les fichiers Kotlin et AndroidManifest.xml changent : il faut reconstruire l'APK (pas seulement le code JS).

## PARTIE 2 — Lecteurs (app)
Audio et vidéo (Kotlin + JS) :
- android/.../player/DsiPlayerModule.kt : + boucle, volume, image dans l'image ; boucle et volume remis à zéro à chaque nouveau contenu
- android/app/src/main/AndroidManifest.xml : + supportsPictureInPicture
- src/core/media/playerNative.ts : + SPEED_OPTIONS (0,5 à 2×), SLEEP_OPTIONS (5, 10, 15, 30, 60 min), contrôles boucle/volume/PiP
- src/features/content/store/playerStore.ts : + boucle, volume, muet, minuteur de sommeil, PiP
- src/features/content/screens/PlayerScreen.tsx : vitesses en pastilles, boucle, volume, muet, minuteur, PiP, double-tap ±15 s, appui long 2×, écran défilant
PDF :
- src/features/content/screens/PdfReaderScreen.tsx : zoom 100 % à 300 % (pas de 25 %), aller à une page, signets (ajouter, retirer, liste)
- src/shared/store/bookmarksStore.ts (créé), src/shared/store/index.ts
Texte et livres (EPUB, DOCX) :
- src/features/content/store/readerLookStore.ts (créé) : thème clair / sépia / nuit, police serif / sans, taille 80 % à 200 % par pas de 10, mémorisés sur l'appareil
- src/features/content/components/ReadingSettings.tsx, ReaderChip.tsx (créés)
- src/features/content/screens/TextReaderScreen.tsx, DocReaderScreen.tsx
Communs :
- src/shared/designsystem/theme/colors.ts, theme/index.ts (+ readingThemes), theme/typography.ts (+ readingSerif, readingSans)
- src/shared/i18n/locales/app.fr.json, app.en.json (textes fr et en)
- __tests__/readerFeatures.tests.ts (créé)

## PARTIE 1 — Visuel (inchangé par rapport au zip précédent)
Voir la liste : site (ContentDetail.jsx/.css) et app (Academy, maisons, cartes, fiche, Scrim, houseVisuals, selectionsStore, railsStore, similarStore…).

## Non repris (impossible ou sans objet sur mobile)
- Table des matières du PDF : le moteur PdfRenderer d'Android n'expose pas les titres du document.
- Thème et police sur le PDF : les pages sont des images.
- Raccourcis clavier du site (espace, K, J, L, flèches, F) : pas de clavier sur mobile.
- Zoom au pincement : le zoom se fait par boutons.
