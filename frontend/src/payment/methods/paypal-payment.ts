import type { PaymentVerificationInput } from "../types";

const PAYPAL_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validatePaypalPayment(paypalEmail: string): string | null {
  if (!PAYPAL_EMAIL_PATTERN.test(paypalEmail.trim())) {
    return "Email PayPal invalide.";
  }
  return null;
}

export function buildPaypalVerificationPayload(paypalEmail: string): PaymentVerificationInput {
  return {
    method: "PAYPAL",
    paypalEmail: paypalEmail.trim(),
  };
}

export function resolvePaypalVerificationPath(): string {
  return "/payments/paypal/verify";
}
