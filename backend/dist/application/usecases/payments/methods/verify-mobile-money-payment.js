import { Result } from "../../../../shared/result.js";
import { InvalidPaymentDetailsError } from "../../../../domain/errors/domain-errors.js";
const NON_DIGIT_CHARACTERS = /\D+/g;
const MINIMUM_PHONE_DIGITS = 8;
export function verifyMobileMoneyPayment(ids, provider, phoneNumber) {
    const numericPhoneNumber = phoneNumber.replace(NON_DIGIT_CHARACTERS, "");
    if (numericPhoneNumber.length < MINIMUM_PHONE_DIGITS) {
        return Result.err(new InvalidPaymentDetailsError("Numero Mobile Money invalide."));
    }
    return Result.ok({
        ok: true,
        method: "MOBILE_MONEY",
        provider,
        reference: ids.newId(),
        message: provider === "ORANGE_MONEY" ? "Paiement Orange Money valide." : "Paiement Wave valide.",
    });
}
