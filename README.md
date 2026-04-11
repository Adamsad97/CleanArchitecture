# EcoEats - Portable Docker Setup

Cette configuration est portable: aucun alias local, aucun profile shell obligatoire.
Tout est dans le repo via `docker-compose.yml` + scripts npm racine.

## Prerequis

- Docker Desktop (ou Docker Engine + Compose v2)

## Commandes courtes (racine du projet)

```bash
npm run dev
npm run dev:front
npm run dev:back
npm run test
npm run down
```

Ces commandes utilisent le profil `postgres`.

## Commandes Docker directes (sans npm)

```bash
docker compose --profile postgres up --build
docker compose --profile postgres up --build frontend-postgres
docker compose --profile postgres up --build postgres backend-postgres
docker compose --profile postgres run --rm backend-postgres npm run test
docker compose --profile postgres down
```

## Profils BD disponibles

```bash
docker compose --profile memory up --build
docker compose --profile sqlite up --build
docker compose --profile postgres up --build
```

## URLs

- Frontend: http://localhost:5173
- Backend health: http://localhost:3002/health
- PostgreSQL (profil postgres): localhost:5433
