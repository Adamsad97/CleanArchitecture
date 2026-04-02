export async function listMenu(deps, restaurantId) {
    return deps.menus.listMenuItems(restaurantId);
}
