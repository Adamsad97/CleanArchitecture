import { Result } from "../../../shared/result.js";
import { CourierCapacityExceededError, CourierNotAvailableError, InvalidOrderStatusTransitionError, OrderNotFoundError, } from "../../../domain/errors/domain-errors.js";
export async function acceptDelivery(deps, params) {
    const courier = await deps.couriers.get(params.courierId);
    if (!courier || courier.status !== "AVAILABLE")
        return Result.err(new CourierNotAvailableError());
    const order = await deps.orders.get(params.orderId);
    if (!order)
        return Result.err(new OrderNotFoundError());
    if (order.status !== "PREPARING" && order.status !== "READY_FOR_PICKUP") {
        return Result.err(new InvalidOrderStatusTransitionError());
    }
    if (order.courierId && order.courierId !== courier.id) {
        return Result.err(new CourierCapacityExceededError());
    }
    const active = courier.activeOrderIds;
    if (courier.level === "STANDARD") {
        if (active.length >= 1)
            return Result.err(new CourierCapacityExceededError());
    }
    else {
        if (active.length >= 2)
            return Result.err(new CourierCapacityExceededError());
        if (active.length === 1) {
            const activeOrder = await deps.orders.get(active[0]);
            if (activeOrder && activeOrder.restaurantId !== order.restaurantId) {
                return Result.err(new CourierCapacityExceededError());
            }
        }
    }
    await deps.orders.update({ ...order, courierId: courier.id });
    await deps.couriers.upsert({ ...courier, activeOrderIds: [...active, order.id] });
    return Result.ok(undefined);
}
