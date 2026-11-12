DESIGN-TOKENS.md — DSI Academy (React Native)
Règle unique : l'app a le même visuel que le site. Même charte, mêmes couleurs, mêmes polices, mêmes rayons, même ambiance.
Source de vérité : src/assets/styles/global.css (charte v3.0 : 70 % neutres / 20 % sombre / 5 % or), puis le .css à côté de chaque écran.
Ce document ne contient aucun code. Les valeurs sont traduites dans core/designsystem/theme/ et nulle part ailleurs (ARCHITECTURE §7).
v1.1 : adaptation de la v1.0 (Compose) à React Native. Les unités dp et sp sont inchangées : 1 rem du site = 16 dp ou 16 sp.
1. Couleurs, thème clair (défaut)
Rôle
Valeur
Token du site
Fond de l'app
#F8FAFC
--bg-app
Surface (cartes, feuilles)
#FFFFFF
--bg-surface
Surface alternative
#F1F5F9
--bg-surface-alt
Fond sombre premium
#0F172A
--bg-dark-premium
Carte sombre
#1E293B
--bg-dark-card
Texte principal
#0F172A
--text-primary
Texte secondaire
#475569
--text-secondary
Texte discret
#94A3B8
--text-muted
Texte sur fond sombre
#F8FAFC
--text-on-dark
Or prestige
#D4AF37
--gold-prestige
Or clair (fond d'accent)
#FDF6E2
--gold-light
Bordure or
#D4AF37 à 35 %
--gold-border
Bleu institutionnel
#1E40AF
--blue-primary
Bleu clair
#EFF6FF
--blue-light
Bordure claire
#E2E8F0
--border-light
2. Couleurs, thème sombre
Seules ces valeurs changent par rapport au clair.
Rôle
Valeur sombre
Fond de l'app
#0B1120
Surface
#111827
Surface alternative
#1E293B
Fond sombre premium
#020617
Carte sombre
#0F172A
Texte principal
#F8FAFC
Texte secondaire
#CBD5E1
Texte discret
#94A3B8
Bordure
#334155
Bleu clair
#1E3A5F
Or clair (nouveau)
#D4AF37 à 16 % posé sur la surface [À CONFIRMER à l'œil sur APK]
Le site oublie l'or clair en sombre (il apparaît crème sur fond sombre). Ne pas le copier. La valeur ci-dessus garde l'esprit « accent doré discret ».
3. Bleu « actif / lien » (nouveau rôle) [Site]
Le bleu institutionnel #1E40AF est illisible sur fond sombre. Le site utilise #93C5FD pour tout état actif et tout lien en sombre (onglets actifs, barre du bas, tiroir, interrupteur). Rôle à créer :

Clair
Sombre
Bleu actif / lien
#1E40AF
#93C5FD
Le titre en dégradé du tiroir et de l'en-tête (clair #F8FAFC vers bleu #93C5FD, thème sombre uniquement) est un cas particulier : à traiter à l'étape 2.
4. Accent doré
L'or reste rare : environ 5 % de l'écran. Jamais en grande surface.
Dégradé de barre de progression : de #D4AF37 vers #E8C77E, de gauche à droite.
Un élément « actif ou favori » prend le fond or clair et la bordure or.
5. Couleurs sémantiques [Site]
Le site les écrit en dur dans les CSS d'écran. Elles deviennent des tokens. Les valeurs ci-dessous sont les plus utilisées dans les CSS (comptage), et les variantes sombres existent dans le site pour le texte.
Rôle
Texte clair
Fond clair
Bordure claire
Texte sombre
Erreur
#B91C1C
#FEF2F2
#FCA5A5
#F87171
Succès
#15803D
#DCFCE7
#86EFAC
#4ADE80
Alerte
#B45309
#FEF3C7
#FDE68A
#FBBF24
Information
#2563EB
#DBEAFE
#93C5FD
#93C5FD
Fonds et bordures en sombre : la couleur du texte sombre à 16 % (fond) et 35 % (bordure), posée sur la surface [À CONFIRMER]. Le site ne les définit pas, et le même principe que l'or clair s'applique.
6. Typographie
Police
Usage
Graisses à embarquer
Fraunces
salutations, titres, grands chiffres
400, 500, 600, 700 + italiques 400, 500, 600
Manrope
tout le reste : corps, boutons, formulaires, tableaux
400, 500, 600, 700, 800
IBM Plex Mono
petits libellés techniques
500
Règles de la charte :
Fraunces : jamais sous 14 sp, jamais sur un bouton, un formulaire ou un tableau.
Manrope : police par défaut de toute l'app.
Les trois polices sont embarquées dans l'APK (licence SIL OFL). Une police par graisse et par style.
Fraunces sur le site est une police variable à axe de taille optique. Sur Android, on embarque des coupes statiques. [À CONFIRMER] : la coupe optique la plus proche du rendu du site, à valider à l'œil sur APK.
Tailles de texte : le site n'a pas d'échelle. Il utilise plus de 25 valeurs différentes (de 0,65 à 2,4 rem), dont les plus fréquentes sont 0,85 / 0,9 / 0,8 / 1 / 0,95 / 0,82 / 0,92 / 0,72 rem. La règle retenue : taille en sp = valeur du site en rem × 16, arrondie à l'entier le plus proche. Résultat, les tailles réellement utilisées : 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 26, 32, 38. Aucune taille hors de cette liste. Les rôles nommés (corps, légende, titre…) sont construits sur cette liste [À CONFIRMER].
Interligne du corps : 1,5 (comme le site).
Agrandissement de texte système : respecté, plafonné à 130 % pour ne pas casser les mises en page [À CONFIRMER].
7. Rayons
Token
Valeur
Petit
6 dp
Moyen
10 dp
Grand
16 dp
Plein (pilules, puces)
arrondi complet
Rond (avatars)
50 %
Moyen (cartes, champs) et grand (grandes cartes, feuilles) dominent le site. Éviter tout rayon hors liste. Le site contient 15 12px, 14 10px en dur, 8 20px et 8 14px : les ramener au moyen ou au grand (le 20px 20px 0 0 des feuilles du bas devient grand en haut).
8. Ombres
Token
Clair
Sombre
Petite
0 1 2, noir bleuté 5 %
0 1 2, noir 35 %
Carte
0 4 6 puis 0 2 4, noir bleuté 5 % et 3 %
0 8 24, noir 45 %
Survol / appui
0 10 15 puis 0 4 6, 8 % et 3 %
0 12 28, noir 55 %
Sur Android, l'ombre s'exprime par l'élévation. Valeurs de départ [À CONFIRMER sur appareil] :
Token
Clair
Sombre
Petite
1 dp
1 dp
Carte
2 dp
4 dp
Survol / appui
6 dp
8 dp
La couleur d'ombre n'est honorée qu'à partir d'Android 9 (API 28) ; en dessous (minSdk 24), l'ombre est grise. Elle doit rester discrète comme sur le site.
9. Verre dépoli

Clair
Sombre
Fond
blanc à 86 %
#0F172A à 78 %
Bordure
blanc à 55 %
#94A3B8 à 25 %
Ombre
0 8 24, #020617 à 45 %
idem
Flou
environ 10
environ 10
Sur Android 11 et moins, remplacer le flou par le fond semi-opaque seul, sans flou. Pour Android 12 et plus, le choix de la bibliothèque de flou est décidé à l'étape 2 (R-DEP-1), là où le verre apparaît d'abord (accueil membre).
10. Espacement
Token
Valeur
xs
4 dp
sm
8 dp
md
12 dp
lg
16 dp
xl
20 dp (marge latérale d'écran)
xxl
24 dp
xxxl
32 dp
Les valeurs du site entre deux paliers (0,85 rem, 1,15 rem…) sont arrondies au palier le plus proche.
Zone tactile : minimum 48 dp par élément cliquable (le site utilise 44 px sur 12 éléments). Le visuel peut rester à 44, la zone tactile s'étend à 48.
11. Icônes
Le site utilise ses propres jeux d'icônes SVG (Icons.jsx, NavIcons, RoomIcons, CommunityIcons), plus Font Awesome 6.4 dans 3 fichiers (27 occurrences).
L'app ne charge pas la police Font Awesome entière : chaque icône réellement utilisée devient une icône vectorielle du dossier icons/.
Les icônes suivent la couleur du texte du contexte. Aucune couleur en dur dans une icône.
12. Mouvement
Le site coupe toutes les animations quand « réduire les animations » est activé (réglage de l'espace membre). L'app honore à la fois ce réglage du site et le réglage d'accessibilité Android. Si l'un des deux est actif, aucune animation ni transition (durée quasi nulle).
13. Contrôle de fidélité
Identique à la v1.0, adapté :
Chaque fiche cite le .jsx et le .css du site, lus avant d'écrire.
Aucun littéral visuel dans features (R-DS-1).
Aucune valeur inventée ; une question est posée à la place.
Les 4 états existent et ressemblent à ceux du site (squelettes, messages FR repris tels quels).
Comparaison côte à côte : capture de l'app (clair et sombre) à côté de la capture du site en vue mobile, à partir de la première APK (fin d'étape 2).
Hiérarchie : or rare, Fraunces seulement en titre, Manrope partout ailleurs, rayons 6 / 10 / 16.
Accessibilité : le texte discret #94A3B8 sur fond clair a un contraste faible. Il ne porte jamais d'information essentielle.
14. Points qui restent à valider à l'œil (APK)
Or clair en sombre (§2) et fonds / bordures sémantiques en sombre (§5).
Coupe optique de Fraunces (§6).
Rôles nommés de la typographie et plafond de l'agrandissement du texte (§6).
Élévations (§8).
Bibliothèque de flou sur Android 12 et plus (§9), décidée à l'étape 2.
Aucun de ces points ne bloque l'étape 0 : les valeurs de départ sont dans le document, et on ajuste après la première APK.