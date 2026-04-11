export type PaymentMethod = "CARD" | "PAYPAL" | "MOBILE_MONEY" | "CASH";

export const PAYMENT_METHOD_CARD = "CARD" as const;
export const PAYMENT_METHOD_PAYPAL = "PAYPAL" as const;
export const PAYMENT_METHOD_MOBILE_MONEY = "MOBILE_MONEY" as const;
export const PAYMENT_METHOD_CASH = "CASH" as const;

export const PAYMENT_METHOD_VALUES: readonly PaymentMethod[] = [
  PAYMENT_METHOD_CARD,
  PAYMENT_METHOD_PAYPAL,
  PAYMENT_METHOD_MOBILE_MONEY,
  PAYMENT_METHOD_CASH,
];

export type FulfillmentType = "DELIVERY" | "PICKUP";
export const FULFILLMENT_TYPE_DELIVERY = "DELIVERY" as const;
export const FULFILLMENT_TYPE_PICKUP = "PICKUP" as const;
export const FULFILLMENT_TYPE_VALUES: readonly FulfillmentType[] = [
  FULFILLMENT_TYPE_DELIVERY,
  FULFILLMENT_TYPE_PICKUP,
];

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
