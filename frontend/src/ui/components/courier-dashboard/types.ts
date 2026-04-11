import type { CourierOrder, CourierStatus, Restaurant } from "../../../api/ecoeats-api";

export type SortMode = "SMART" | "DISTANCE" | "TIP" | "URGENCY";

export type CourierDashboardProps = {
  courierName: string;
  courierStatus: CourierStatus;
  courierLocation: { lat: number; lng: number } | null;
  courierAddressLabel: string;
  courierGeoStatus: string;
  proposals: CourierOrder[];
  restaurants: Restaurant[];
  searchQuery: string;
  dashboardMessage: string;
  isRefreshing: boolean;
  processingOrderId: string | null;
  onSearchChange: (value: string) => void;
  onToggleStatus: () => void;
  onRefresh: () => void;
  onAcceptOrder: (orderId: string) => void;
  onPickUpOrder: (orderId: string) => void;
  onDeliverOrder: (orderId: string) => void;
};
