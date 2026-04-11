import { type Cart } from "../../../domain/entities/cart.js";
import { type Account } from "../../../domain/entities/account.js";
import { type Courier } from "../../../domain/entities/courier.js";
import { type Invoice, type Order } from "../../../domain/entities/order.js";
import { type MenuItem, type Restaurant } from "../../../domain/entities/restaurant.js";

export type AccountProfile = Readonly<{
  accountId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  fullName: string;
  createdAt: string;
}>;

export type MemoryStore = {
  accounts: Map<string, Account>;
  clientProfiles: Map<string, AccountProfile>;
  restaurantProfiles: Map<string, AccountProfile>;
  courierProfiles: Map<string, AccountProfile>;
  restaurants: Map<string, Restaurant>;
  menuItems: Map<string, MenuItem>;
  carts: Map<string, Cart>;
  orders: Map<string, Order>;
  invoices: Map<string, Invoice>;
  couriers: Map<string, Courier>;
};

export function createMemoryStore(): MemoryStore {
  const accounts = new Map<string, Account>();
  const clientProfiles = new Map<string, AccountProfile>();
  const restaurantProfiles = new Map<string, AccountProfile>();
  const courierProfiles = new Map<string, AccountProfile>();
  const restaurants = new Map<string, Restaurant>();
  const menuItems = new Map<string, MenuItem>();
  const carts = new Map<string, Cart>();
  const orders = new Map<string, Order>();
  const invoices = new Map<string, Invoice>();
  const couriers = new Map<string, Courier>();

  return { accounts, clientProfiles, restaurantProfiles, courierProfiles, restaurants, menuItems, carts, orders, invoices, couriers };
}

