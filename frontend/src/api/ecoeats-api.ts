import { z as zod } from "zod";
import {
  FULFILLMENT_TYPE_DELIVERY,
  FULFILLMENT_TYPE_VALUES,
  PAYMENT_METHOD_VALUES,
} from "../payment/types";
import {
  COURIER_STATUS_VALUES,
  ORDER_STATUS_VALUES,
} from "../constants/domain-status";
import type {
  CardProvider,
  FulfillmentType,
  PaymentMethod,
  PaymentVerificationInput,
  WalletProvider,
} from "../payment/types";
import { resolvePaymentVerificationPath } from "../payment/payment-api";
export type {
  CardProvider,
  FulfillmentType,
  PaymentMethod,
  PaymentVerificationInput,
  WalletProvider,
} from "../payment/types";

const HTTP_HEADER_CONTENT_TYPE = "content-type";
const HTTP_CONTENT_TYPE_JSON = "application/json";

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
  imageUrl: zod.string().nullable(),
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

const AccountProfileSchema = zod.object({
  accountId: zod.string(),
  firstName: zod.string(),
  lastName: zod.string(),
  birthDate: zod.string(),
  phone: zod.string(),
  fullName: zod.string(),
  createdAt: zod.string(),
});
export type AccountProfile = zod.infer<typeof AccountProfileSchema>;

const AccountProfilePayloadSchema = zod.object({
  accountId: zod.string(),
  role: AuthRoleSchema,
  profile: AccountProfileSchema,
});
export type AccountProfilePayload = zod.infer<typeof AccountProfilePayloadSchema>;

const CourierStatusSchema = zod.enum(COURIER_STATUS_VALUES);
export type CourierStatus = zod.infer<typeof CourierStatusSchema>;

const PaymentVerificationResponseSchema = zod.object({
  ok: zod.literal(true),
  method: zod.enum(PAYMENT_METHOD_VALUES as [PaymentMethod, ...PaymentMethod[]]),
  provider: zod.string(),
  reference: zod.string(),
  message: zod.string(),
});
export type PaymentVerificationResponse = zod.infer<typeof PaymentVerificationResponseSchema>;

const CourierOrderSchema = zod.object({
  id: zod.string(),
  clientId: zod.string(),
  restaurantId: zod.string(),
  fulfillmentType: zod
    .enum(FULFILLMENT_TYPE_VALUES as [FulfillmentType, ...FulfillmentType[]])
    .optional()
    .default(FULFILLMENT_TYPE_DELIVERY),
  deliveryAddress: zod.object({ lat: zod.number(), lng: zod.number() }),
  status: zod.enum(ORDER_STATUS_VALUES),
  lines: zod.array(
    zod.object({
      menuItemId: zod.string(),
      name: zod.string(),
      unitPriceCents: zod.number(),
      quantity: zod.number(),
    })
  ),
  prepTimeMinutes: zod.number().nullable(),
  deliveryFeeCents: zod.number(),
  serviceFeeCents: zod.number(),
  itemsTotalCents: zod.number(),
  totalCents: zod.number(),
  tipCents: zod.number(),
  invoiceId: zod.string().nullable(),
  courierId: zod.string().nullable(),
});
export type CourierOrder = zod.infer<typeof CourierOrderSchema>;
export type OrderStatus = CourierOrder["status"];

const InvoiceSchema = zod.object({
  id: zod.string(),
  orderId: zod.string(),
  createdAt: zod.string(),
  lines: zod.array(
    zod.object({
      label: zod.string(),
      amountCents: zod.number(),
    })
  ),
  totalCents: zod.number(),
});
export type Invoice = zod.infer<typeof InvoiceSchema>;

export type ApiConfig = Readonly<{ baseUrl: string }>;

export type ApiError = Readonly<{
  status: number;
  code: string;
  message: string;
}>;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}

function makeUrl(baseUrl: string, path: string): string {
  return `${trimTrailingSlash(baseUrl)}${path}`;
}

function withFallbackBaseUrls(baseUrl: string): string[] {
  const base = trimTrailingSlash(baseUrl);
  const values = [base];

  if (base === "/api") {
    values.push("http://localhost:3002");
  }

  if (base === "http://localhost:3002") {
    values.push("/api");
  }

  return [...new Set(values)];
}

