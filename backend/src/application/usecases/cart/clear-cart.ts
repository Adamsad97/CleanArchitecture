import { type CartRepository } from "../../ports/repositories.js";

export type ClearCartDeps = Readonly<{ carts: CartRepository }>;

export async function clearCart(deps: ClearCartDeps, clientId: string): Promise<void> {
  await deps.carts.clearCart(clientId);
}

