import { type MenuItemId, type RestaurantId } from "./restaurant.js";

export type CartItem = Readonly<{
  menuItemId: MenuItemId;
  quantity: number;
  unitPriceCents: number;
}>;

export type Cart = Readonly<{
  clientId: string;
  restaurantId: RestaurantId | null;
  items: readonly CartItem[];
}>;

