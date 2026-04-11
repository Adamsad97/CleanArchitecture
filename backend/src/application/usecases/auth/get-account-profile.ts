import { type AccountRole } from "../../../domain/entities/account.js";
import { type AccountProfile } from "../../../domain/entities/account-profile.js";
import {
  type AccountRepository,
  type ClientProfileRepository,
  type CourierProfileRepository,
  type RestaurantProfileRepository,
} from "../../ports/repositories.js";

export type GetAccountProfileDeps = Readonly<{
  accounts: AccountRepository;
  clientProfiles: ClientProfileRepository;
  courierProfiles: CourierProfileRepository;
  restaurantProfiles: RestaurantProfileRepository;
}>;

export type GetAccountProfileOutput = Readonly<{
  accountId: string;
  role: AccountRole;
  profile: AccountProfile;
}>;

export async function getAccountProfile(
  deps: GetAccountProfileDeps,
  accountId: string
): Promise<GetAccountProfileOutput | null> {
  const account = await deps.accounts.getById(accountId);
  if (!account) return null;

  const profile =
    account.role === "CLIENT"
      ? await deps.clientProfiles.getByAccountId(accountId)
      : account.role === "COURIER"
        ? await deps.courierProfiles.getByAccountId(accountId)
        : await deps.restaurantProfiles.getByAccountId(accountId);

  if (!profile) return null;

  return {
    accountId,
    role: account.role,
    profile,
  };
}
