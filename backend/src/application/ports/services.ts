import { type LatLng } from "../../domain/value-objects/geo.js";

export type PaymentService = {
  simulatePayment(params: {
    readonly orderId: string;
    readonly amountCents: number;
  }): Promise<void>;
};

export type DistanceService = {
  distanceKm(a: LatLng, b: LatLng): Promise<number>;
};

export type IdGenerator = {
  newId(): string;
};

export type Clock = {
  nowIso(): string;
};

