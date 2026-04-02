import initSqlJs from "sql.js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

export type SqliteDb = {
  exec(sql: string, params?: any[]): unknown;
  run(sql: string, params?: any[]): void;
  get<T>(sql: string, params?: any[]): T | undefined;
  all<T>(sql: string, params?: any[]): T[];
  persist(): void;
};

export async function openSqliteDb(filePath: string): Promise<SqliteDb> {
  const SQL = await initSqlJs();
  const fileExists = existsSync(filePath);
  const db = fileExists ? new SQL.Database(readFileSync(filePath)) : new SQL.Database();

  const wrapper: SqliteDb = {
    exec(sql: string) {
      return db.exec(sql);
    },
    run(sql: string, params?: any[]) {
      const stmt = db.prepare(sql);
      stmt.run(params ?? []);
      stmt.free();
    },
    get<T>(sql: string, params?: any[]) {
      const stmt = db.prepare(sql);
      stmt.bind(params ?? []);
      const row = stmt.step() ? (stmt.getAsObject() as any) : undefined;
      stmt.free();
      return row as T | undefined;
    },
    all<T>(sql: string, params?: any[]) {
      const stmt = db.prepare(sql);
      stmt.bind(params ?? []);
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as any);
      stmt.free();
      return rows;
    },
    persist() {
      const data = db.export();
      writeFileSync(filePath, Buffer.from(data));
    },
  };

  initSchema(wrapper);
  return wrapper;
}

function initSchema(db: SqliteDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      account_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      allergens_json TEXT NOT NULL,
      daily_stock INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS carts (
      client_id TEXT PRIMARY KEY,
      cart_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS couriers (
      id TEXT PRIMARY KEY,
      courier_json TEXT NOT NULL
    );
  `);
}

