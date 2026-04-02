import { Result, type Result as ResultT } from "../../../shared/result.js";
import {
  InvalidOrderStatusTransitionError,
  OrderNotFoundError,
} from "../../../domain/errors/domain-errors.js";
import { type OrderRepository } from "../../ports/repositories.js";

export type MarkOrderReadyDeps = Readonly<{ orders: OrderRepository }>;

export async function markOrderReady(
  deps: MarkOrderReadyDeps,
  orderId: string
): Promise<ResultT<void, OrderNotFoundError | InvalidOrderStatusTransitionError>> {
  const order = await deps.orders.get(orderId);
  if (!order) return Result.err(new OrderNotFoundError());
  if (order.status !== "PREPARING") return Result.err(new InvalidOrderStatusTransitionError());

  await deps.orders.update({
    ...order,
    status: "READY_FOR_PICKUP",
  });
  return Result.ok(undefined);
}

