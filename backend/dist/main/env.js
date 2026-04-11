import dotenv from "dotenv";
import * as zod from "zod";
dotenv.config();
export function readEnv() {
    const selectedDatabaseProvider = process.env.DATABASE ?? process.env.DB ?? "sqlite";
    const environmentSchema = zod.object({
        PORT: zod.coerce.number().int().positive().default(3001),
        DATABASE: zod.enum(["memory", "sqlite", "postgres"]).default("sqlite"),
        SQLITE_PATH: zod.string().min(1).default("./ecoeats.sqlite"),
        POSTGRES_URL: zod
            .string()
            .startsWith("postgres://")
            .default("postgres://postgres:postgres@localhost:5432/ecoeats"),
    });
    const parsedEnvironment = environmentSchema.parse({
        ...process.env,
        DATABASE: selectedDatabaseProvider,
    });
    const serverPort = parsedEnvironment.PORT;
    const databaseProvider = parsedEnvironment.DATABASE;
    const sqliteDatabasePath = parsedEnvironment.SQLITE_PATH;
    const postgresConnectionUrl = parsedEnvironment.POSTGRES_URL;
    return {
        port: serverPort,
        database: databaseProvider,
        sqlitePath: sqliteDatabasePath,
        postgresUrl: postgresConnectionUrl,
    };
}
