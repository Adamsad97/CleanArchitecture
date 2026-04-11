import { Result } from "../../../../shared/result.js";
import { InvalidPaymentDetailsError } from "../../../../domain/errors/domain-errors.js";
const PAYPAL_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function verifyPaypalPayment(ids, paypalEmail) {
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
