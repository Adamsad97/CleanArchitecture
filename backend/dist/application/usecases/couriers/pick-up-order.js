import { Result } from "../../../shared/result.js";
import { InvalidOrderStatusTransitionError, OrderNotFoundError, } from "../../../domain/errors/domain-errors.js";
export async function pickUpOrder(deps, params) {
    const order = await deps.orders.get(params.orderId);
    if (!order)
        return Result.err(new OrderNotFoundError());
    if (order.status !== "READY_FOR_PICKUP")
        return Result.err(new InvalidOrderStatusTransitionError());
    if (order.courierId !== params.courierId)
        return Result.err(new InvalidOrderStatusTransitionError());
    await deps.orders.update({ ...order, status: "PICKED_UP" });
    return Result.ok(undefined);
}
