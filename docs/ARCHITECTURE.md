# Architecture

- `src/core` contient les fondations indépendantes des fonctionnalités.
- `src/services` contient les clients API, types et mappers.
- `src/features` contient les fonctionnalités de l’application.
- `src/shared` contient les éléments transversaux.
- Les URL de services doivent être centralisées dans
  `src/core/config/serviceRegistry.ts`.
- Aucun composant de fonctionnalité ne doit contenir de littéral visuel
  lorsqu’un composant du design system est disponible.
