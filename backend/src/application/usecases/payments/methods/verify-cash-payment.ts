import { Result, type Result as ResultT } from "../../../../shared/result.js";
import { type PaymentVerificationOutput } from "../../../../domain/entities/payment.js";
import { type IdGenerator } from "../../../ports/services.js";

export function verifyCashPayment(ids: IdGenerator): ResultT<PaymentVerificationOutput, never> {
  return Result.ok({
    ok: true,
    method: "CASH",
    provider: "CASH_ON_DELIVERY",
    reference: ids.newId(),
    message: "Paiement en especes valide.",
  });
}
