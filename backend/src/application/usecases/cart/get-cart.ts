import { type Cart } from "../../../domain/entities/cart.js";
import { type CartRepository } from "../../ports/repositories.js";

export type GetCartDeps = Readonly<{ carts: CartRepository }>;

export async function getCart(deps: GetCartDeps, clientId: string): Promise<Cart> {
  return deps.carts.getCart(clientId);
}

