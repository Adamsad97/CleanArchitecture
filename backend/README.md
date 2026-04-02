# EcoEats Backend (Clean Architecture)

Projet pédagogique basé sur le document **EcoEats (2026)**.

## Objectif

- TypeScript
- Clean Architecture (Domain / Application / Interface / Infrastructure)
- Démontrer le _plug & play_
  - 2 frameworks HTTP: **Express** et **Fastify**
  - 2 adaptateurs DB: **InMemory** et **SQLite (sql.js)**

## Démarrage

Dans `backend/`:

```bash
npm install
```

Lancement du Back et du Front
Dans `backend/`:
npm run dev:backend

Dans `frontend/`:
npm run dev:frontend

### Express + InMemory

```bash
Dans `backend/`:
npm run dev:backend

Dans `frontend/`:
npm run dev:frontend

npm run dev:express
```

### Fastify + InMemory

```bash
npm run dev:fastify
```

### SQLite (sql.js)

Copie `.env.example` vers `.env` puis:

```bash
DB=sqlite SQLITE_PATH=./ecoeats.sqlite npm run dev:express
```

## Endpoints (démo)

- `GET /health`
- `GET /restaurants`
- `GET /restaurants/:id/menu`
- `GET /cart?clientId=...`
- `POST /cart/items`
- `DELETE /cart?clientId=...`
- `POST /checkout`
- `GET /invoices/:id`

### Restaurateur

- `POST /restaurateur/menu-item` (upsert)
- `DELETE /restaurateur/menu-item/:id`
- `POST /restaurateur/orders/:id/accept`
- `POST /restaurateur/orders/:id/refuse`
- `POST /restaurateur/orders/:id/ready`

### Livreur

- `POST /couriers/:id/status`
- `GET /couriers/proposals`
- `POST /couriers/:courierId/accept`
- `POST /couriers/:courierId/pickup`
- `POST /couriers/:courierId/deliver`
