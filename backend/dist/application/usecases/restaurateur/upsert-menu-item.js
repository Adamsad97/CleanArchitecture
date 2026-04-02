export async function upsertMenuItem(deps, item) {
    await deps.menus.upsertMenuItem(item);
}
