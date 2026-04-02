import { type Restaurant } from "../../../domain/entities/restaurant.js";
import { type RestaurantRepository } from "../../ports/repositories.js";

export type ListRestaurantsDeps = Readonly<{ restaurants: RestaurantRepository }>;

export async function listRestaurants(deps: ListRestaurantsDeps): Promise<readonly Restaurant[]> {
  return deps.restaurants.listRestaurants();
}

