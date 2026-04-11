import { Result } from "../../../../shared/result.js";
export function verifyCashPayment(ids) {
    return Result.ok({
        ok: true,
        method: "CASH",
        provider: "CASH_ON_DELIVERY",
        reference: ids.newId(),
        message: "Paiement en especes valide.",
    });
}
