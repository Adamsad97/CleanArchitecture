import {
  type AccountRepository,
  type CartRepository,
  type CourierRepository,
  type InvoiceRepository,
  type MenuRepository,
  type OrderRepository,
  type RestaurantRepository,
} from "../../../application/ports/repositories.js";
import { type Cart } from "../../../domain/entities/cart.js";
import { type Account } from "../../../domain/entities/account.js";
import { type Courier } from "../../../domain/entities/courier.js";
import { type Invoice, type Order } from "../../../domain/entities/order.js";
import { type MenuItem, type Restaurant } from "../../../domain/entities/restaurant.js";
import { type SqliteDb } from "./sqlite-db.js";

const parseJson = <T>(json: string): T => JSON.parse(json) as T;
const toJson = (value: unknown): string => JSON.stringify(value);

export function createSqliteRepositories(db: SqliteDb): Readonly<{
  accounts: AccountRepository;
  restaurants: RestaurantRepository;
  menus: MenuRepository;
  carts: CartRepository;
  orders: OrderRepository;
  invoices: InvoiceRepository;
  couriers: CourierRepository;
  seedIfEmpty(): void;
}> {
  const accounts: AccountRepository = {
    async getById(id: string): Promise<Account | null> {
      const row = db.get<{ account_json: string }>("SELECT account_json FROM accounts WHERE id=?", [id]);
      return row ? parseJson<Account>(row.account_json) : null;
    },
    async getByEmail(email: string): Promise<Account | null> {
      const normalizedEmail = email.trim().toLowerCase();
      const row = db.get<{ account_json: string }>("SELECT account_json FROM accounts WHERE email=?", [
        normalizedEmail,
      ]);
      return row ? parseJson<Account>(row.account_json) : null;
    },
    async create(account: Account): Promise<void> {
      db.run("INSERT INTO accounts(id, email, account_json) VALUES(?, ?, ?)", [
        account.id,
        account.email,
        toJson(account),
      ]);
      db.persist();
    },
  };

  const restaurants: RestaurantRepository = {
    async listRestaurants(): Promise<readonly Restaurant[]> {
      const rows = db.all<{ id: string; name: string; lat: number; lng: number }>(
        "SELECT id, name, lat, lng FROM restaurants"
      );
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        location: { lat: r.lat, lng: r.lng },
      }));
    },
    async getRestaurant(id: string): Promise<Restaurant | null> {
      const row = db.get<{ id: string; name: string; lat: number; lng: number }>(
        "SELECT id, name, lat, lng FROM restaurants WHERE id=?",
        [id]
      );
      if (!row) return null;
      return { id: row.id, name: row.name, location: { lat: row.lat, lng: row.lng } };
    },
  };

  const menus: MenuRepository = {
    async listMenuItems(restaurantId: string): Promise<readonly MenuItem[]> {
      const rows = db.all<any>(
        "SELECT id, restaurant_id, name, description, price_cents, allergens_json, daily_stock FROM menu_items WHERE restaurant_id=?",
        [restaurantId]
      );
      return rows.map((r) => ({
        id: r.id,
        restaurantId: r.restaurant_id,
        name: r.name,
        description: r.description,
        priceCents: r.price_cents,
        allergens: parseJson<string[]>(r.allergens_json),
        dailyStock: r.daily_stock,
      }));
    },
    async getMenuItem(id: string): Promise<MenuItem | null> {
      const r = db.get<any>(
        "SELECT id, restaurant_id, name, description, price_cents, allergens_json, daily_stock FROM menu_items WHERE id=?",
        [id]
      );
      if (!r) return null;
      return {
        id: r.id,
        restaurantId: r.restaurant_id,
        name: r.name,
        description: r.description,
        priceCents: r.price_cents,
        allergens: parseJson<string[]>(r.allergens_json),
        dailyStock: r.daily_stock,
      };
    },
    async upsertMenuItem(item: MenuItem): Promise<void> {
      db.run(
        `INSERT INTO menu_items(id, restaurant_id, name, description, price_cents, allergens_json, daily_stock)
         VALUES(?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           restaurant_id=excluded.restaurant_id,
           name=excluded.name,
           description=excluded.description,
           price_cents=excluded.price_cents,
           allergens_json=excluded.allergens_json,
           daily_stock=excluded.daily_stock`
        ,
        [
          item.id,
          item.restaurantId,
          item.name,
          item.description,
          item.priceCents,
          toJson(item.allergens),
          item.dailyStock,
        ]
      );
      db.persist();
    },
    async deleteMenuItem(id: string): Promise<void> {
      db.run("DELETE FROM menu_items WHERE id=?", [id]);
      db.persist();
    },
  };

  const carts: CartRepository = {
    async getCart(clientId: string): Promise<Cart> {
      const row = db.get<{ cart_json: string }>("SELECT cart_json FROM carts WHERE client_id=?", [
        clientId,
      ]);
      if (!row) {
        return { clientId, restaurantId: null, items: [] };
      }
      return parseJson<Cart>(row.cart_json);
    },
    async saveCart(cart: Cart): Promise<void> {
      db.run(
        `INSERT INTO carts(client_id, cart_json) VALUES(?, ?)
         ON CONFLICT(client_id) DO UPDATE SET cart_json=excluded.cart_json`
        ,
        [cart.clientId, toJson(cart)]
      );
      db.persist();
    },
    async clearCart(clientId: string): Promise<void> {
      const cart: Cart = { clientId, restaurantId: null, items: [] };
      await carts.saveCart(cart);
    },
  };

  const orders: OrderRepository = {
    async create(order: Order): Promise<void> {
      db.run("INSERT INTO orders(id, order_json) VALUES(?, ?)", [order.id, toJson(order)]);
      db.persist();
    },
    async get(id: string): Promise<Order | null> {
      const row = db.get<{ order_json: string }>("SELECT order_json FROM orders WHERE id=?", [id]);
      return row ? parseJson<Order>(row.order_json) : null;
    },
    async update(order: Order): Promise<void> {
      db.run("UPDATE orders SET order_json=? WHERE id=?", [toJson(order), order.id]);
      db.persist();
    },
    async listByRestaurant(restaurantId: string): Promise<readonly Order[]> {
      const rows = db.all<{ order_json: string }>("SELECT order_json FROM orders");
      return rows.map((r) => parseJson<Order>(r.order_json)).filter((o) => o.restaurantId === restaurantId);
    },
    async listReadyOrPreparing(): Promise<readonly Order[]> {
      const rows = db.all<{ order_json: string }>("SELECT order_json FROM orders");
      return rows
        .map((r) => parseJson<Order>(r.order_json))
        .filter((o) => o.status === "PREPARING" || o.status === "READY_FOR_PICKUP");
    },
  };

  const invoices: InvoiceRepository = {
    async create(invoice: Invoice): Promise<void> {
      db.run("INSERT INTO invoices(id, invoice_json) VALUES(?, ?)", [invoice.id, toJson(invoice)]);
      db.persist();
    },
    async get(id: string): Promise<Invoice | null> {
      const row = db.get<{ invoice_json: string }>("SELECT invoice_json FROM invoices WHERE id=?", [id]);
      return row ? parseJson<Invoice>(row.invoice_json) : null;
    },
  };

  const couriers: CourierRepository = {
    async get(id: string): Promise<Courier | null> {
      const row = db.get<{ courier_json: string }>("SELECT courier_json FROM couriers WHERE id=?", [id]);
      return row ? parseJson<Courier>(row.courier_json) : null;
    },
    async upsert(courier: Courier): Promise<void> {
      db.run(
        `INSERT INTO couriers(id, courier_json) VALUES(?, ?)
         ON CONFLICT(id) DO UPDATE SET courier_json=excluded.courier_json`
        ,
        [courier.id, toJson(courier)]
      );
      db.persist();
    },
    async listAvailable(): Promise<readonly Courier[]> {
      const rows = db.all<{ courier_json: string }>("SELECT courier_json FROM couriers");
      return rows.map((r) => parseJson<Courier>(r.courier_json)).filter((c) => c.status === "AVAILABLE");
    },
  };

  function seedIfEmpty(): void {
    const row = db.get<{ c: number }>("SELECT COUNT(*) as c FROM restaurants");
    const count = row?.c ?? 0;
    if (count > 0) return;

    db.run("INSERT INTO restaurants(id, name, lat, lng) VALUES(?, ?, ?, ?)", [
      "resto_paris_1",
      "Green Bowl Paris",
      48.8566,
      2.3522,
    ]);
    db.run("INSERT INTO restaurants(id, name, lat, lng) VALUES(?, ?, ?, ?)", [
      "resto_paris_2",
      "Veggie Pasta",
      48.8666,
      2.3333,
    ]);

    menus.upsertMenuItem({
      id: "item_1",
      restaurantId: "resto_paris_1",
      name: "Bowl quinoa-avocat",
      description: "Quinoa, avocat, légumes de saison",
      priceCents: 1290,
      allergens: ["sesame"],
      dailyStock: 20,
    });
    menus.upsertMenuItem({
      id: "item_2",
      restaurantId: "resto_paris_1",
      name: "Soupe miso",
      description: "Miso, tofu, algues",
      priceCents: 690,
      allergens: ["soy"],
      dailyStock: 30,
    });
    menus.upsertMenuItem({
      id: "item_3",
      restaurantId: "resto_paris_2",
      name: "Pasta arrabiata",
      description: "Tomate, ail, piment",
      priceCents: 1190,
      allergens: ["gluten"],
      dailyStock: 15,
    });

    couriers.upsert({
      id: "courier_1",
      displayName: "Sam",
      status: "AVAILABLE",
      level: "STANDARD",
      activeOrderIds: [],
      walletCents: 0,
    });
    couriers.upsert({
      id: "courier_2",
      displayName: "Lina",
      status: "AVAILABLE",
      level: "EXPERT",
      activeOrderIds: [],
      walletCents: 0,
    });
    db.persist();
  }

  return { accounts, restaurants, menus, carts, orders, invoices, couriers, seedIfEmpty };
}

