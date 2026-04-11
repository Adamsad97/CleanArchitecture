import type { PaymentVerificationInput, WalletProvider } from "../types";

const NON_DIGIT_CHARACTERS = /\D+/g;
const MINIMUM_PHONE_DIGITS = 8;

export function validateMobileMoneyPayment(phoneNumber: string): string | null {
  const numericPhoneNumber = phoneNumber.replace(NON_DIGIT_CHARACTERS, "");
  if (numericPhoneNumber.length < MINIMUM_PHONE_DIGITS) {
    return "Numero Mobile Money invalide.";
  }
  return null;
}

export function buildMobileMoneyVerificationPayload(
  provider: WalletProvider,
  phoneNumber: string
): PaymentVerificationInput {
  return {
    method: "MOBILE_MONEY",
    provider,
    phoneNumber: phoneNumber.trim(),
  };
}

export function resolveMobileMoneyVerificationPath(provider: WalletProvider): string {
  return provider === "ORANGE_MONEY"
    ? "/payments/mobile-money/orange-money/verify"
    : "/payments/mobile-money/wave/verify";
}
