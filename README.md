# DSI Academy App

Application mobile Android React Native de DSI Academy.

## Structure

- `src/app` : application, providers et navigation.
- `src/core` : configuration, API, réseau, session, stockage, plateforme. Aucun design.
- `src/shared` : design system, i18n, outils de store et stores transverses.
- `src/features` : fonctionnalités par domaine, chacune organisée en `screens`, `components`, `store`.
- `src/assets` : polices et images.
- `docs` : architecture, plan, design tokens, contrats et fiches de livraison.
- `contracts` : fixtures JSON des réponses des Workers.
- `scripts` : génération de la configuration de compilation.

## Règle principale

Les écrans ne parlent jamais aux API : ils passent par les stores. Voir `docs/ARCHITECTURE.md`.

## État initial

Arborescence et fichiers de configuration. Le projet Android natif et les dépendances React Native sont initialisés à l'étape 0 du plan.