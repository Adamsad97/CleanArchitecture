import type { CourierOrder } from "../../../api/ecoeats-api";
import {
  ORDER_STATUS_PICKED_UP,
  ORDER_STATUS_PREPARING,
  ORDER_STATUS_READY_FOR_PICKUP,
} from "../../../constants/domain-status";
import type { SortMode } from "./types";

export function euros(cents: number): string {
  return `${(cents / 100).toFixed(2)} EUR`;
}

export function shortAddress(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

export function etaLabel(orderId: string): string {
  const hash = orderId
    .split("")
    .reduce((totalCharCode, character) => totalCharCode + character.charCodeAt(0), 0);
  return `${12 + (hash % 22)} min`;
}

export function mapUrl(latitude: number, longitude: number): string {
  const mapPaddingDegrees = 0.008;
  const westLongitude = longitude - mapPaddingDegrees;
  const eastLongitude = longitude + mapPaddingDegrees;
  const northLatitude = latitude + mapPaddingDegrees;
  const southLatitude = latitude - mapPaddingDegrees;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${westLongitude}%2C${southLatitude}%2C${eastLongitude}%2C${northLatitude}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

export function mapUrlForFocus(params: {
  deliveryAddress: { lat: number; lng: number };
  courierLocation: { lat: number; lng: number } | null;
  focusOnCourier: boolean;
}): string {
  if (params.focusOnCourier && params.courierLocation) {
    return mapUrl(params.courierLocation.lat, params.courierLocation.lng);
  }
  return mapUrl(params.deliveryAddress.lat, params.deliveryAddress.lng);
}

export function haversineKm(
  originCoordinates: { lat: number; lng: number },
  destinationCoordinates: { lat: number; lng: number }
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLatitude = toRadians(destinationCoordinates.lat - originCoordinates.lat);
  const deltaLongitude = toRadians(destinationCoordinates.lng - originCoordinates.lng);
  const originLatitudeRadians = toRadians(originCoordinates.lat);
  const destinationLatitudeRadians = toRadians(destinationCoordinates.lat);

  const haversine =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(originLatitudeRadians) *
      Math.cos(destinationLatitudeRadians) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
}

export function urgencyWeight(status: CourierOrder["status"]): number {
  if (status === ORDER_STATUS_READY_FOR_PICKUP) return 100;
  if (status === ORDER_STATUS_PICKED_UP) return 90;
  if (status === ORDER_STATUS_PREPARING) return 70;
  return 40;
}

export function missionPriorityScore(params: {
  order: CourierOrder;
  courierLocation: { lat: number; lng: number } | null;
}): number {
  const distanceKm = params.courierLocation
    ? haversineKm(params.courierLocation, params.order.deliveryAddress)
    : 8;

  return urgencyWeight(params.order.status) * 1000 + params.order.tipCents - Math.round(distanceKm * 60);
}

export function priorityBucket(score: number): "high" | "medium" | "low" {
  if (score >= 99000) return "high";
  if (score >= 76000) return "medium";
  return "low";
}

export function progressLabel(status: CourierOrder["status"]): string {
  if (status === ORDER_STATUS_READY_FOR_PICKUP) return "Pret a recuperer";
  if (status === ORDER_STATUS_PICKED_UP) return "En route";
  if (status === ORDER_STATUS_PREPARING) return "Preparation";
  return "A traiter";
}

export function sortOrders(params: {
  orders: CourierOrder[];
  courierLocation: { lat: number; lng: number } | null;
  sortMode: SortMode;
}): CourierOrder[] {
  return [...params.orders].sort((leftOrder, rightOrder) => {
    const leftDistance = params.courierLocation
      ? haversineKm(params.courierLocation, leftOrder.deliveryAddress)
      : Number.POSITIVE_INFINITY;
    const rightDistance = params.courierLocation
      ? haversineKm(params.courierLocation, rightOrder.deliveryAddress)
      : Number.POSITIVE_INFINITY;

    if (params.sortMode === "DISTANCE") {
      return leftDistance - rightDistance;
    }

    if (params.sortMode === "TIP") {
      return rightOrder.tipCents - leftOrder.tipCents;
    }

    if (params.sortMode === "URGENCY") {
      return urgencyWeight(rightOrder.status) - urgencyWeight(leftOrder.status);
    }

    const leftScore = missionPriorityScore({ order: leftOrder, courierLocation: params.courierLocation });
    const rightScore = missionPriorityScore({ order: rightOrder, courierLocation: params.courierLocation });
    return rightScore - leftScore;
  });
}
