import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { mapErrorToProblem } from "../http-error-mapper.js";
import { verifyPayment } from "../../../application/usecases/payments/verify-payment.js";
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

function sendFastifyPaymentVerificationResponse(reply: any, deps: AppDeps, payload: unknown) {
  const verificationResult = verifyPayment({ ids: deps.ids }, payload as any);
  if (!verificationResult.ok) {
    const problem = mapErrorToProblem(verificationResult.error);
    return reply.code(problem.status).send(problem);
  }
  return reply.code(200).send(verificationResult.value);
}

export function registerFastifyPaymentRoutes(app: FastifyInstance, deps: AppDeps): void {
  app.post("/payments/card/verify", async (req, reply) => {
    try {
      const body = z
        .object({
          method: z.literal("CARD"),
          provider: z.enum(["VISA", "MASTERCARD"]).default("VISA"),
          cardNumber: cardNumberSchema,
          cardHolder: cardHolderSchema,
          cardExpiry: cardExpirySchema,
          cardCvc: cardCvcSchema,
        })
        .parse((req as any).body);
      return sendFastifyPaymentVerificationResponse(reply, deps, body);
    } catch (e) {
      const problem = mapErrorToProblem(e);
      return reply.code(problem.status).send(problem);
    }
  });

  app.post("/payments/card/visa/verify", async (req, reply) => {
    try {
      const body = z
        .object({
          method: z.literal("CARD"),
          provider: z.literal("VISA"),
          cardNumber: cardNumberSchema,
          cardHolder: cardHolderSchema,
          cardExpiry: cardExpirySchema,
          cardCvc: cardCvcSchema,
        })
        .parse((req as any).body);
      return sendFastifyPaymentVerificationResponse(reply, deps, body);
    } catch (e) {
      const problem = mapErrorToProblem(e);
      return reply.code(problem.status).send(problem);
    }
  });

  app.post("/payments/card/mastercard/verify", async (req, reply) => {
    try {
      const body = z
        .object({
          method: z.literal("CARD"),
          provider: z.literal("MASTERCARD"),
          cardNumber: cardNumberSchema,
          cardHolder: cardHolderSchema,
          cardExpiry: cardExpirySchema,
          cardCvc: cardCvcSchema,
        })
        .parse((req as any).body);
      return sendFastifyPaymentVerificationResponse(reply, deps, body);
    } catch (e) {
      const problem = mapErrorToProblem(e);
      return reply.code(problem.status).send(problem);
    }
  });

  app.post("/payments/paypal/verify", async (req, reply) => {
    try {
      const body = z
        .object({ method: z.literal("PAYPAL"), paypalEmail: paypalEmailSchema })
        .parse((req as any).body);
      return sendFastifyPaymentVerificationResponse(reply, deps, body);
    } catch (e) {
      const problem = mapErrorToProblem(e);
      return reply.code(problem.status).send(problem);
    }
  });

  app.post("/payments/mobile-money/verify", async (req, reply) => {
    try {
      const body = z
        .object({
          method: z.literal("MOBILE_MONEY"),
          provider: z.enum(["ORANGE_MONEY", "WAVE"]).default("ORANGE_MONEY"),
          phoneNumber: mobileMoneyPhoneSchema,
        })
        .parse((req as any).body);
      return sendFastifyPaymentVerificationResponse(reply, deps, body);
    } catch (e) {
      const problem = mapErrorToProblem(e);
      return reply.code(problem.status).send(problem);
    }
  });

  app.post("/payments/mobile-money/orange-money/verify", async (req, reply) => {
    try {
      const body = z
        .object({
          method: z.literal("MOBILE_MONEY"),
          provider: z.literal("ORANGE_MONEY"),
          phoneNumber: mobileMoneyPhoneSchema,
        })
        .parse((req as any).body);
      return sendFastifyPaymentVerificationResponse(reply, deps, body);
    } catch (e) {
      const problem = mapErrorToProblem(e);
      return reply.code(problem.status).send(problem);
    }
  });

  app.post("/payments/mobile-money/wave/verify", async (req, reply) => {
    try {
      const body = z
        .object({
          method: z.literal("MOBILE_MONEY"),
          provider: z.literal("WAVE"),
          phoneNumber: mobileMoneyPhoneSchema,
        })
        .parse((req as any).body);
      return sendFastifyPaymentVerificationResponse(reply, deps, body);
    } catch (e) {
      const problem = mapErrorToProblem(e);
      return reply.code(problem.status).send(problem);
    }
  });

  app.post("/payments/cash/verify", async (req, reply) => {
    try {
      const body = z.object({ method: z.literal("CASH") }).parse((req as any).body);
      return sendFastifyPaymentVerificationResponse(reply, deps, body);
    } catch (e) {
      const problem = mapErrorToProblem(e);
      return reply.code(problem.status).send(problem);
    }
  });
}
