import { Result, type Result as ResultT } from "../../../shared/result.js";
import {
  InvalidOrderStatusTransitionError,
  OrderNotFoundError,
  RestaurantNotFoundError,
} from "../../../domain/errors/domain-errors.js";
import { type CourierRepository, type OrderRepository, type RestaurantRepository } from "../../ports/repositories.js";
import { type DistanceService } from "../../ports/services.js";

export type CourierRevenuePolicy = Readonly<{
  pickupFeeCents: number;
  perKmCents: number;
}>;

export type CompleteDeliveryDeps = Readonly<{
  orders: OrderRepository;
  couriers: CourierRepository;
  restaurants: RestaurantRepository;
  distance: DistanceService;
  revenue: CourierRevenuePolicy;
}>;

export async function completeDelivery(
  deps: CompleteDeliveryDeps,
  params: { readonly orderId: string; readonly courierId: string }
): Promise<
  ResultT<
    { creditedCents: number },
    OrderNotFoundError | InvalidOrderStatusTransitionError | RestaurantNotFoundError
  >
> {
  const order = await deps.orders.get(params.orderId);
  if (!order) return Result.err(new OrderNotFoundError());
  if (order.status !== "PICKED_UP") return Result.err(new InvalidOrderStatusTransitionError());
  if (order.courierId !== params.courierId) return Result.err(new InvalidOrderStatusTransitionError());

  const restaurant = await deps.restaurants.getRestaurant(order.restaurantId);
  if (!restaurant) return Result.err(new RestaurantNotFoundError());

  const deliveryDistanceKm = await deps.distance.distanceKm(restaurant.location, order.deliveryAddress);
  const creditedCents =
    deps.revenue.pickupFeeCents + Math.round(deliveryDistanceKm * deps.revenue.perKmCents) + order.tipCents;

  const courier = await deps.couriers.get(params.courierId);
  if (!courier) return Result.err(new InvalidOrderStatusTransitionError());

  await deps.orders.update({ ...order, status: "DELIVERED" });
  await deps.couriers.upsert({
    ...courier,
    walletCents: courier.walletCents + creditedCents,
    activeOrderIds: courier.activeOrderIds.filter((id) => id !== order.id),
  });

  return Result.ok({ creditedCents });
}

