export async function deleteMenuItem(deps, menuItemId) {
    await deps.menus.deleteMenuItem(menuItemId);
}
