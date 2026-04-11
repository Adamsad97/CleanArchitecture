import { Result, type Result as ResultT } from "../../../../shared/result.js";
import { type PaymentVerificationOutput } from "../../../../domain/entities/payment.js";
import { InvalidPaymentDetailsError } from "../../../../domain/errors/domain-errors.js";
import { type IdGenerator } from "../../../ports/services.js";

const PAYPAL_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function verifyPaypalPayment(
  ids: IdGenerator,
  paypalEmail: string
): ResultT<PaymentVerificationOutput, InvalidPaymentDetailsError> {
  if (!PAYPAL_EMAIL_PATTERN.test(paypalEmail)) {
    return Result.err(new InvalidPaymentDetailsError("Email PayPal invalide."));
  }

  return Result.ok({
    ok: true,
    method: "PAYPAL",
    provider: "PAYPAL",
    reference: ids.newId(),
    message: "Paiement PayPal valide.",
  });
}
