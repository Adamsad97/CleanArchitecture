import { Result, type Result as ResultT } from "../../../shared/result.js";
import { CourierNotAvailableError } from "../../../domain/errors/domain-errors.js";
import { type CourierRepository } from "../../ports/repositories.js";

export type SetCourierStatusDeps = Readonly<{ couriers: CourierRepository }>;

export async function setCourierStatus(
  deps: SetCourierStatusDeps,
  params: { readonly courierId: string; readonly status: "AVAILABLE" | "UNAVAILABLE" }
): Promise<ResultT<void, CourierNotAvailableError>> {
  const courier = await deps.couriers.get(params.courierId);
  if (!courier) return Result.err(new CourierNotAvailableError());
  await deps.couriers.upsert({ ...courier, status: params.status });
  return Result.ok(undefined);
}

