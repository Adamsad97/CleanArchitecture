import { Result } from "../../../shared/result.js";
import { CourierNotAvailableError } from "../../../domain/errors/domain-errors.js";
export async function setCourierStatus(deps, params) {
    const courier = await deps.couriers.get(params.courierId);
    if (!courier)
        return Result.err(new CourierNotAvailableError());
    await deps.couriers.upsert({ ...courier, status: params.status });
    return Result.ok(undefined);
}
