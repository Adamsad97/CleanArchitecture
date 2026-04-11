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
  const sqliteLibrary = await initSqlJs();
  const sqliteFileExists = existsSync(filePath);
  const sqliteDatabase = sqliteFileExists
    ? new sqliteLibrary.Database(readFileSync(filePath))
    : new sqliteLibrary.Database();

  const wrapper: SqliteDb = {
    exec(sql: string) {
      return sqliteDatabase.exec(sql);
    },
    run(sql: string, params?: any[]) {
      const statement = sqliteDatabase.prepare(sql);
      statement.run(params ?? []);
      statement.free();
    },
    get<T>(sql: string, params?: any[]) {
      const statement = sqliteDatabase.prepare(sql);
      statement.bind(params ?? []);
      const resultRow = statement.step() ? (statement.getAsObject() as any) : undefined;
      statement.free();
      return resultRow as T | undefined;
    },
    all<T>(sql: string, params?: any[]) {
      const statement = sqliteDatabase.prepare(sql);
      statement.bind(params ?? []);
      const resultRows: T[] = [];
      while (statement.step()) resultRows.push(statement.getAsObject() as any);
      statement.free();
      return resultRows;
    },
    persist() {
      const exportedDatabaseBytes = sqliteDatabase.export();
      writeFileSync(filePath, Buffer.from(exportedDatabaseBytes));
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

    CREATE TABLE IF NOT EXISTS client_profiles (
      account_id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      phone TEXT NOT NULL,
      full_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS restaurant_profiles (
      account_id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      phone TEXT NOT NULL,
      full_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS courier_profiles (
      account_id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      phone TEXT NOT NULL,
      full_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      image_url TEXT,
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

  ensureLegacyAccountsSchema(db);
  ensureLegacyProfileTables(db);
  ensureLegacyMenuItemsSchema(db);
}

function ensureLegacyAccountsSchema(db: SqliteDb): void {
  const accountColumns = db.all<{ name: string }>("PRAGMA table_info(accounts)");
  const hasEmailColumn = accountColumns.some((column) => column.name === "email");

  if (!hasEmailColumn) {
    db.exec("ALTER TABLE accounts ADD COLUMN email TEXT");
  }

  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email)");

  const missingEmailRows = db.all<{ id: string; account_json: string }>(
    "SELECT id, account_json FROM accounts WHERE email IS NULL OR email = ''"
  );

  for (const accountRow of missingEmailRows) {
    try {
      const account = JSON.parse(accountRow.account_json) as { email?: unknown };
      if (typeof account.email !== "string") continue;
      const normalizedEmail = account.email.trim().toLowerCase();
      if (!normalizedEmail) continue;
      db.run("UPDATE accounts SET email=? WHERE id=?", [normalizedEmail, accountRow.id]);
    } catch {
      // Keep legacy row untouched if JSON is invalid.
    }
  }

  db.persist();
}

function ensureLegacyProfileTables(db: SqliteDb): void {
  const accounts = db.all<{
    id: string;
    account_json: string;
  }>("SELECT id, account_json FROM accounts");

  for (const accountRow of accounts) {
    try {
      const account = JSON.parse(accountRow.account_json) as {
        firstName?: unknown;
        lastName?: unknown;
        birthDate?: unknown;
        phone?: unknown;
        fullName?: unknown;
        createdAt?: unknown;
        role?: unknown;
      };

      const profileTable = getProfileTableName(account.role);
      if (!profileTable) continue;

      const firstName = typeof account.firstName === "string" ? account.firstName : null;
      const lastName = typeof account.lastName === "string" ? account.lastName : null;
      const birthDate = typeof account.birthDate === "string" ? account.birthDate : null;
      const phone = typeof account.phone === "string" ? account.phone : null;
      const fullName = typeof account.fullName === "string" ? account.fullName : null;
      const createdAt = typeof account.createdAt === "string" ? account.createdAt : null;

      if (!firstName || !lastName || !birthDate || !phone || !fullName || !createdAt) continue;

      db.run(
        `INSERT INTO ${profileTable}(account_id, first_name, last_name, birth_date, phone, full_name, created_at)
         VALUES(?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(account_id) DO NOTHING`,
        [accountRow.id, firstName, lastName, birthDate, phone, fullName, createdAt]
      );
    } catch {
      // Ignore legacy malformed rows.
    }
  }

  db.persist();
}

function ensureLegacyMenuItemsSchema(db: SqliteDb): void {
  const menuItemColumns = db.all<{ name: string }>("PRAGMA table_info(menu_items)");
  const hasImageUrlColumn = menuItemColumns.some((column) => column.name === "image_url");
  if (!hasImageUrlColumn) {
    db.exec("ALTER TABLE menu_items ADD COLUMN image_url TEXT");
    db.persist();
  }
}

function getProfileTableName(role: unknown): string | null {
  if (role === "CLIENT") return "client_profiles";
  if (role === "COURIER") return "courier_profiles";
  if (role === "RESTAURANT") return "restaurant_profiles";
  return null;
}

