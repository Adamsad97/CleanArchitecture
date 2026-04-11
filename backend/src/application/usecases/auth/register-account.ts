import { Result, type Result as ResultT } from "../../../shared/result.js";
import { type Account, type AccountRole } from "../../../domain/entities/account.js";
import { type AccountProfile } from "../../../domain/entities/account-profile.js";
import { type Restaurant } from "../../../domain/entities/restaurant.js";
import {
  AccountEmailAlreadyUsedError,
  InvalidAccountTypeSelectionError,
} from "../../../domain/errors/domain-errors.js";
import {
  type AccountRepository,
  type ClientProfileRepository,
  type CourierProfileRepository,
  type RestaurantRepository,
  type RestaurantProfileRepository,
} from "../../ports/repositories.js";
import { type Clock, type IdGenerator } from "../../ports/services.js";

export type RegisterAccountInput = Readonly<{
  firstName: string;
  lastName: string;
  restaurantName?: string | undefined;
  birthDate?: string | undefined;
  phone: string;
  email: string;
  password: string;
  accountType: "INDIVIDUAL" | "BUSINESS";
  actorRole: "CLIENT" | "COURIER" | "RESTAURANT";
}>;

export type RegisterAccountDeps = Readonly<{
  accounts: AccountRepository;
  restaurants: RestaurantRepository;
  clientProfiles: ClientProfileRepository;
  courierProfiles: CourierProfileRepository;
  restaurantProfiles: RestaurantProfileRepository;
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
  const normalizedBirthDate =
    input.actorRole === "RESTAURANT"
      ? input.birthDate?.trim() || deps.clock.nowIso().slice(0, 10)
      : input.birthDate?.trim() || "";

  const existing = await deps.accounts.getByEmail(normalizedEmail);
  if (existing) return Result.err(new AccountEmailAlreadyUsedError());

  const account: Account = {
    id: deps.ids.newId(),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    birthDate: normalizedBirthDate,
    phone: input.phone.trim(),
    fullName: `${input.firstName.trim()} ${input.lastName.trim()}`,
    email: normalizedEmail,
    password: input.password,
    role: input.actorRole,
    createdAt: deps.clock.nowIso(),
  };

  await deps.accounts.create(account);
  await createProfileForRole(deps, account);

  if (account.role === "RESTAURANT") {
    const restaurant: Restaurant = {
      id: account.id,
      name: input.restaurantName?.trim() || account.fullName,
      location: { lat: 48.8566, lng: 2.3522 },
    };
    await deps.restaurants.create(restaurant);
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

async function createProfileForRole(deps: RegisterAccountDeps, account: Account): Promise<void> {
  const profile: AccountProfile = {
    accountId: account.id,
    firstName: account.firstName,
    lastName: account.lastName,
    birthDate: account.birthDate,
    phone: account.phone,
    fullName: account.fullName,
    createdAt: account.createdAt,
  };

  if (account.role === "CLIENT") {
    await deps.clientProfiles.create(profile);
    return;
  }

  if (account.role === "COURIER") {
    await deps.courierProfiles.create(profile);
    return;
  }

  await deps.restaurantProfiles.create(profile);
}
