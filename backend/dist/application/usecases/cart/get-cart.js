export async function getCart(deps, clientId) {
    return deps.carts.getCart(clientId);
}
