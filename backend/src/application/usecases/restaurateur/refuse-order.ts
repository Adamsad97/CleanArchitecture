import { Result, type Result as ResultT } from "../../../shared/result.js";
import {
  InvalidOrderStatusTransitionError,
  OrderNotFoundError,
} from "../../../domain/errors/domain-errors.js";
import { type OrderRepository } from "../../ports/repositories.js";

export type RefuseOrderDeps = Readonly<{ orders: OrderRepository }>;

export async function refuseOrder(
  deps: RefuseOrderDeps,
  orderId: string
): Promise<ResultT<void, OrderNotFoundError | InvalidOrderStatusTransitionError>> {
  const order = await deps.orders.get(orderId);
  if (!order) return Result.err(new OrderNotFoundError());
  if (order.status !== "PAID") return Result.err(new InvalidOrderStatusTransitionError());

  await deps.orders.update({
    ...order,
    status: "RESTAURANT_REFUSED",
  });
  return Result.ok(undefined);
}

