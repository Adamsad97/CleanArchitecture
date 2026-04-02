import { Result, type Result as ResultT } from "../../../shared/result.js";
import {
  InvalidOrderStatusTransitionError,
  OrderNotFoundError,
} from "../../../domain/errors/domain-errors.js";
import { type OrderRepository } from "../../ports/repositories.js";

export type PickUpOrderDeps = Readonly<{ orders: OrderRepository }>;

export async function pickUpOrder(
  deps: PickUpOrderDeps,
  params: { readonly orderId: string; readonly courierId: string }
): Promise<ResultT<void, OrderNotFoundError | InvalidOrderStatusTransitionError>> {
  const order = await deps.orders.get(params.orderId);
  if (!order) return Result.err(new OrderNotFoundError());
  if (order.status !== "READY_FOR_PICKUP") return Result.err(new InvalidOrderStatusTransitionError());
  if (order.courierId !== params.courierId) return Result.err(new InvalidOrderStatusTransitionError());

  await deps.orders.update({ ...order, status: "PICKED_UP" });
  return Result.ok(undefined);
}

