import { Result, type Result as ResultT } from "../../../shared/result.js";
import { type Account, type AccountRole } from "../../../domain/entities/account.js";
import {
  AccountEmailAlreadyUsedError,
  InvalidAccountTypeSelectionError,
} from "../../../domain/errors/domain-errors.js";
import { type AccountRepository } from "../../ports/repositories.js";
import { type Clock, type IdGenerator } from "../../ports/services.js";

export type RegisterAccountInput = Readonly<{
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  email: string;
  password: string;
  accountType: "INDIVIDUAL" | "BUSINESS";
  actorRole: "CLIENT" | "COURIER" | "RESTAURANT";
}>;

export type RegisterAccountDeps = Readonly<{
  accounts: AccountRepository;
  ids: IdGenerator;
  clock: Clock;
}>;

export type RegisterAccountOutput = Readonly<{
  token: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: AccountRole;
  };
}>;

export async function registerAccount(
  deps: RegisterAccountDeps,
  input: RegisterAccountInput
): Promise<ResultT<RegisterAccountOutput, AccountEmailAlreadyUsedError | InvalidAccountTypeSelectionError>> {
  if (!isValidRoleForAccountType(input.accountType, input.actorRole)) {
    return Result.err(new InvalidAccountTypeSelectionError());
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await deps.accounts.getByEmail(normalizedEmail);
  if (existing) return Result.err(new AccountEmailAlreadyUsedError());

  const account: Account = {
    id: deps.ids.newId(),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    birthDate: input.birthDate,
    phone: input.phone.trim(),
    fullName: `${input.firstName.trim()} ${input.lastName.trim()}`,
    email: normalizedEmail,
    password: input.password,
    role: input.actorRole,
    createdAt: deps.clock.nowIso(),
  };

  await deps.accounts.create(account);

  return Result.ok({
    token: buildDemoToken(account.id),
    user: {
      id: account.id,
      fullName: account.fullName,
      email: account.email,
      role: account.role,
    },
  });
}

function isValidRoleForAccountType(
  accountType: "INDIVIDUAL" | "BUSINESS",
  actorRole: "CLIENT" | "COURIER" | "RESTAURANT"
): boolean {
  if (accountType === "BUSINESS") return actorRole === "RESTAURANT";
  return actorRole === "CLIENT" || actorRole === "COURIER";
}

function buildDemoToken(accountId: string): string {
  return `demo-token-${accountId}`;
}
