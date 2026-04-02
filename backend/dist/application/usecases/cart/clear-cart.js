export async function clearCart(deps, clientId) {
    await deps.carts.clearCart(clientId);
}
