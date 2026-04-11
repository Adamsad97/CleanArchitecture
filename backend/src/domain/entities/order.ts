import { type LatLng } from "../value-objects/geo.js";
import { type RestaurantId } from "./restaurant.js";

export type OrderId = string;

export type OrderStatus =
  | "CREATED"
  | "PAID"
  | "RESTAURANT_ACCEPTED"
  | "RESTAURANT_REFUSED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "DELIVERED";

export type OrderLine = Readonly<{
  menuItemId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
}>;

export type Invoice = Readonly<{
  id: string;
  orderId: OrderId;
  createdAt: string;
  lines: readonly {
    label: string;
    amountCents: number;
  }[];
  totalCents: number;
}>;

export type Order = Readonly<{
  id: OrderId;
  clientId: string;
  restaurantId: RestaurantId;
  fulfillmentType?: "DELIVERY" | "PICKUP";
  paymentMethod?: "CARD" | "PAYPAL" | "MOBILE_MONEY" | "CASH";
  deliveryAddress: LatLng;
  status: OrderStatus;
  lines: readonly OrderLine[];
  prepTimeMinutes: number | null;
  deliveryFeeCents: number;
  serviceFeeCents: number;
  itemsTotalCents: number;
  totalCents: number;
  tipCents: number;
  invoiceId: string | null;
  courierId: string | null;
}>;

