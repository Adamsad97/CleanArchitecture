export async function getAccountProfile(deps, accountId) {
    const account = await deps.accounts.getById(accountId);
    if (!account)
        return null;
    const profile = account.role === "CLIENT"
        ? await deps.clientProfiles.getByAccountId(accountId)
        : account.role === "COURIER"
            ? await deps.courierProfiles.getByAccountId(accountId)
            : await deps.restaurantProfiles.getByAccountId(accountId);
    if (!profile)
        return null;
    return {
        accountId,
        role: account.role,
        profile,
    };
}
