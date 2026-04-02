import { type MenuItem } from "../../../domain/entities/restaurant.js";
import { type MenuRepository } from "../../ports/repositories.js";

export type ListMenuDeps = Readonly<{ menus: MenuRepository }>;

export async function listMenu(
  deps: ListMenuDeps,
  restaurantId: string
): Promise<readonly MenuItem[]> {
  return deps.menus.listMenuItems(restaurantId);
}

