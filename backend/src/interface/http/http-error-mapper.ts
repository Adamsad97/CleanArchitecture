import { DomainError } from "../../domain/errors/domain-errors.js";
import { ZodError } from "zod";

export type HttpProblem = Readonly<{
  status: number;
  code: string;
  message: string;
}>;

export function mapErrorToProblem(error: unknown): HttpProblem {
  if (error instanceof ZodError) {
    return { status: 400, code: "VALIDATION_ERROR", message: error.message };
  }
  if (error instanceof DomainError) {
    const status = domainErrorToStatus(error.code);
    return { status, code: error.code, message: error.message };
  }
  return { status: 500, code: "INTERNAL", message: "Erreur interne" };
}

function domainErrorToStatus(code: string): number {
  switch (code) {
    case "RESTAURANT_NOT_FOUND":
    case "ORDER_NOT_FOUND":
    case "MENU_ITEM_NOT_FOUND":
      return 404;
    case "CART_RESTAURANT_MISMATCH":
    case "MENU_ITEM_OUT_OF_STOCK":
    case "INVALID_ORDER_STATUS_TRANSITION":
    case "COURIER_NOT_AVAILABLE":
    case "COURIER_CAPACITY_EXCEEDED":
    case "AUTH_INVALID_ACCOUNT_TYPE_SELECTION":
      return 400;
    case "AUTH_INVALID_CREDENTIALS":
      return 401;
    case "ACCOUNT_EMAIL_ALREADY_USED":
      return 409;
    default:
      return 400;
  }
}

