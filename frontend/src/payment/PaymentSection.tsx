import { useState } from "react";
import type {
  PaymentMethod,
  PaymentVerificationInput,
  WalletProvider,
} from "./types";
import {
  PAYMENT_METHOD_CARD,
  PAYMENT_METHOD_CASH,
  PAYMENT_METHOD_MOBILE_MONEY,
  PAYMENT_METHOD_PAYPAL,
} from "./types";
import {
  buildCardVerificationPayload,
  detectCardProvider,
  renderCardBrandBadge,
  validateCardPayment,
} from "./methods/card-payment";
import { buildPaypalVerificationPayload, validatePaypalPayment } from "./methods/paypal-payment";
import {
  buildMobileMoneyVerificationPayload,
  validateMobileMoneyPayment,
} from "./methods/mobile-money-payment";
import { buildCashVerificationPayload } from "./methods/cash-payment";

type PaymentSectionProps = {
  cartCount: number;
  onVerifyPayment: (payload: PaymentVerificationInput) => Promise<void>;
  onCheckout: (paymentMethod: PaymentMethod) => void;
};

export function PaymentSection({ cartCount, onVerifyPayment, onCheckout }: PaymentSectionProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PAYMENT_METHOD_CARD);
  const [walletProvider, setWalletProvider] = useState<WalletProvider>("ORANGE_MONEY");
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const detectedCardProvider = detectCardProvider(cardNumber);

  function validatePayment(): boolean {
    if (paymentMethod === PAYMENT_METHOD_CARD) {
      const cardError = validateCardPayment({
        provider: detectedCardProvider,
        cardNumber,
        cardHolder,
        cardExpiry,
        cardCvc,
      });
      if (cardError) {
        setPaymentError(cardError);
        return false;
      }
    }

    if (paymentMethod === PAYMENT_METHOD_PAYPAL) {
      const paypalError = validatePaypalPayment(paypalEmail);
      if (paypalError) {
        setPaymentError(paypalError);
        return false;
      }
    }

    if (paymentMethod === PAYMENT_METHOD_MOBILE_MONEY) {
      const mobileMoneyError = validateMobileMoneyPayment(mobileNumber);
      if (mobileMoneyError) {
        setPaymentError(mobileMoneyError);
        return false;
      }
    }

    setPaymentError("");
    return true;
  }

  async function submitCheckout() {
    if (!validatePayment()) return;

    const payload: PaymentVerificationInput =
      paymentMethod === PAYMENT_METHOD_CARD
        ? buildCardVerificationPayload({
            provider: detectedCardProvider,
            cardNumber,
            cardHolder,
            cardExpiry,
            cardCvc,
          })
        : paymentMethod === PAYMENT_METHOD_PAYPAL
        ? buildPaypalVerificationPayload(paypalEmail)
        : paymentMethod === PAYMENT_METHOD_MOBILE_MONEY
        ? buildMobileMoneyVerificationPayload(walletProvider, mobileNumber)
        : buildCashVerificationPayload();

    setIsVerifyingPayment(true);
    try {
      await onVerifyPayment(payload);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      setPaymentError(message);
      return;
    } finally {
      setIsVerifyingPayment(false);
    }

    onCheckout(paymentMethod);
  }

  return (
    <div className="card" style={{ marginBottom: 12, background: "#f8fafc", borderColor: "#cbd5e1" }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Paiement</div>
      <div className="row" style={{ flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <button
          type="button"
          className={paymentMethod === PAYMENT_METHOD_CARD ? "" : "secondary"}
          onClick={() => setPaymentMethod(PAYMENT_METHOD_CARD)}
        >
          Carte bancaire
        </button>
        <button
          type="button"
          className={paymentMethod === PAYMENT_METHOD_PAYPAL ? "" : "secondary"}
          onClick={() => setPaymentMethod(PAYMENT_METHOD_PAYPAL)}
        >
          PayPal
        </button>
        <button
          type="button"
          className={
            paymentMethod === PAYMENT_METHOD_MOBILE_MONEY && walletProvider === "ORANGE_MONEY"
              ? ""
              : "secondary"
          }
          onClick={() => {
            setPaymentMethod(PAYMENT_METHOD_MOBILE_MONEY);
            setWalletProvider("ORANGE_MONEY");
          }}
        >
          Orange Money
        </button>
        <button
          type="button"
          className={
            paymentMethod === PAYMENT_METHOD_MOBILE_MONEY && walletProvider === "WAVE"
              ? ""
              : "secondary"
          }
          onClick={() => {
            setPaymentMethod(PAYMENT_METHOD_MOBILE_MONEY);
            setWalletProvider("WAVE");
          }}
        >
          Wave
        </button>
        <button
          type="button"
          className={paymentMethod === PAYMENT_METHOD_CASH ? "" : "secondary"}
          onClick={() => setPaymentMethod(PAYMENT_METHOD_CASH)}
        >
          Especes
        </button>
      </div>

      {paymentMethod === PAYMENT_METHOD_CARD ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ position: "relative" }}>
            <input
              inputMode="numeric"
              placeholder="Numero de carte (16 chiffres)"
              value={cardNumber}
              onChange={(event) => setCardNumber(event.target.value)}
              style={{ paddingRight: 78 }}
            />
            {detectedCardProvider ? (
              <span
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
              >
                {renderCardBrandBadge(detectedCardProvider)}
              </span>
            ) : null}
          </div>
          <input
            placeholder="Titulaire"
            value={cardHolder}
            onChange={(event) => setCardHolder(event.target.value)}
          />
          <div className="row" style={{ gap: 8 }}>
            <input
              placeholder="MM/AA"
              value={cardExpiry}
              onChange={(event) => setCardExpiry(event.target.value)}
              style={{ maxWidth: 120 }}
            />
            <input
              inputMode="numeric"
              placeholder="CVC"
              value={cardCvc}
              onChange={(event) => setCardCvc(event.target.value)}
              style={{ maxWidth: 100 }}
            />
          </div>
        </div>
      ) : null}

      {paymentMethod === PAYMENT_METHOD_MOBILE_MONEY ? (
        <input
          placeholder={`Numero ${walletProvider === "ORANGE_MONEY" ? "Orange Money" : "Wave"}`}
          value={mobileNumber}
          onChange={(event) => setMobileNumber(event.target.value)}
        />
      ) : null}

      {paymentMethod === PAYMENT_METHOD_PAYPAL ? (
        <input
          type="email"
          placeholder="Email PayPal"
          value={paypalEmail}
          onChange={(event) => setPaypalEmail(event.target.value)}
        />
      ) : null}

      {paymentMethod === PAYMENT_METHOD_CASH ? (
        <div className="muted">Paiement en especes a la livraison / au retrait.</div>
      ) : null}

      {paymentError ? <div style={{ color: "#b91c1c", marginTop: 8 }}>{paymentError}</div> : null}

      <div className="row" style={{ marginTop: 10 }}>
        <button onClick={() => submitCheckout().catch(() => {})} disabled={cartCount === 0 || isVerifyingPayment}>
          {isVerifyingPayment ? "Verification paiement..." : "Payer maintenant"}
        </button>
      </div>
    </div>
  );
}
