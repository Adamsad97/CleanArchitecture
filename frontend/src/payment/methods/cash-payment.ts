import type { PaymentVerificationInput } from "../types";

export function buildCashVerificationPayload(): PaymentVerificationInput {
  return { method: "CASH" };
}

export function resolveCashVerificationPath(): string {
  return "/payments/cash/verify";
}
