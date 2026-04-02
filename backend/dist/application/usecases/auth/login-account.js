import { Result } from "../../../shared/result.js";
import { InvalidCredentialsError } from "../../../domain/errors/domain-errors.js";
export async function loginAccount(deps, input) {
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
function buildDemoToken(accountId) {
    return `demo-token-${accountId}`;
}
