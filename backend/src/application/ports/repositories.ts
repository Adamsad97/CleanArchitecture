import { type Cart } from "../../domain/entities/cart.js";
import { type Account } from "../../domain/entities/account.js";
import { type Courier } from "../../domain/entities/courier.js";
import { type Invoice, type Order, type OrderId } from "../../domain/entities/order.js";
import {
  type MenuItem,
  type MenuItemId,
  type Restaurant,
  type RestaurantId,
} from "../../domain/entities/restaurant.js";

export type RestaurantRepository = {
  listRestaurants(): Promise<readonly Restaurant[]>;
  getRestaurant(id: RestaurantId): Promise<Restaurant | null>;
};

export type MenuRepository = {
  listMenuItems(restaurantId: RestaurantId): Promise<readonly MenuItem[]>;
  getMenuItem(id: MenuItemId): Promise<MenuItem | null>;
  upsertMenuItem(item: MenuItem): Promise<void>;
  deleteMenuItem(id: MenuItemId): Promise<void>;
};

export type CartRepository = {
  getCart(clientId: string): Promise<Cart>;
  saveCart(cart: Cart): Promise<void>;
  clearCart(clientId: string): Promise<void>;
};

export type OrderRepository = {
  create(order: Order): Promise<void>;
  get(id: OrderId): Promise<Order | null>;
  update(order: Order): Promise<void>;
  listByRestaurant(restaurantId: RestaurantId): Promise<readonly Order[]>;
  listReadyOrPreparing(): Promise<readonly Order[]>;
};

export type InvoiceRepository = {
  create(invoice: Invoice): Promise<void>;
  get(id: string): Promise<Invoice | null>;
};

export type CourierRepository = {
  get(id: string): Promise<Courier | null>;
  upsert(courier: Courier): Promise<void>;
  listAvailable(): Promise<readonly Courier[]>;
};

export type AccountRepository = {
  getById(id: string): Promise<Account | null>;
  getByEmail(email: string): Promise<Account | null>;
  create(account: Account): Promise<void>;
};

