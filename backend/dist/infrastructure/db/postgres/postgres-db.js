import { Pool } from "pg";
export async function openPostgresDb(connectionString) {
    const pool = new Pool({ connectionString });
    const postgresDatabase = {
        async query(sql, params) {
            const result = await pool.query(sql, params);
            return result.rows;
        },
        async close() {
            await pool.end();
        },
    };
    await initSchema(postgresDatabase);
    return postgresDatabase;
}
function fromJson(value) {
    if (typeof value === "string")
        return JSON.parse(value);
    return value;
}
async function initSchema(db) {
    await db.query(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      lat DOUBLE PRECISION NOT NULL,
      lng DOUBLE PRECISION NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      account_json JSONB NOT NULL
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
      allergens_json JSONB NOT NULL,
      daily_stock INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS carts (
      client_id TEXT PRIMARY KEY,
      cart_json JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      status TEXT NOT NULL,
      order_json JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_json JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS couriers (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      courier_json JSONB NOT NULL
    );
  `);
    await ensureLegacyAccountsSchema(db);
    await ensureLegacyProfileTables(db);
    await ensureLegacyMenuItemsSchema(db);
}
async function ensureLegacyAccountsSchema(db) {
    await db.query("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email TEXT");
    await db.query(`
    UPDATE accounts
    SET email = lower(account_json ->> 'email')
    WHERE email IS NULL OR email = ''
  `);
    await db.query("CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email)");
}
async function ensureLegacyProfileTables(db) {
    const accountRows = await db.query("SELECT id, account_json FROM accounts");
    for (const accountRow of accountRows) {
        const account = fromJson(accountRow.account_json);
        const profileTable = getProfileTableName(account.role);
        if (!profileTable)
            continue;
        const firstName = typeof account.firstName === "string" ? account.firstName : null;
        const lastName = typeof account.lastName === "string" ? account.lastName : null;
        const birthDate = typeof account.birthDate === "string" ? account.birthDate : null;
        const phone = typeof account.phone === "string" ? account.phone : null;
        const fullName = typeof account.fullName === "string" ? account.fullName : null;
        const createdAt = typeof account.createdAt === "string" ? account.createdAt : null;
        if (!firstName || !lastName || !birthDate || !phone || !fullName || !createdAt)
            continue;
        await db.query(`INSERT INTO ${profileTable}(account_id, first_name, last_name, birth_date, phone, full_name, created_at)
       VALUES($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT(account_id) DO NOTHING`, [accountRow.id, firstName, lastName, birthDate, phone, fullName, createdAt]);
    }
}
async function ensureLegacyMenuItemsSchema(db) {
    await db.query("ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url TEXT");
}
function getProfileTableName(role) {
    if (role === "CLIENT")
        return "client_profiles";
    if (role === "COURIER")
        return "courier_profiles";
    if (role === "RESTAURANT")
        return "restaurant_profiles";
    return null;
}
