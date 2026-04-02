import { type OrderId } from "./order.js";

export type CourierId = string;
export type CourierStatus = "AVAILABLE" | "UNAVAILABLE";
export type CourierLevel = "STANDARD" | "EXPERT";

export type Courier = Readonly<{
  id: CourierId;
  displayName: string;
  status: CourierStatus;
  level: CourierLevel;
  activeOrderIds: readonly OrderId[];
  walletCents: number;
}>;

