import { Result } from "../../../shared/result.js";
import { InvalidOrderStatusTransitionError, OrderNotFoundError, } from "../../../domain/errors/domain-errors.js";
export async function refuseOrder(deps, orderId) {
    const order = await deps.orders.get(orderId);
    if (!order)
        return Result.err(new OrderNotFoundError());
    if (order.status !== "PAID")
        return Result.err(new InvalidOrderStatusTransitionError());
    await deps.orders.update({
        ...order,
        status: "RESTAURANT_REFUSED",
    });
    return Result.ok(undefined);
}
