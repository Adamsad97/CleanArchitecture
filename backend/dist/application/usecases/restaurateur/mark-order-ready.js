import { Result } from "../../../shared/result.js";
import { InvalidOrderStatusTransitionError, OrderNotFoundError, } from "../../../domain/errors/domain-errors.js";
export async function markOrderReady(deps, orderId) {
    const order = await deps.orders.get(orderId);
    if (!order)
        return Result.err(new OrderNotFoundError());
    if (order.status !== "PREPARING")
        return Result.err(new InvalidOrderStatusTransitionError());
    await deps.orders.update({
        ...order,
        status: "READY_FOR_PICKUP",
    });
    return Result.ok(undefined);
}
