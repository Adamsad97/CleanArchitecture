import { type MenuItem } from "../../../domain/entities/restaurant.js";
import { type MenuRepository } from "../../ports/repositories.js";

export type UpsertMenuItemDeps = Readonly<{ menus: MenuRepository }>;

export async function upsertMenuItem(
  deps: UpsertMenuItemDeps,
  item: MenuItem
): Promise<void> {
  await deps.menus.upsertMenuItem(item);
}

