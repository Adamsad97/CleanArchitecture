import { Result, type Result as ResultT } from "../../../shared/result.js";
import {
  InvalidOrderStatusTransitionError,
  OrderNotFoundError,
} from "../../../domain/errors/domain-errors.js";
import { type OrderRepository } from "../../ports/repositories.js";

export type AcceptOrderDeps = Readonly<{ orders: OrderRepository }>;

export async function acceptOrder(
  deps: AcceptOrderDeps,
  params: { readonly orderId: string; readonly prepTimeMinutes: number }
): Promise<ResultT<void, OrderNotFoundError | InvalidOrderStatusTransitionError>> {
  const order = await deps.orders.get(params.orderId);
  if (!order) return Result.err(new OrderNotFoundError());
  if (order.status !== "PAID") return Result.err(new InvalidOrderStatusTransitionError());

  await deps.orders.update({
    ...order,
    status: "PREPARING",
    prepTimeMinutes: params.prepTimeMinutes,
  });
  return Result.ok(undefined);
}

