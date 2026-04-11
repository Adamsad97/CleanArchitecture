import { Result } from "../../../shared/result.js";
import { AccountEmailAlreadyUsedError, InvalidAccountTypeSelectionError, } from "../../../domain/errors/domain-errors.js";
export async function registerAccount(deps, input) {
    if (!isValidRoleForAccountType(input.accountType, input.actorRole)) {
        return Result.err(new InvalidAccountTypeSelectionError());
    }
    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedBirthDate = input.actorRole === "RESTAURANT"
        ? input.birthDate?.trim() || deps.clock.nowIso().slice(0, 10)
        : input.birthDate?.trim() || "";
    const existing = await deps.accounts.getByEmail(normalizedEmail);
    if (existing)
        return Result.err(new AccountEmailAlreadyUsedError());
    const account = {
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
        const restaurant = {
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
function isValidRoleForAccountType(accountType, actorRole) {
    if (accountType === "BUSINESS")
        return actorRole === "RESTAURANT";
    return actorRole === "CLIENT" || actorRole === "COURIER";
}
function buildDemoToken(accountId) {
    return `demo-token-${accountId}`;
}
async function createProfileForRole(deps, account) {
    const profile = {
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
