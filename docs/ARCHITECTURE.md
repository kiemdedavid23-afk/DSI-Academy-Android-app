ARCHITECTURE.md — DSI Academy (application Android, React Native)
Statut : v1.0 pour validation. Source de vérité visuelle : DESIGN-TOKENS.md (v1.1, à réécrire pour React Native). Source de vérité fonctionnelle : le site (src/…/*.jsx et son .css) et les contrats des Workers (docs/contrats/).
Chaque règle a un identifiant (R-…) pour que l'architecte cite la règle violée lors d'une vérification.
1. Règle d'or
L'app reproduit le site : même charte, même contenu, même ambiance. Aucune valeur visuelle ni aucun comportement réseau n'est inventé. Quand le site ou le contrat ne répond pas, Grok s'arrête et pose la question.
2. Couches et sens des dépendances
app  →  features  →  services  →  core
              ↘  shared  ↗
R-LAY-1 core ne dépend de rien d'autre dans src.
R-LAY-2 services n'importe que core. Aucun écran, aucun composant.
R-LAY-3 features/x n'importe jamais features/y. Ce qui est commun passe par shared ou core.
R-LAY-4 shared (progression, favoris, sélections, préférences, notifications) n'importe que core et services.
R-LAY-5 La CI vérifie ces règles (règle d'import ESLint). Une violation fait échouer la CI.
3. Réseau et migration VPS
R-NET-1 Seul core/config/serviceRegistry.ts connaît les adresses. Aucun littéral http(s)://, aucun fetch hors de core/network et core/config (règle ESLint, CI rouge sinon).
R-NET-2 Un service appelle http.service('<id>').get('/chemin'). Le chemin est relatif, identique à celui du site.
R-NET-3 La configuration est un secret GitHub unique (DSI_REGISTRY_JSON), converti par la CI en buildConfig.generated.ts. Ce fichier n'est jamais commité. Les tests utilisent une fixture factice.
R-NET-4 Services enregistrés : payment, content, shop, marketplace, community, admin. Un service n'est appelé que si un écran en a besoin.
R-NET-5 Le temps réel passe par resolveRealtimeUrl. Aucun WebSocket ne s'ouvre ailleurs.
R-NET-6 Erreurs typées (réseau, 401, 429, contrat inattendu). Les messages FR sont repris du site, tels quels.
R-NET-7 Chaque Worker a des fixtures de réponses réelles dans contracts/. Après la migration, les mêmes tests doivent passer sans modifier l'app.
Procédure de migration VPS :
Le VPS expose les mêmes chemins, un préfixe par service.
Vérifier les collisions de chemins (profile, favorites, media, catalog).
Modifier le secret en "mode": "gateway".
Recompiler et lancer les tests de contrat.
Garder les anciens Workers actifs jusqu'à ce que les membres aient mis l'app à jour.
4. Session et sécurité
R-SEC-1 Le jeton de session est dans le stockage sécurisé Android. Jamais dans le stockage clair, jamais dans un log.
R-SEC-2 Le paymentTrackingToken (inscription, 24 h) est séparé de la session et ne partage jamais son stockage. Il ne circule que dans l'en-tête X-Payment-Tracking-Token, jamais dans Authorization.
R-SEC-3 accessProof est une chaîne opaque : l'app la conserve et la transmet, sans jamais la décoder ni la vérifier.
R-SEC-4 Une réponse 401 sur une route membre purge la session et renvoie vers la connexion.
R-SEC-5 Aucune adresse de Worker dans le dépôt public, les logs ou les captures de CI.
R-SEC-6 L'option « se souvenir de moi » du site se traduit ainsi : cochée, le jeton est conservé de façon sécurisée ; non cochée, il reste en mémoire et disparaît à la fermeture de l'app. À confirmer à l'étape 1.
5. Données
R-DATA-1 Chaque service est un triplet *.service.ts (appels), *.types.ts (types), *.mapper.ts. Le nom reprend le service du site.
R-DATA-2 Les réponses des Workers sont validées au mapper (Zod). Un écart de contrat produit une erreur « contrat inattendu » visible dans les logs de CI, pas un plantage d'écran.
R-DATA-3 Données serveur : TanStack Query (cache, rechargement, pagination). Données locales de l'utilisateur (progression, favoris, sélections, préférences) : stores Zustand persistés, reprenant la logique des *Store.js du site.
R-DATA-4 Aucune donnée fictive dans l'app livrée. Les mock*.js du site ne sont pas repris (4 fichiers).
R-DATA-5 Hors ligne : seule la dernière version en cache s'affiche, avec un bandeau. Les téléchargements de contenu (downloadContent.js sur le site) sont étudiés à l'étape de la maison concernée, pas avant.
6. Les quatre états
R-UI-1 Chaque écran livré a ses quatre états : chargement (squelette), vide, erreur, succès. Ils reprennent ceux du site (squelettes, messages FR repris tels quels).
R-UI-2 Un seul jeu de composants d'état, dans core/designsystem/components. Une feature n'en recrée pas.
7. Design system
R-DS-1 Aucun littéral visuel (couleur, taille de texte, rayon, ombre, marge) dans features. Tout passe par core/designsystem/theme. Une règle ESLint le détecte.
R-DS-2 Fraunces uniquement pour titres, salutations et grands chiffres, jamais sous 14. Manrope partout ailleurs. Fraunces n'apparaît jamais sur un bouton, un formulaire ou un tableau.
R-DS-3 Rayons : 6, 10, 16, pilule, rond. Tout 12px ou autre valeur isolée du site est ramené au rayon le plus proche.
R-DS-4 L'or reste rare (environ 5 % de l'écran).
R-DS-5 Thème clair, thème sombre, et honorer « réduire les animations » (réglage du site et réglage système).
R-DS-6 Les trois polices sont embarquées dans l'APK. Les icônes reprennent celles du site (jeux SVG du site, Font Awesome 6.4 là où il est utilisé).
R-DS-7 Couleurs sémantiques (erreur, succès, alerte, information) : tokens obligatoires, valeurs à trancher (points ouverts DESIGN-TOKENS §4).
8. Navigation et authentification
R-NAV-1 RootNavigator choisit la pile selon la présence d'une session : AuthStack ou MemberTabs.
R-NAV-2 AuthStack v1 : Connexion, Inscription (navigateur intégré). Pas de « mot de passe oublié », pas de page « rejoindre ».
R-NAV-3 Un écran « Accueil » à deux boutons (S'inscrire, Se connecter) est réservé dans features/auth/welcome/, désactivé par featureFlags.welcomeScreen = false. Il sera construit une fois l'app stabilisée.
R-NAV-4 Les liens profonds sont déclarés uniquement dans app/navigation/linking.ts.
R-AUTH-1 Tant que l'accueil n'existe pas, la connexion porte un lien « Créer un compte » qui ouvre le navigateur d'inscription.
R-AUTH-2 Si la connexion répond pending_payment, l'app ouvre le navigateur intégré directement sur le paymentUrl reçu et conserve le paymentTrackingToken à part (R-SEC-2).
9. Navigateur d'inscription
R-WEB-1 Adresse : resolveWebUrl('/inscription?embed=app'), obtenue par le registre.
R-WEB-2 Technologie : WebView. Seules les pages de l'hôte du site s'y chargent ; tout autre lien est refusé ou ouvert à l'extérieur.
R-WEB-3 Le paymentUrl s'ouvre dans un onglet Chrome sécurisé, pas dans la WebView. Au retour, l'app revient sur la WebView.
R-WEB-4 Le site signale la fin du parcours par un message { type: 'dsi:registration-done', identifiant }. L'app vérifie l'origine, ferme le navigateur et affiche la connexion avec l'identifiant prérempli. Aucun jeton ne passe par ce message : l'inscription ne donne jamais de session.
R-WEB-5 Bouton retour Android : confirmation avant de fermer le parcours.
R-WEB-6 Hors connexion : écran d'erreur du design system, avec réessai.
R-WEB-7 Prérequis côté site (« étape S0 ») : mode ?embed=app (sans en-tête, pied de page ni liens de navigation du site), message de fin, vrai suivi du paiement dans PaymentReturnScreen.
10. i18n
R-I18N-1 fr/en repris des fichiers du site sans réécriture. Aucun texte visible en dur dans le code.
R-I18N-2 Les clés du site inutiles à l'app (inscription, rejoindre, mot de passe oublié) restent dans les fichiers mais ne sont pas utilisées.
11. Dépendances
R-DEP-1 Une dépendance entre dans le projet à l'étape qui en a besoin, avec sa justification dans la fiche : besoin, alternatives, maintenance, compatibilité avec la version de React Native et minSdk 24.
R-DEP-2 Versions figées exactement (sans ^). Aucune dépendance native sans que la compilation CI passe.
R-DEP-3 Le choix de React Native CLI (sans Expo), de TypeScript strict et de la version de React Native est tranché à l'étape 0.
12. Tests et CI
R-CI-1 Le workflow ci.yml est lancé à la main : typecheck, lint (dont règles R-LAY, R-NET, R-DS), jest.
R-CI-2 Chaque service a ses tests contre les fixtures de contracts/. Chaque mapper a ses tests sur les cas limites.
R-CI-3 Livraison par étape : Grok livre les fichiers ; tu les téléverses dans le dépôt, tu lances la CI et tu m'envoies logs et zip du dépôt. Je valide avant l'étape suivante.
R-CI-4 Dépôt public (tests, minutes gratuites) et dépôt privé (production), avec un workflow de synchronisation par jeton.
13. Règles pour Grok
Chaque fiche de tâche cite le fichier du site (.jsx et .css) et la section du contrat du Worker. Grok les lit avant d'écrire.
Aucune valeur inventée : question posée à la place.
Ne jamais écraser une correction manuelle : Grok part du dernier zip du dépôt.
Fichier touché, fichier nettoyé (R-DS-1, R-NET-1).
Chaque livraison contient le code complet des fichiers modifiés, jamais un fragment.
Un lot par fiche : pas de travail hors fiche.
14. Contrôle de fidélité par écran
Pour chaque écran livré, l'architecte vérifie : source citée, aucun littéral, quatre états, hiérarchie (or rare, Fraunces seulement en titre), contraste du texte discret, et comparaison avec le site en vue mobile (clair et sombre). Pas de paire de captures, pas de validation. Pour l'instant, tu m'as dit que tu n'as pas de rendu avant l'APK ; la comparaison visuelle sera donc faite en fin d'étape, quand l'APK sera compilé, et d'ici là la vérification se fait par le code et la CI.
15. Hors périmètre v1
Inscription et « rejoindre » natifs, mot de passe oublié, écran d'accueil (réservé, R-NAV-3), domaine personnalisé, flou en temps réel sur Android 11 et moins (à trancher).
16. Points ouverts
Couleurs sémantiques et or clair en sombre (DESIGN-TOKENS §2 et §4).
Élévations, espacement et flou (DESIGN-TOKENS §7 à §9).
Version de React Native et choix CLI ou Expo (étape 0).
« Se souvenir de moi » : comportement exact (R-SEC-6).
Notifications push : à décider avec le concepteur du Worker, au plus tard à l'étape Communauté.
Téléchargements de contenu hors ligne : à décider à l'étape Contenu.