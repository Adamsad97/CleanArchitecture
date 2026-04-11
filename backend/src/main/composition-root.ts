import { createMemoryStore } from "../infrastructure/db/in-memory/memory-store.js";
import { createInMemoryRepositories } from "../infrastructure/db/in-memory/repositories.js";
import { openSqliteDb } from "../infrastructure/db/sqlite/sqlite-db.js";
import { createSqliteRepositories } from "../infrastructure/db/sqlite/repositories.js";
import { openPostgresDb } from "../infrastructure/db/postgres/postgres-db.js";
import { createPostgresRepositories } from "../infrastructure/db/postgres/repositories.js";
import { services } from "../infrastructure/services/services.js";
import { type AppEnv } from "./env.js";

const DEFAULT_PRICING_POLICY = {
  serviceFeeRate: 0.1,
  deliveryBaseFeeCents: 200,
  deliveryPerKmCents: 120,
} as const;

const DEFAULT_COURIER_REVENUE_POLICY = {
  pickupFeeCents: 250,
  perKmCents: 90,
} as const;

export type AppDeps = Awaited<ReturnType<typeof createAppDeps>>;

export async function createAppDeps(env: AppEnv) {
  const ids = services.ids();
  const clock = services.clock();
  const payments = services.payment();
  const distance = services.distance();

  if (env.database === "sqlite") {
    const sqliteDatabase = await openSqliteDb(env.sqlitePath);
    const sqliteRepositories = createSqliteRepositories(sqliteDatabase);
    await sqliteRepositories.seedIfEmpty();
    return {
      ...sqliteRepositories,
      ids,
      clock,
      payments,
      distance,
      pricing: DEFAULT_PRICING_POLICY,
      revenue: DEFAULT_COURIER_REVENUE_POLICY,
    } as const;
  }

  if (env.database === "postgres") {
    const postgresDatabase = await openPostgresDb(env.postgresUrl);
    const postgresRepositories = createPostgresRepositories(postgresDatabase);
    await postgresRepositories.seedIfEmpty();
    return {
      ...postgresRepositories,
      ids,
      clock,
      payments,
      distance,
      pricing: DEFAULT_PRICING_POLICY,
      revenue: DEFAULT_COURIER_REVENUE_POLICY,
    } as const;
  }

  const inMemoryStore = createMemoryStore();
  const inMemoryRepositories = createInMemoryRepositories(inMemoryStore);
  return {
    ...inMemoryRepositories,
    ids,
    clock,
    payments,
    distance,
    pricing: DEFAULT_PRICING_POLICY,
    revenue: DEFAULT_COURIER_REVENUE_POLICY,
  } as const;
}

