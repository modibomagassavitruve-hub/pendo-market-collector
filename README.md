# pendo-market-collector

Collecteur des indices boursiers africains pour [PENDO](https://pendo-frontend.vercel.app).

Un workflow GitHub Actions s'exécute toutes les 15 minutes pendant les heures d'ouverture
(7h-17h UTC, du lundi au vendredi) et une fois à la clôture. Il récupère les indices puis
les envoie au backend PENDO, qui les valide avant de les enregistrer.

| Source | Indices |
|---|---|
| AFX Kwayisi | JSE, NGX, BRVM, NSE Kenya, GSE, BSE, LuSE, ZSE, USE, MSE |
| Investing.com (Yahoo Finance en secours) | EGX 30, MASI, TUNINDEX, SEMDEX |

DSEI (Tanzanie) et ALSI (Rwanda) sont collectés directement par le backend.

**Sécurité :** ce dépôt ne contient aucun secret et n'a pas accès à la base de données.
Le seul secret, `PENDO_CRON_SECRET`, est stocké dans les secrets GitHub du dépôt.

```bash
node collect.mjs --dry-run   # tester la collecte sans rien envoyer
```

© Modibo Magassa — tous droits réservés.
