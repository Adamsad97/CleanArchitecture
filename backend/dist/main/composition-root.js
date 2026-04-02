import { createMemoryStore } from "../infrastructure/db/in-memory/memory-store.js";
import { createInMemoryRepositories } from "../infrastructure/db/in-memory/repositories.js";
import { openSqliteDb } from "../infrastructure/db/sqlite/sqlite-db.js";
import { createSqliteRepositories } from "../infrastructure/db/sqlite/repositories.js";
import { services } from "../infrastructure/services/services.js";
export async function createAppDeps(env) {
    const ids = services.ids();
    const clock = services.clock();
    const payments = services.payment();
    const distance = services.distance();
    if (env.db === "sqlite") {
        const db = await openSqliteDb(env.sqlitePath);
        const repos = createSqliteRepositories(db);
        repos.seedIfEmpty();
        return {
            ...repos,
            ids,
            clock,
            payments,
            distance,
            pricing: {
                serviceFeeRate: 0.1,
                deliveryBaseFeeCents: 200,
                deliveryPerKmCents: 120,
            },
            revenue: {
                pickupFeeCents: 250,
                perKmCents: 90,
            },
        };
    }
    const store = createMemoryStore();
    const repos = createInMemoryRepositories(store);
    return {
        ...repos,
        ids,
        clock,
        payments,
        distance,
        pricing: {
            serviceFeeRate: 0.1,
            deliveryBaseFeeCents: 200,
            deliveryPerKmCents: 120,
        },
        revenue: {
            pickupFeeCents: 250,
            perKmCents: 90,
        },
    };
}
