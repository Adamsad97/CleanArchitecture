import type { CardProvider, PaymentVerificationInput } from "../types";

const NON_DIGIT_CHARACTERS = /\D+/g;
const WHITESPACE_CHARACTERS = /\s+/g;
const CARD_NUMBER_PATTERN = /^\d{16}$/;
const CARD_EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\/[0-9]{2}$/;
const CARD_CVC_PATTERN = /^\d{3,4}$/;
const MASTERCARD_2_DIGIT_MIN = 51;
const MASTERCARD_2_DIGIT_MAX = 55;
const MASTERCARD_4_DIGIT_MIN = 2221;
const MASTERCARD_4_DIGIT_MAX = 2720;

export type CardFormInput = Readonly<{
  cardNumber: string;
  cardHolder: string;
  cardExpiry: string;
  cardCvc: string;
}>;

export function detectCardProvider(cardNumber: string): CardProvider | null {
  const numericCardNumber = cardNumber.replace(NON_DIGIT_CHARACTERS, "");
  if (!numericCardNumber) return null;

  if (numericCardNumber.startsWith("4")) return "VISA";

  if (numericCardNumber.startsWith("5")) {
    if (numericCardNumber.length === 1) return "MASTERCARD";
    const firstTwoDigits = Number(numericCardNumber.slice(0, 2));
    return firstTwoDigits >= MASTERCARD_2_DIGIT_MIN && firstTwoDigits <= MASTERCARD_2_DIGIT_MAX
      ? "MASTERCARD"
      : null;
  }

  if (numericCardNumber.startsWith("2")) {
    if (numericCardNumber.length < 4) return "MASTERCARD";
    const firstFourDigits = Number(numericCardNumber.slice(0, 4));
    return firstFourDigits >= MASTERCARD_4_DIGIT_MIN && firstFourDigits <= MASTERCARD_4_DIGIT_MAX
      ? "MASTERCARD"
      : null;
  }

  const firstTwoDigits = Number(numericCardNumber.slice(0, 2));
  if (firstTwoDigits >= MASTERCARD_2_DIGIT_MIN && firstTwoDigits <= MASTERCARD_2_DIGIT_MAX) {
    return "MASTERCARD";
  }

  const firstFourDigits = Number(numericCardNumber.slice(0, 4));
  if (firstFourDigits >= MASTERCARD_4_DIGIT_MIN && firstFourDigits <= MASTERCARD_4_DIGIT_MAX) {
    return "MASTERCARD";
  }

  return null;
}

export function validateCardPayment(input: CardFormInput & { provider: CardProvider | null }): string | null {
  const sanitizedCardNumber = input.cardNumber.replace(WHITESPACE_CHARACTERS, "");
  if (!CARD_NUMBER_PATTERN.test(sanitizedCardNumber)) {
    return "Numero de carte invalide (16 chiffres requis).";
  }
  if (!input.provider) {
    return "Type de carte non supporte (VISA ou MasterCard).";
  }
  if (!input.cardHolder.trim()) {
    return "Titulaire de carte requis.";
  }
  if (!CARD_EXPIRY_PATTERN.test(input.cardExpiry.trim())) {
    return "Date d'expiration invalide (MM/AA).";
  }
  if (!CARD_CVC_PATTERN.test(input.cardCvc.trim())) {
    return "CVC invalide.";
  }

  return null;
}

export function buildCardVerificationPayload(
  input: CardFormInput & { provider: CardProvider | null }
): PaymentVerificationInput {
  return {
    method: "CARD",
    provider: input.provider ?? "VISA",
    cardNumber: input.cardNumber.replace(WHITESPACE_CHARACTERS, ""),
    cardHolder: input.cardHolder.trim(),
    cardExpiry: input.cardExpiry.trim(),
    cardCvc: input.cardCvc.trim(),
  };
}

export function resolveCardVerificationPath(provider: CardProvider): string {
  return provider === "VISA"
    ? "/payments/card/visa/verify"
    : "/payments/card/mastercard/verify";
}

export function renderCardBrandBadge(provider: CardProvider | null) {
  if (!provider) return null;

  if (provider === "VISA") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 58,
          height: 24,
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 800,
          color: "#ffffff",
          background: "#1d4ed8",
          letterSpacing: "0.03em",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.2)",
        }}
      >
        VISA
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 56,
        height: 32,
        borderRadius: 8,
        background: "#0b0f19",
        position: "relative",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: 999,
          background: "#dc2626",
          position: "absolute",
          left: 16,
        }}
      />
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: 999,
          background: "#f59e0b",
          position: "absolute",
          left: 24,
          opacity: 0.98,
        }}
      />
    </span>
  );
}
