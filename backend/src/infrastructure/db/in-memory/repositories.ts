import { type Cart } from "../../../domain/entities/cart.js";
import { type Account } from "../../../domain/entities/account.js";
import { type Courier } from "../../../domain/entities/courier.js";
import { type Invoice, type Order } from "../../../domain/entities/order.js";
import { type MenuItem, type Restaurant } from "../../../domain/entities/restaurant.js";
import {
  type CartRepository,
  type AccountRepository,
  type CourierRepository,
  type InvoiceRepository,
  type MenuRepository,
  type OrderRepository,
  type RestaurantRepository,
} from "../../../application/ports/repositories.js";
import { type MemoryStore } from "./memory-store.js";

export function createInMemoryRepositories(store: MemoryStore): Readonly<{
  accounts: AccountRepository;
  restaurants: RestaurantRepository;
  menus: MenuRepository;
  carts: CartRepository;
  orders: OrderRepository;
  invoices: InvoiceRepository;
  couriers: CourierRepository;
}> {
  const accounts: AccountRepository = {
    async getById(id: string): Promise<Account | null> {
      return store.accounts.get(id) ?? null;
    },
    async getByEmail(email: string): Promise<Account | null> {
      const normalizedEmail = email.trim().toLowerCase();
      for (const account of store.accounts.values()) {
        if (account.email === normalizedEmail) return account;
      }
      return null;
    },
    async create(account: Account): Promise<void> {
      store.accounts.set(account.id, account);
    },
  };

  const restaurants: RestaurantRepository = {
    async listRestaurants(): Promise<readonly Restaurant[]> {
      return [...store.restaurants.values()];
    },
    async getRestaurant(id: string): Promise<Restaurant | null> {
      return store.restaurants.get(id) ?? null;
    },
  };

  const menus: MenuRepository = {
    async listMenuItems(restaurantId: string): Promise<readonly MenuItem[]> {
      return [...store.menuItems.values()].filter((m) => m.restaurantId === restaurantId);
    },
    async getMenuItem(id: string): Promise<MenuItem | null> {
      return store.menuItems.get(id) ?? null;
    },
    async upsertMenuItem(item: MenuItem): Promise<void> {
      store.menuItems.set(item.id, item);
    },
    async deleteMenuItem(id: string): Promise<void> {
      store.menuItems.delete(id);
    },
  };

  const carts: CartRepository = {
    async getCart(clientId: string): Promise<Cart> {
      return (
        store.carts.get(clientId) ?? {
          clientId,
          restaurantId: null,
          items: [],
        }
      );
    },
    async saveCart(cart: Cart): Promise<void> {
      store.carts.set(cart.clientId, cart);
    },
    async clearCart(clientId: string): Promise<void> {
      store.carts.set(clientId, { clientId, restaurantId: null, items: [] });
    },
  };

  const orders: OrderRepository = {
    async create(order: Order): Promise<void> {
      store.orders.set(order.id, order);
    },
    async get(id: string): Promise<Order | null> {
      return store.orders.get(id) ?? null;
    },
    async update(order: Order): Promise<void> {
      store.orders.set(order.id, order);
    },
    async listByRestaurant(restaurantId: string): Promise<readonly Order[]> {
      return [...store.orders.values()].filter((o) => o.restaurantId === restaurantId);
    },
    async listReadyOrPreparing(): Promise<readonly Order[]> {
      return [...store.orders.values()].filter(
        (o) => o.status === "PREPARING" || o.status === "READY_FOR_PICKUP"
      );
    },
  };

  const invoices: InvoiceRepository = {
    async create(invoice: Invoice): Promise<void> {
      store.invoices.set(invoice.id, invoice);
    },
    async get(id: string): Promise<Invoice | null> {
      return store.invoices.get(id) ?? null;
    },
  };

  const couriers: CourierRepository = {
    async get(id: string): Promise<Courier | null> {
      return store.couriers.get(id) ?? null;
    },
    async upsert(courier: Courier): Promise<void> {
      store.couriers.set(courier.id, courier);
    },
    async listAvailable(): Promise<readonly Courier[]> {
      return [...store.couriers.values()].filter((c) => c.status === "AVAILABLE");
    },
  };

  return { accounts, restaurants, menus, carts, orders, invoices, couriers };
}

