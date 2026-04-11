import {
  type PaymentVerificationInput,
  type PaymentVerificationOutput,
} from "../../../domain/entities/payment.js";
import { type InvalidPaymentDetailsError } from "../../../domain/errors/domain-errors.js";
import { type IdGenerator } from "../../ports/services.js";
import { verifyCardPayment } from "./methods/verify-card-payment.js";
import { verifyPaypalPayment } from "./methods/verify-paypal-payment.js";
import { verifyMobileMoneyPayment } from "./methods/verify-mobile-money-payment.js";
import { verifyCashPayment } from "./methods/verify-cash-payment.js";
import { type Result as ResultT } from "../../../shared/result.js";

export type VerifyPaymentDeps = Readonly<{
  ids: IdGenerator;
}>;

export function verifyPayment(
  deps: VerifyPaymentDeps,
  input: PaymentVerificationInput
): ResultT<PaymentVerificationOutput, InvalidPaymentDetailsError> {
  if (input.method === "CARD") {
    return verifyCardPayment(deps.ids, {
      provider: input.provider,
      cardNumber: input.cardNumber,
      cardHolder: input.cardHolder,
      cardExpiry: input.cardExpiry,
      cardCvc: input.cardCvc,
    });
  }

  if (input.method === "PAYPAL") {
    return verifyPaypalPayment(deps.ids, input.paypalEmail);
  }

  if (input.method === "MOBILE_MONEY") {
    return verifyMobileMoneyPayment(deps.ids, input.provider, input.phoneNumber);
  }

  return verifyCashPayment(deps.ids);
}
