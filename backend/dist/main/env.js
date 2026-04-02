import dotenv from "dotenv";
dotenv.config();
export function readEnv() {
    const port = Number(process.env.PORT ?? "3001");
    const db = (process.env.DB ?? "memory");
    const sqlitePath = process.env.SQLITE_PATH ?? "./ecoeats.sqlite";
    return { port, db, sqlitePath };
}
