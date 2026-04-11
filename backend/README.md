# EcoEats Backend (Clean Architecture)

Projet pédagogique basé sur le document **EcoEats (2026)**.

## Objectif

- TypeScript
- Clean Architecture (Domain / Application / Interface / Infrastructure)
- Démontrer le _plug & play_
  - 2 frameworks HTTP: **Express** et **Fastify**
  - 3 adaptateurs DB: **InMemory**, **SQLite (sql.js)** et **PostgreSQL**

## Démarrage

Dans `backend/`:

```bash
npm install
```

### Full stack Docker (une commande par BD)

Depuis la racine du projet:

```bash
# Memory
docker compose --profile memory up --build

# SQLite
docker compose --profile sqlite up --build

# PostgreSQL
docker compose --profile postgres up --build
```

Acces (quel que soit le profil):

- Frontend: `http://localhost:5173`
- Backend (health): `http://localhost:3002/health`

Specifique PostgreSQL:

- PostgreSQL: `localhost:5433`

Pour arreter:

```bash
docker compose --profile <memory|sqlite|postgres> down
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
DATABASE=sqlite SQLITE_PATH=./ecoeats.sqlite npm run dev:express
```

### PostgreSQL

Copie `.env.example` vers `.env` puis:

```bash
DATABASE=postgres POSTGRES_URL=postgres://postgres:postgres@localhost:5433/ecoeats npm run dev:express
```

### PostgreSQL avec Docker (recommande)

Depuis `backend/`:

```bash
npm run db:up
npm run dev:express
```

Le service PostgreSQL est defini dans [docker-compose.yml](../docker-compose.yml).

Pour arreter:

```bash
npm run db:down
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

### Paiement

- `POST /payments/card/verify`
- `POST /payments/card/visa/verify`
- `POST /payments/card/mastercard/verify`
- `POST /payments/paypal/verify`
- `POST /payments/mobile-money/verify`
- `POST /payments/mobile-money/orange-money/verify`
- `POST /payments/mobile-money/wave/verify`
- `POST /payments/cash/verify`

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
