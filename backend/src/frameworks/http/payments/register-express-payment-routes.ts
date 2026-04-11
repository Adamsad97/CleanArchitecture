import { z } from "zod";
import type express from "express";
import { verifyPayment } from "../../../application/usecases/payments/verify-payment.js";
import { mapErrorToProblem } from "../http-error-mapper.js";
import { type AppDeps } from "../../../main/composition-root.js";

const CARD_NUMBER_PATTERN = /^\d{16}$/;
const CARD_EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\/[0-9]{2}$/;
const CARD_CVC_PATTERN = /^\d{3,4}$/;
const MIN_CARD_HOLDER_CHARACTERS = 2;
const MIN_MOBILE_MONEY_PHONE_CHARACTERS = 8;

const cardNumberSchema = z
  .string()
  .regex(CARD_NUMBER_PATTERN, "cardNumber must contain 16 digits");
const cardHolderSchema = z.string().min(MIN_CARD_HOLDER_CHARACTERS);
const cardExpirySchema = z
  .string()
  .regex(CARD_EXPIRY_PATTERN, "cardExpiry must be MM/AA");
const cardCvcSchema = z.string().regex(CARD_CVC_PATTERN);
const paypalEmailSchema = z.string().email();
const mobileMoneyPhoneSchema = z.string().min(MIN_MOBILE_MONEY_PHONE_CHARACTERS);

function sendPaymentVerificationResponse(
  deps: AppDeps,
  res: express.Response,
  payload: unknown
) {
  const verificationResult = verifyPayment({ ids: deps.ids }, payload as any);
  if (!verificationResult.ok) {
    const problem = mapErrorToProblem(verificationResult.error);
    return res.status(problem.status).json(problem);
  }
  return res.status(200).json(verificationResult.value);
}

export function registerExpressPaymentRoutes(app: express.Express, deps: AppDeps): void {
  app.post("/payments/card/verify", async (req, res) => {
    const body = z
      .object({
        method: z.literal("CARD"),
        provider: z.enum(["VISA", "MASTERCARD"]).default("VISA"),
        cardNumber: cardNumberSchema,
        cardHolder: cardHolderSchema,
        cardExpiry: cardExpirySchema,
        cardCvc: cardCvcSchema,
      })
      .parse(req.body);
    return sendPaymentVerificationResponse(deps, res, body);
  });

  app.post("/payments/card/visa/verify", async (req, res) => {
    const body = z
      .object({
        method: z.literal("CARD"),
        provider: z.literal("VISA"),
        cardNumber: cardNumberSchema,
        cardHolder: cardHolderSchema,
        cardExpiry: cardExpirySchema,
        cardCvc: cardCvcSchema,
      })
      .parse(req.body);
    return sendPaymentVerificationResponse(deps, res, body);
  });

  app.post("/payments/card/mastercard/verify", async (req, res) => {
    const body = z
      .object({
        method: z.literal("CARD"),
        provider: z.literal("MASTERCARD"),
        cardNumber: cardNumberSchema,
        cardHolder: cardHolderSchema,
        cardExpiry: cardExpirySchema,
        cardCvc: cardCvcSchema,
      })
      .parse(req.body);
    return sendPaymentVerificationResponse(deps, res, body);
  });

  app.post("/payments/paypal/verify", async (req, res) => {
    const body = z.object({ method: z.literal("PAYPAL"), paypalEmail: paypalEmailSchema }).parse(req.body);
    return sendPaymentVerificationResponse(deps, res, body);
  });

  app.post("/payments/mobile-money/verify", async (req, res) => {
    const body = z
      .object({
        method: z.literal("MOBILE_MONEY"),
        provider: z.enum(["ORANGE_MONEY", "WAVE"]).default("ORANGE_MONEY"),
          phoneNumber: mobileMoneyPhoneSchema,
      })
      .parse(req.body);
    return sendPaymentVerificationResponse(deps, res, body);
  });

  app.post("/payments/mobile-money/orange-money/verify", async (req, res) => {
    const body = z
      .object({
        method: z.literal("MOBILE_MONEY"),
        provider: z.literal("ORANGE_MONEY"),
        phoneNumber: mobileMoneyPhoneSchema,
      })
      .parse(req.body);
    return sendPaymentVerificationResponse(deps, res, body);
  });

  app.post("/payments/mobile-money/wave/verify", async (req, res) => {
    const body = z
      .object({
        method: z.literal("MOBILE_MONEY"),
        provider: z.literal("WAVE"),
        phoneNumber: mobileMoneyPhoneSchema,
      })
      .parse(req.body);
    return sendPaymentVerificationResponse(deps, res, body);
  });

  app.post("/payments/cash/verify", async (req, res) => {
    const body = z.object({ method: z.literal("CASH") }).parse(req.body);
    return sendPaymentVerificationResponse(deps, res, body);
  });
}
