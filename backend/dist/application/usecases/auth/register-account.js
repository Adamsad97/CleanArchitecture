import { Result } from "../../../shared/result.js";
import { AccountEmailAlreadyUsedError, InvalidAccountTypeSelectionError, } from "../../../domain/errors/domain-errors.js";
export async function registerAccount(deps, input) {
    if (!isValidRoleForAccountType(input.accountType, input.actorRole)) {
        return Result.err(new InvalidAccountTypeSelectionError());
    }
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await deps.accounts.getByEmail(normalizedEmail);
    if (existing)
        return Result.err(new AccountEmailAlreadyUsedError());
    const account = {
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
function isValidRoleForAccountType(accountType, actorRole) {
    if (accountType === "BUSINESS")
        return actorRole === "RESTAURANT";
    return actorRole === "CLIENT" || actorRole === "COURIER";
}
function buildDemoToken(accountId) {
    return `demo-token-${accountId}`;
}
