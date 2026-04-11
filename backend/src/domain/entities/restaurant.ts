import { type LatLng } from "../value-objects/geo.js";

export type RestaurantId = string;
export type MenuItemId = string;

export type Allergen = string;

export type MenuItem = Readonly<{
  id: MenuItemId;
  restaurantId: RestaurantId;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string | null;
  allergens: readonly Allergen[];
  dailyStock: number;
}>;

export type Restaurant = Readonly<{
  id: RestaurantId;
  name: string;
  location: LatLng;
}>;

