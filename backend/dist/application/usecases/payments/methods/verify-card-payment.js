import { Result } from "../../../../shared/result.js";
import { InvalidPaymentDetailsError } from "../../../../domain/errors/domain-errors.js";
const CARD_NUMBER_PATTERN = /^\d{16}$/;
const CARD_EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\/[0-9]{2}$/;
const CARD_CVC_PATTERN = /^\d{3,4}$/;
export function verifyCardPayment(ids, input) {
    if (!CARD_NUMBER_PATTERN.test(input.cardNumber)) {
        return Result.err(new InvalidPaymentDetailsError("Numero de carte invalide."));
    }
    if (!input.cardHolder.trim()) {
        return Result.err(new InvalidPaymentDetailsError("Titulaire de carte requis."));
    }
    if (!CARD_EXPIRY_PATTERN.test(input.cardExpiry)) {
        return Result.err(new InvalidPaymentDetailsError("Date d'expiration invalide."));
    }
    if (!CARD_CVC_PATTERN.test(input.cardCvc)) {
        return Result.err(new InvalidPaymentDetailsError("CVC invalide."));
    }
    return Result.ok({
        ok: true,
        method: "CARD",
        provider: input.provider,
        reference: ids.newId(),
        message: input.provider === "VISA" ? "Paiement VISA valide." : "Paiement MasterCard valide.",
    });
}
