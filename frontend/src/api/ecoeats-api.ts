import { z as zod } from "zod";

const RestaurantSchema = zod.object({
  id: zod.string(),
  name: zod.string(),
  location: zod.object({ lat: zod.number(), lng: zod.number() }),
});
export type Restaurant = zod.infer<typeof RestaurantSchema>;

const MenuItemSchema = zod.object({
  id: zod.string(),
  restaurantId: zod.string(),
  name: zod.string(),
  description: zod.string(),
  priceCents: zod.number(),
  allergens: zod.array(zod.string()),
  dailyStock: zod.number(),
});
export type MenuItem = zod.infer<typeof MenuItemSchema>;

const CartSchema = zod.object({
  clientId: zod.string(),
  restaurantId: zod.string().nullable(),
  items: zod.array(
    zod.object({
      menuItemId: zod.string(),
      quantity: zod.number(),
      unitPriceCents: zod.number(),
    })
  ),
});
export type Cart = zod.infer<typeof CartSchema>;

const AuthRoleSchema = zod.enum(["CLIENT", "COURIER", "RESTAURANT"]);
export type AuthRole = zod.infer<typeof AuthRoleSchema>;

const AuthUserSchema = zod.object({
  id: zod.string(),
  fullName: zod.string(),
  email: zod.string().email(),
  role: AuthRoleSchema,
});
export type AuthUser = zod.infer<typeof AuthUserSchema>;

const AuthSessionSchema = zod.object({
  token: zod.string(),
  user: AuthUserSchema,
});
export type AuthSession = zod.infer<typeof AuthSessionSchema>;

export type ApiConfig = Readonly<{ baseUrl: string }>;

export class EcoEatsApi {
  constructor(private readonly config: ApiConfig) {}

  async listRestaurants(): Promise<Restaurant[]> {
    const response = await fetch(`${this.config.baseUrl}/restaurants`);
    const payload = await response.json();
    return zod.object({ restaurants: zod.array(RestaurantSchema) }).parse(payload).restaurants;
  }

  async listMenu(restaurantId: string): Promise<MenuItem[]> {
    const response = await fetch(`${this.config.baseUrl}/restaurants/${restaurantId}/menu`);
    const payload = await response.json();
    return zod.object({ items: zod.array(MenuItemSchema) }).parse(payload).items;
  }

  async getCart(clientId: string): Promise<Cart> {
    const response = await fetch(`${this.config.baseUrl}/cart?clientId=${encodeURIComponent(clientId)}`);
    const payload = await response.json();
    return zod.object({ cart: CartSchema }).parse(payload).cart;
  }

  async addToCart(params: { clientId: string; menuItemId: string; quantity: number }): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/cart/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!response.ok) throw await response.json();
  }

  async clearCart(clientId: string): Promise<void> {
    await fetch(`${this.config.baseUrl}/cart?clientId=${encodeURIComponent(clientId)}`, { method: "DELETE" });
  }

  async checkout(params: {
    clientId: string;
    deliveryAddress: { lat: number; lng: number };
    tipCents?: number;
  }): Promise<{ orderId: string; invoiceId: string }> {
    const response = await fetch(`${this.config.baseUrl}/checkout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params),
    });
    const payload = await response.json();
    if (!response.ok) throw payload;
    return zod.object({ orderId: zod.string(), invoiceId: zod.string() }).parse(payload);
  }

  async register(params: {
    firstName: string;
    lastName: string;
    birthDate: string;
    phone: string;
    email: string;
    password: string;
    accountType: "INDIVIDUAL" | "BUSINESS";
    actorRole: "CLIENT" | "COURIER" | "RESTAURANT";
  }): Promise<AuthSession> {
    const response = await fetch(`${this.config.baseUrl}/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params),
    });
    const payload = await response.json();
    if (!response.ok) throw payload;
    return AuthSessionSchema.parse(payload);
  }

  async login(params: { email: string; password: string }): Promise<AuthSession> {
    const response = await fetch(`${this.config.baseUrl}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params),
    });
    const payload = await response.json();
    if (!response.ok) throw payload;
    return AuthSessionSchema.parse(payload);
  }

  async upsertMenuItem(params: {
    id: string;
    restaurantId: string;
    name: string;
    description: string;
    priceCents: number;
    allergens: string[];
    dailyStock: number;
  }): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/restaurateur/menu-item`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) throw await response.json();
  }

  async deleteMenuItem(menuItemId: string): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/restaurateur/menu-item/${encodeURIComponent(menuItemId)}`, {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 204) throw await response.json();
  }
}

