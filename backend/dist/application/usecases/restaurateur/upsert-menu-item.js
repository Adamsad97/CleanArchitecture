import { RestaurantNotFoundError } from "../../../domain/errors/domain-errors.js";
import { Result } from "../../../shared/result.js";
export async function upsertMenuItem(deps, item) {
    const restaurant = await deps.restaurants.getRestaurant(item.restaurantId);
    if (!restaurant) {
        return Result.err(new RestaurantNotFoundError());
    }
    await deps.menus.upsertMenuItem(item);
    return Result.ok(undefined);
}
