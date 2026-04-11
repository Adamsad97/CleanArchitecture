import { Result, type Result as ResultT } from "../../../../shared/result.js";
import { type PaymentVerificationOutput, type WalletProvider } from "../../../../domain/entities/payment.js";
import { InvalidPaymentDetailsError } from "../../../../domain/errors/domain-errors.js";
import { type IdGenerator } from "../../../ports/services.js";

const NON_DIGIT_CHARACTERS = /\D+/g;
const MINIMUM_PHONE_DIGITS = 8;

export function verifyMobileMoneyPayment(
  ids: IdGenerator,
  provider: WalletProvider,
  phoneNumber: string
): ResultT<PaymentVerificationOutput, InvalidPaymentDetailsError> {
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
