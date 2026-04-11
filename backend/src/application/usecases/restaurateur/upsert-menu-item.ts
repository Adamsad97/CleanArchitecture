import { type MenuItem } from "../../../domain/entities/restaurant.js";
import { RestaurantNotFoundError } from "../../../domain/errors/domain-errors.js";
import { Result, type Result as ResultT } from "../../../shared/result.js";
import { type MenuRepository, type RestaurantRepository } from "../../ports/repositories.js";

export type UpsertMenuItemDeps = Readonly<{
  menus: MenuRepository;
  restaurants: RestaurantRepository;
}>;

export async function upsertMenuItem(
  deps: UpsertMenuItemDeps,
  item: MenuItem
): Promise<ResultT<void, RestaurantNotFoundError>> {
  const restaurant = await deps.restaurants.getRestaurant(item.restaurantId);
  if (!restaurant) {
    return Result.err(new RestaurantNotFoundError());
  }

  await deps.menus.upsertMenuItem(item);
  return Result.ok(undefined);
}

