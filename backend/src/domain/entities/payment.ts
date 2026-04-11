export type PaymentMethod = "CARD" | "PAYPAL" | "MOBILE_MONEY" | "CASH";

export type CardProvider = "VISA" | "MASTERCARD";

export type WalletProvider = "ORANGE_MONEY" | "WAVE";

export type PaymentVerificationInput =
  | {
      method: "CARD";
      provider: CardProvider;
      cardNumber: string;
      cardHolder: string;
      cardExpiry: string;
      cardCvc: string;
    }
  | {
      method: "PAYPAL";
      paypalEmail: string;
    }
  | {
      method: "MOBILE_MONEY";
      provider: WalletProvider;
      phoneNumber: string;
    }
  | {
      method: "CASH";
    };

export type PaymentVerificationOutput = Readonly<{
  ok: true;
  method: PaymentMethod;
  provider: string;
  reference: string;
  message: string;
}>;
