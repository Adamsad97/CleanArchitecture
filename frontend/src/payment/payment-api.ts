import {
  PAYMENT_METHOD_CARD,
  PAYMENT_METHOD_MOBILE_MONEY,
  PAYMENT_METHOD_PAYPAL,
  type PaymentVerificationInput,
} from "./types";
import { resolveCardVerificationPath } from "./methods/card-payment";
import { resolvePaypalVerificationPath } from "./methods/paypal-payment";
import { resolveMobileMoneyVerificationPath } from "./methods/mobile-money-payment";
import { resolveCashVerificationPath } from "./methods/cash-payment";

export function resolvePaymentVerificationPath(params: PaymentVerificationInput): string {
  if (params.method === PAYMENT_METHOD_CARD) {
    return resolveCardVerificationPath(params.provider);
  }

  if (params.method === PAYMENT_METHOD_PAYPAL) {
    return resolvePaypalVerificationPath();
  }

  if (params.method === PAYMENT_METHOD_MOBILE_MONEY) {
    return resolveMobileMoneyVerificationPath(params.provider);
  }

  return resolveCashVerificationPath();
}
