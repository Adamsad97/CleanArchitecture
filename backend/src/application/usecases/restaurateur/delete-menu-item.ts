import { type MenuRepository } from "../../ports/repositories.js";

export type DeleteMenuItemDeps = Readonly<{ menus: MenuRepository }>;

export async function deleteMenuItem(
  deps: DeleteMenuItemDeps,
  menuItemId: string
): Promise<void> {
  await deps.menus.deleteMenuItem(menuItemId);
}

