import { Result } from "../../../shared/result.js";
import { MenuItemOutOfStockError, RestaurantNotFoundError, } from "../../../domain/errors/domain-errors.js";
export async function checkout(deps, input) {
    const cart = await deps.carts.getCart(input.clientId);
    if (!cart.restaurantId || cart.items.length === 0) {
        // pas spécifié dans le PDF; on renvoie "out of stock" pour éviter une couche d'erreurs inutile ici
        return Result.err(new MenuItemOutOfStockError());
    }
    const restaurant = await deps.restaurants.getRestaurant(cart.restaurantId);
    if (!restaurant)
        return Result.err(new RestaurantNotFoundError());
    const menuItemsById = new Map();
    for (const item of await deps.menus.listMenuItems(cart.restaurantId)) {
        menuItemsById.set(item.id, { name: item.name, priceCents: item.priceCents, dailyStock: item.dailyStock });
    }
    for (const cartItem of cart.items) {
        const mi = menuItemsById.get(cartItem.menuItemId);
        if (!mi)
            return Result.err(new MenuItemOutOfStockError());
        if (mi.dailyStock <= 0)
            return Result.err(new MenuItemOutOfStockError());
        if (mi.dailyStock < cartItem.quantity)
            return Result.err(new MenuItemOutOfStockError());
    }
    const itemsTotalCents = cart.items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
    const km = await deps.distance.distanceKm(restaurant.location, input.deliveryAddress);
    const deliveryFeeCents = deps.pricing.deliveryBaseFeeCents + Math.round(km * deps.pricing.deliveryPerKmCents);
    const serviceFeeCents = Math.round(itemsTotalCents * deps.pricing.serviceFeeRate);
    const tipCents = input.tipCents ?? 0;
    const totalCents = itemsTotalCents + deliveryFeeCents + serviceFeeCents + tipCents;
    const orderId = deps.ids.newId();
    const invoiceId = deps.ids.newId();
    const order = {
        id: orderId,
        clientId: input.clientId,
        restaurantId: cart.restaurantId,
        deliveryAddress: input.deliveryAddress,
        status: "PAID",
        lines: cart.items.map((ci) => {
            const mi = menuItemsById.get(ci.menuItemId);
            return {
                menuItemId: ci.menuItemId,
                name: mi.name,
                unitPriceCents: ci.unitPriceCents,
                quantity: ci.quantity,
            };
        }),
        prepTimeMinutes: null,
        deliveryFeeCents,
        serviceFeeCents,
        itemsTotalCents,
        totalCents,
        tipCents,
        invoiceId,
        courierId: null,
    };
    await deps.payments.simulatePayment({ orderId, amountCents: totalCents });
    await deps.orders.create(order);
    // Décrémentation du stock journalier des plats achetés
    for (const line of order.lines) {
        const current = await deps.menus.getMenuItem(line.menuItemId);
        if (!current || current.dailyStock < line.quantity) {
            return Result.err(new MenuItemOutOfStockError());
        }
        await deps.menus.upsertMenuItem({
            ...current,
            dailyStock: current.dailyStock - line.quantity,
        });
    }
    const invoice = {
        id: invoiceId,
        orderId,
        createdAt: deps.clock.nowIso(),
        lines: [
            ...order.lines.map((l) => ({
                label: `${l.quantity} x ${l.name}`,
                amountCents: l.unitPriceCents * l.quantity,
            })),
            { label: "Frais de livraison", amountCents: deliveryFeeCents },
            { label: "Frais de service", amountCents: serviceFeeCents },
            ...(tipCents > 0 ? [{ label: "Pourboire", amountCents: tipCents }] : []),
        ],
        totalCents,
    };
    await deps.invoices.create(invoice);
    await deps.carts.clearCart(input.clientId);
    return Result.ok({ orderId, invoiceId });
}
