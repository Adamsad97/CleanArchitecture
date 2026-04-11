import { Result } from "../../../shared/result.js";
import { InvalidOrderStatusTransitionError, OrderNotFoundError, RestaurantNotFoundError, } from "../../../domain/errors/domain-errors.js";
export async function completeDelivery(deps, params) {
    const order = await deps.orders.get(params.orderId);
    if (!order)
        return Result.err(new OrderNotFoundError());
    if (order.status !== "PICKED_UP")
        return Result.err(new InvalidOrderStatusTransitionError());
    if (order.courierId !== params.courierId)
        return Result.err(new InvalidOrderStatusTransitionError());
    const restaurant = await deps.restaurants.getRestaurant(order.restaurantId);
    if (!restaurant)
        return Result.err(new RestaurantNotFoundError());
    const deliveryDistanceKm = await deps.distance.distanceKm(restaurant.location, order.deliveryAddress);
    const creditedCents = deps.revenue.pickupFeeCents + Math.round(deliveryDistanceKm * deps.revenue.perKmCents) + order.tipCents;
    const courier = await deps.couriers.get(params.courierId);
    if (!courier)
        return Result.err(new InvalidOrderStatusTransitionError());
    await deps.orders.update({ ...order, status: "DELIVERED" });
    await deps.couriers.upsert({
        ...courier,
        walletCents: courier.walletCents + creditedCents,
        activeOrderIds: courier.activeOrderIds.filter((id) => id !== order.id),
    });
    return Result.ok({ creditedCents });
}
