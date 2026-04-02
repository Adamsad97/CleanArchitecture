import { Result } from "../../../shared/result.js";
import { InvalidOrderStatusTransitionError, OrderNotFoundError, } from "../../../domain/errors/domain-errors.js";
export async function acceptOrder(deps, params) {
    const order = await deps.orders.get(params.orderId);
    if (!order)
        return Result.err(new OrderNotFoundError());
    if (order.status !== "PAID")
        return Result.err(new InvalidOrderStatusTransitionError());
    await deps.orders.update({
        ...order,
        status: "PREPARING",
        prepTimeMinutes: params.prepTimeMinutes,
    });
    return Result.ok(undefined);
}
