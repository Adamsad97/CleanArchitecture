import { Result, type Result as ResultT } from "../../../shared/result.js";
import { type AccountRole } from "../../../domain/entities/account.js";
import { InvalidCredentialsError } from "../../../domain/errors/domain-errors.js";
import { type AccountRepository } from "../../ports/repositories.js";

export type LoginAccountInput = Readonly<{
  email: string;
  password: string;
}>;

export type LoginAccountDeps = Readonly<{
  accounts: AccountRepository;
}>;

export type LoginAccountOutput = Readonly<{
  token: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: AccountRole;
  };
}>;

export async function loginAccount(
  deps: LoginAccountDeps,
  input: LoginAccountInput
): Promise<ResultT<LoginAccountOutput, InvalidCredentialsError>> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const account = await deps.accounts.getByEmail(normalizedEmail);

  if (!account || account.password !== input.password) {
    return Result.err(new InvalidCredentialsError());
  }

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

function buildDemoToken(accountId: string): string {
  return `demo-token-${accountId}`;
}
