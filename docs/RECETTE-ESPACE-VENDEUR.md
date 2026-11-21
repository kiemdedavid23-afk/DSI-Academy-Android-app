# Recette de l'espace vendeur (APK de test, vrai Worker)

À faire après un CI vert. Durée : environ 45 minutes. Cocher chaque ligne ; noter l'écran et la capture en cas d'écart.

## 0. Avant de commencer
- [ ] Worker Marketplace déployé, `npm run db:migrate:002` lancé une fois, `PAYMENT_BALANCE_PATH` renseigné (lot S0).
- [ ] Le testeur s'est **reconnecté** depuis le déploiement du Paiement (preuve enrichie : prénom, nom, pays).
- [ ] Workflow « Test APK » lancé ; APK `dsi-academy-test-apk` installé.
- [ ] Un compte vendeur `APPROVED` avec au moins 2 produits et 2 ventes ; un compte `SUSPENDED` ; un membre sans candidature.

## 1. Entrée et statut
- [ ] Membre sans candidature : porte d'entrée vers la candidature.
- [ ] `PENDING`, `REJECTED` (motif visible, redépôt), `SUSPENDED` (bandeau), `REVOKED` : écrans corrects.
- [ ] `APPROVED` : « Ouvrir mon espace vendeur » affiche l'Aperçu plein écran (barre principale masquée).

## 2. Écrans, thème clair puis sombre (Paramètres > thème)
Pour chaque écran, comparer à la capture en clair, puis vérifier en sombre : texte lisible, aucun fond blanc oublié, cartes distinctes.
- [ ] **Aperçu** : bonjour, lien de boutique (copier, voir), anneau de complétude, solde, bouton « Retirer », ventes et commandes avec variation, dernières commandes.
- [ ] **Produits** : compteurs, filtres, recherche, menu ⋮ (modifier, soumettre, dépublier, dupliquer, archiver), assistant de création (sans image tant que le service de fichiers est en 503).
- [ ] **Ventes** : périodes, résumé, filtre, détail, export (feuille de partage Android).
- [ ] **Analyses** : 4 indicateurs, 2 courbes, entonnoir, meilleurs produits, pays.
- [ ] **Plus** : en-tête (nom, e-mail), Voir ma boutique, cartes de lignes, Quitter.
- [ ] **Mon profil** : changer le logo, modifier nom, slogan, présentation ; vider le slogan (vérifier que le Worker l'efface).
- [ ] **Avis** et **Mes gains** : données réelles, pagination.

## 3. Cas d'erreur
- [ ] Paiement injoignable (couper la route interne) : Aperçu et Mes gains affichent « solde momentanément indisponible », aucun chiffre.
- [ ] Mode avion : message réseau, bouton Réessayer qui fonctionne.
- [ ] Session expirée : invitation à se reconnecter.
- [ ] Compte suspendu : actions d'écriture refusées avec un message écrit dans l'app, jamais le texte du Worker.
- [ ] Acheteur sans nom (ancien achat) : « Acheteur », pays masqué.

## 4. Accessibilité (TalkBack)
- [ ] Chaque bouton est annoncé avec son libellé et son rôle ; onglets annoncés « sélectionné ».
- [ ] Les courbes sont annoncées avec leur résumé ; les étoiles des avis avec la note.
- [ ] Taille de police système au maximum : aucun texte coupé, aucune cible masquée.
- [ ] Réglage « supprimer les animations » activé : aucune animation gênante.

## 5. Performance
- [ ] Défiler une liste de plus de 40 lignes (Ventes, Produits) : pas de saccade visible, la pagination charge la suite sans doublon.
- [ ] Ouverture de l'espace vendeur : première image en moins de 2 s sur réseau correct.

## 6. Suivi des visites
- [ ] Ouvrir une fiche produit puis revenir : une seule visite comptée par 30 minutes (Analyses du vendeur).
- [ ] Rappel : les visites de **boutique** ne remontent pas encore côté app (`storeSlug` public non branché).
