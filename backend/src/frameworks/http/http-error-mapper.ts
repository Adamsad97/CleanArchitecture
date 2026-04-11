import { DomainError } from "../../domain/errors/domain-errors.js";
import { ZodError } from "zod";

export type HttpProblem = Readonly<{
  status: number;
  code: string;
  message: string;
}>;

export function mapErrorToProblem(error: unknown): HttpProblem {
  if (isPayloadTooLargeError(error)) {
    return {
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
      message: "Image trop volumineuse. Reduisez la taille du fichier.",
    };
  }

  if (isStorageTooLargeError(error)) {
    return {
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
      message: "Image trop volumineuse pour le stockage. Reduisez la taille du fichier.",
    };
  }

  if (error instanceof ZodError) {
    return { status: 400, code: "VALIDATION_ERROR", message: error.message };
  }
  if (error instanceof DomainError) {
    const status = domainErrorToStatus(error.code);
    return { status, code: error.code, message: error.message };
  }

  if (error instanceof Error && process.env.NODE_ENV !== "production") {
    return { status: 500, code: "INTERNAL", message: `Erreur interne: ${error.message}` };
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

function isPayloadTooLargeError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const candidate = error as {
    status?: unknown;
    statusCode?: unknown;
    type?: unknown;
    code?: unknown;
    message?: unknown;
  };

  if (candidate.status === 413 || candidate.statusCode === 413) return true;
  if (candidate.type === "entity.too.large") return true;
  if (candidate.code === "FST_ERR_CTP_BODY_TOO_LARGE") return true;
  if (typeof candidate.message === "string" && candidate.message.toLowerCase().includes("too large")) {
    return true;
  }

  return false;
}

function isStorageTooLargeError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("string or blob too big") || message.includes("value too long");
}

