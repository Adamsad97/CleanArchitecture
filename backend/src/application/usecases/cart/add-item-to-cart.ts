import { Result, type Result as ResultT } from "../../../shared/result.js";
import { CartRestaurantMismatchError, MenuItemOutOfStockError } from "../../../domain/errors/domain-errors.js";
import { type CartRepository, type MenuRepository } from "../../ports/repositories.js";

export type AddItemToCartInput = Readonly<{
  clientId: string;
  menuItemId: string;
  quantity: number;
}>;

export type AddItemToCartDeps = Readonly<{
  carts: CartRepository;
  menus: MenuRepository;
}>;

export async function addItemToCart(
  deps: AddItemToCartDeps,
  input: AddItemToCartInput
): Promise<ResultT<{ clientId: string }, CartRestaurantMismatchError | MenuItemOutOfStockError>> {
  const menuItem = await deps.menus.getMenuItem(input.menuItemId);
  if (!menuItem) {
    // Le PDF ne décrit pas précisément cette erreur; on garde ça comme "out of stock" côté règle d’achat.
    return Result.err(new MenuItemOutOfStockError());
  }
  if (menuItem.dailyStock <= 0) return Result.err(new MenuItemOutOfStockError());

  const cart = await deps.carts.getCart(input.clientId);

  if (cart.restaurantId && cart.restaurantId !== menuItem.restaurantId) {
    return Result.err(new CartRestaurantMismatchError());
  }

  const existing = cart.items.find((i) => i.menuItemId === input.menuItemId);
  const nextItems = existing
    ? cart.items.map((i) =>
        i.menuItemId === input.menuItemId
          ? { ...i, quantity: i.quantity + input.quantity }
          : i
      )
    : [
        ...cart.items,
        {
          menuItemId: input.menuItemId,
          quantity: input.quantity,
          unitPriceCents: menuItem.priceCents,
        },
      ];

  await deps.carts.saveCart({
    ...cart,
    restaurantId: menuItem.restaurantId,
    items: nextItems,
  });

  return Result.ok({ clientId: input.clientId });
}

