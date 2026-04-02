import dotenv from "dotenv";

dotenv.config();

export type AppEnv = Readonly<{
  port: number;
  db: "memory" | "sqlite";
  sqlitePath: string;
}>;

export function readEnv(): AppEnv {
  const port = Number(process.env.PORT ?? "3001");
  const db = (process.env.DB ?? "memory") as AppEnv["db"];
  const sqlitePath = process.env.SQLITE_PATH ?? "./ecoeats.sqlite";

  return { port, db, sqlitePath };
}