async function fetchApi(config: ApiConfig, path: string, init?: RequestInit): Promise<Response> {
  const baseUrls = withFallbackBaseUrls(config.baseUrl);
  let lastError: unknown;

  for (const baseUrl of baseUrls) {
    const url = makeUrl(baseUrl, path);
    try {
      return await fetch(url, init);
    } catch (error: unknown) {
      lastError = error;
    }
  }

  throw {
    status: 0,
    code: "NETWORK_ERROR",
    message: `Impossible de joindre l'API. Verifiez le backend (${baseUrls.join(" ou ")}).`,
    cause: lastError,
  };
}

async function readPayload(response: Response): Promise<unknown | null> {
  const raw = await response.text();
  if (!raw.trim()) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return { message: raw };
  }
}

function toApiError(response: Response, payload: unknown): ApiError {
  if (payload && typeof payload === "object") {
    const candidate = payload as { code?: unknown; message?: unknown };
    const code = typeof candidate.code === "string" ? candidate.code : "HTTP_ERROR";
    const message =
      typeof candidate.message === "string"
        ? candidate.message
        : `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
    return { status: response.status, code, message };
  }

  return {
    status: response.status,
    code: "HTTP_ERROR",
    message: `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`,
  };
}

function expectPayload(response: Response, payload: unknown | null): unknown {
  if (payload !== null) return payload;

  throw {
    status: response.status,
    code: "EMPTY_RESPONSE",
    message: "Le serveur a renvoye une reponse vide.",
  } satisfies ApiError;
}

export class EcoEatsApi {
  constructor(private readonly config: ApiConfig) {}

  async listRestaurants(): Promise<Restaurant[]> {
    const response = await fetchApi(this.config, "/restaurants");
    const payload = await readPayload(response);
    if (!response.ok) throw toApiError(response, payload);
    return zod.object({ restaurants: zod.array(RestaurantSchema) }).parse(expectPayload(response, payload)).restaurants;
  }

  async listMenu(restaurantId: string): Promise<MenuItem[]> {
    const response = await fetchApi(this.config, `/restaurants/${restaurantId}/menu`);
    const payload = await readPayload(response);
    if (!response.ok) throw toApiError(response, payload);
    return zod.object({ items: zod.array(MenuItemSchema) }).parse(expectPayload(response, payload)).items;
  }

  async getCart(clientId: string): Promise<Cart> {
    const response = await fetchApi(this.config, `/cart?clientId=${encodeURIComponent(clientId)}`);
    const payload = await readPayload(response);
    if (!response.ok) throw toApiError(response, payload);
    return zod.object({ cart: CartSchema }).parse(expectPayload(response, payload)).cart;
  }

  async addToCart(params: { clientId: string; menuItemId: string; quantity: number }): Promise<void> {
    const response = await fetchApi(this.config, "/cart/items", {
      method: "POST",
      headers: { [HTTP_HEADER_CONTENT_TYPE]: HTTP_CONTENT_TYPE_JSON },
      body: JSON.stringify(params),
    });
    const payload = await readPayload(response);
    if (!response.ok) throw toApiError(response, payload);
  }

  async clearCart(clientId: string): Promise<void> {
    const response = await fetchApi(this.config, `/cart?clientId=${encodeURIComponent(clientId)}`, {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 204) {
      const payload = await readPayload(response);
      throw toApiError(response, payload);
    }
  }

  async checkout(params: {
    clientId: string;
    deliveryAddress: { lat: number; lng: number };
    fulfillmentType?: FulfillmentType;
    paymentMethod?: PaymentMethod;
    tipCents?: number;
  }): Promise<{ orderId: string; invoiceId: string }> {
    const response = await fetchApi(this.config, "/checkout", {
      method: "POST",
      headers: { [HTTP_HEADER_CONTENT_TYPE]: HTTP_CONTENT_TYPE_JSON },
      body: JSON.stringify(params),
    });
    const payload = await readPayload(response);
    if (!response.ok) throw toApiError(response, payload);
    return zod.object({ orderId: zod.string(), invoiceId: zod.string() }).parse(expectPayload(response, payload));
  }

  async verifyPayment(params: PaymentVerificationInput): Promise<PaymentVerificationResponse> {
    const endpoint = resolvePaymentVerificationPath(params);

    const response = await fetchApi(this.config, endpoint, {
      method: "POST",
      headers: { [HTTP_HEADER_CONTENT_TYPE]: HTTP_CONTENT_TYPE_JSON },
      body: JSON.stringify(params),
    });
    const payload = await readPayload(response);
    if (!response.ok) throw toApiError(response, payload);
    return PaymentVerificationResponseSchema.parse(expectPayload(response, payload));
  }

  async getOrder(orderId: string, clientId?: string): Promise<CourierOrder> {
    const clientIdQuery = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
    const response = await fetchApi(this.config, `/orders/${encodeURIComponent(orderId)}${clientIdQuery}`);
    const payload = await readPayload(response);
    if (!response.ok) throw toApiError(response, payload);
    return zod.object({ order: CourierOrderSchema }).parse(expectPayload(response, payload)).order;
  }

  async getInvoice(invoiceId: string): Promise<Invoice> {
    const response = await fetchApi(this.config, `/invoices/${encodeURIComponent(invoiceId)}`);
    const payload = await readPayload(response);
    if (!response.ok) throw toApiError(response, payload);
    return zod.object({ invoice: InvoiceSchema }).parse(expectPayload(response, payload)).invoice;
  }

  async register(params: {
    firstName: string;
    lastName: string;
    restaurantName?: string | undefined;
    birthDate: string;
    phone: string;
    email: string;
    password: string;
    accountType: "INDIVIDUAL" | "BUSINESS";
    actorRole: "CLIENT" | "COURIER" | "RESTAURANT";
  }): Promise<AuthSession> {
    const response = await fetchApi(this.config, "/auth/register", {
      method: "POST",
      headers: { [HTTP_HEADER_CONTENT_TYPE]: HTTP_CONTENT_TYPE_JSON },
      body: JSON.stringify(params),
    });
    const payload = await readPayload(response);
    if (!response.ok) throw toApiError(response, payload);
    return AuthSessionSchema.parse(expectPayload(response, payload));
  }

  async login(params: { email: string; password: string }): Promise<AuthSession> {
    const response = await fetchApi(this.config, "/auth/login", {
      method: "POST",
      headers: { [HTTP_HEADER_CONTENT_TYPE]: HTTP_CONTENT_TYPE_JSON },
      body: JSON.stringify(params),
    });
    const payload = await readPayload(response);
    if (!response.ok) throw toApiError(response, payload);
    return AuthSessionSchema.parse(expectPayload(response, payload));
  }

  async getAccountProfile(accountId: string): Promise<AccountProfilePayload> {
    const response = await fetchApi(this.config, `/accounts/${encodeURIComponent(accountId)}/profile`);
    const payload = await readPayload(response);
    if (!response.ok) throw toApiError(response, payload);
    return AccountProfilePayloadSchema.parse(expectPayload(response, payload));
  }

  async upsertMenuItem(params: {
    id: string;
    restaurantId: string;
    name: string;
    description: string;
    priceCents: number;
    imageUrl: string | null;
    allergens: string[];
    dailyStock: number;
  }): Promise<void> {
    const response = await fetchApi(this.config, "/restaurateur/menu-item", {
      method: "POST",
      headers: { [HTTP_HEADER_CONTENT_TYPE]: HTTP_CONTENT_TYPE_JSON },
      body: JSON.stringify(params),
    });

    const payload = await readPayload(response);
    if (!response.ok) throw toApiError(response, payload);
  }

  async deleteMenuItem(menuItemId: string): Promise<void> {
    const response = await fetchApi(this.config, `/restaurateur/menu-item/${encodeURIComponent(menuItemId)}`, {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 204) {
      const payload = await readPayload(response);
      throw toApiError(response, payload);
    }
  }

  async acceptRestaurantOrder(params: { orderId: string; prepTimeMinutes: number }): Promise<void> {
    const response = await fetchApi(
      this.config,
      `/restaurateur/orders/${encodeURIComponent(params.orderId)}/accept`,
      {
        method: "POST",
        headers: { [HTTP_HEADER_CONTENT_TYPE]: HTTP_CONTENT_TYPE_JSON },
        body: JSON.stringify({ prepTimeMinutes: params.prepTimeMinutes }),
      }
    );
    const payload = await readPayload(response);
    if (!response.ok) throw toApiError(response, payload);
  }

  async refuseRestaurantOrder(orderId: string): Promise<void> {
    const response = await fetchApi(
      this.config,
      `/restaurateur/orders/${encodeURIComponent(orderId)}/refuse`,
      {
        method: "POST",
      }
    );
    const payload = await readPayload(response);
    if (!response.ok) throw toApiError(response, payload);
  }

  async markRestaurantOrderReady(orderId: string): Promise<void> {
    const response = await fetchApi(
      this.config,
      `/restaurateur/orders/${encodeURIComponent(orderId)}/ready`,
      {
        method: "POST",
      }
    );
    const payload = await readPayload(response);
    if (!response.ok) throw toApiError(response, payload);
  }

  async listRestaurantOperationsOrders(): Promise<CourierOrder[]> {
    const response = await fetchApi(this.config, "/couriers/proposals");
    const payload = await readPayload(response);
    if (!response.ok) throw toApiError(response, payload);
    return zod
      .object({ orders: zod.array(CourierOrderSchema) })
      .parse(expectPayload(response, payload)).orders;
  }

  async listCourierProposals(): Promise<CourierOrder[]> {
    const response = await fetchApi(this.config, "/couriers/proposals");
    const payload = await readPayload(response);
    if (!response.ok) throw toApiError(response, payload);
    return zod
      .object({ orders: zod.array(CourierOrderSchema) })
      .parse(expectPayload(response, payload)).orders;
  }

  async setCourierStatus(params: { courierId: string; status: CourierStatus }): Promise<void> {
    const response = await fetchApi(this.config, `/couriers/${encodeURIComponent(params.courierId)}/status`, {
      method: "POST",
      headers: { [HTTP_HEADER_CONTENT_TYPE]: HTTP_CONTENT_TYPE_JSON },
      body: JSON.stringify({ status: params.status }),
    });
    const payload = await readPayload(response);
    if (!response.ok) throw toApiError(response, payload);
  }

  async acceptCourierDelivery(params: { courierId: string; orderId: string }): Promise<void> {
    const response = await fetchApi(this.config, `/couriers/${encodeURIComponent(params.courierId)}/accept`, {
      method: "POST",
      headers: { [HTTP_HEADER_CONTENT_TYPE]: HTTP_CONTENT_TYPE_JSON },
      body: JSON.stringify({ orderId: params.orderId }),
    });
    const payload = await readPayload(response);
    if (!response.ok) throw toApiError(response, payload);
  }

  async pickUpCourierOrder(params: { courierId: string; orderId: string }): Promise<void> {
    const response = await fetchApi(this.config, `/couriers/${encodeURIComponent(params.courierId)}/pickup`, {
      method: "POST",
      headers: { [HTTP_HEADER_CONTENT_TYPE]: HTTP_CONTENT_TYPE_JSON },
      body: JSON.stringify({ orderId: params.orderId }),
    });
    const payload = await readPayload(response);
    if (!response.ok) throw toApiError(response, payload);
  }

  async completeCourierDelivery(params: {
    courierId: string;
    orderId: string;
  }): Promise<{ creditedCents: number }> {
    const response = await fetchApi(this.config, `/couriers/${encodeURIComponent(params.courierId)}/deliver`, {
      method: "POST",
      headers: { [HTTP_HEADER_CONTENT_TYPE]: HTTP_CONTENT_TYPE_JSON },
      body: JSON.stringify({ orderId: params.orderId }),
    });
    const payload = await readPayload(response);
    if (!response.ok) throw toApiError(response, payload);
    return zod.object({ creditedCents: zod.number() }).parse(expectPayload(response, payload));
  }
}

