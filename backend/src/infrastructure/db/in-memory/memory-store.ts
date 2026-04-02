import { type Cart } from "../../../domain/entities/cart.js";
import { type Account } from "../../../domain/entities/account.js";
import { type Courier } from "../../../domain/entities/courier.js";
import { type Invoice, type Order } from "../../../domain/entities/order.js";
import { type MenuItem, type Restaurant } from "../../../domain/entities/restaurant.js";

export type MemoryStore = {
  accounts: Map<string, Account>;
  restaurants: Map<string, Restaurant>;
  menuItems: Map<string, MenuItem>;
  carts: Map<string, Cart>;
  orders: Map<string, Order>;
  invoices: Map<string, Invoice>;
  couriers: Map<string, Courier>;
};

export function createMemoryStore(): MemoryStore {
  const accounts = new Map<string, Account>();
  const restaurants = new Map<string, Restaurant>();
  const menuItems = new Map<string, MenuItem>();
  const carts = new Map<string, Cart>();
  const orders = new Map<string, Order>();
  const invoices = new Map<string, Invoice>();
  const couriers = new Map<string, Courier>();

  const r1: Restaurant = {
    id: "resto_paris_1",
    name: "Green Bowl Paris",
    location: { lat: 48.8566, lng: 2.3522 },
  };
  const r2: Restaurant = {
    id: "resto_paris_2",
    name: "Veggie Pasta",
    location: { lat: 48.8666, lng: 2.3333 },
  };
  restaurants.set(r1.id, r1);
  restaurants.set(r2.id, r2);

  const m1: MenuItem = {
    id: "item_1",
    restaurantId: r1.id,
    name: "Bowl quinoa-avocat",
    description: "Quinoa, avocat, légumes de saison",
    priceCents: 1290,
    allergens: ["sesame"],
    dailyStock: 20,
  };
  const m2: MenuItem = {
    id: "item_2",
    restaurantId: r1.id,
    name: "Soupe miso",
    description: "Miso, tofu, algues",
    priceCents: 690,
    allergens: ["soy"],
    dailyStock: 30,
  };
  const m3: MenuItem = {
    id: "item_3",
    restaurantId: r2.id,
    name: "Pasta arrabiata",
    description: "Tomate, ail, piment",
    priceCents: 1190,
    allergens: ["gluten"],
    dailyStock: 15,
  };
  for (const m of [m1, m2, m3]) menuItems.set(m.id, m);

  const c1: Courier = {
    id: "courier_1",
    displayName: "Sam",
    status: "AVAILABLE",
    level: "STANDARD",
    activeOrderIds: [],
    walletCents: 0,
  };
  const c2: Courier = {
    id: "courier_2",
    displayName: "Lina",
    status: "AVAILABLE",
    level: "EXPERT",
    activeOrderIds: [],
    walletCents: 0,
  };
  couriers.set(c1.id, c1);
  couriers.set(c2.id, c2);

  return { accounts, restaurants, menuItems, carts, orders, invoices, couriers };
}

