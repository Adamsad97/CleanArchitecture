import { v4 as uuidv4 } from "uuid";
import { haversineDistanceKm, type LatLng } from "../../domain/value-objects/geo.js";
import { type Clock, type DistanceService, type IdGenerator, type PaymentService } from "../../application/ports/services.js";

export const services = {
  ids(): IdGenerator {
    return {
      newId(): string {
        return uuidv4();
      },
    };
  },
  clock(): Clock {
    return {
      nowIso(): string {
        return new Date().toISOString();
      },
    };
  },
  payment(): PaymentService {
    return {
      async simulatePayment(): Promise<void> {
        return;
      },
    };
  },
  distance(): DistanceService {
    return {
      async distanceKm(a: LatLng, b: LatLng): Promise<number> {
        return haversineDistanceKm(a, b);
      },
    };
  },
};

