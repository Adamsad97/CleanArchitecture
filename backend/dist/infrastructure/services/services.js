import { v4 as uuidv4 } from "uuid";
import { haversineDistanceKm } from "../../domain/value-objects/geo.js";
export const services = {
    ids() {
        return {
            newId() {
                return uuidv4();
            },
        };
    },
    clock() {
        return {
            nowIso() {
                return new Date().toISOString();
            },
        };
    },
    payment() {
        return {
            async simulatePayment() {
                return;
            },
        };
    },
    distance() {
        return {
            async distanceKm(a, b) {
                return haversineDistanceKm(a, b);
            },
        };
    },
};
