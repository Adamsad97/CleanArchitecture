import { Result, type Result as ResultT } from "../../../shared/result.js";
import {
  MenuItemOutOfStockError,
  RestaurantNotFoundError,
} from "../../../domain/errors/domain-errors.js";
import { type Invoice, type Order } from "../../../domain/entities/order.js";
import {
  type CartRepository,
  type InvoiceRepository,
  type MenuRepository,
  type OrderRepository,
  type RestaurantRepository,
} from "../../ports/repositories.js";
import { type Clock, type DistanceService, type IdGenerator, type PaymentService } from "../../ports/services.js";

export type PricingPolicy = Readonly<{
  serviceFeeRate: number; // ex: 0.1 pour 10%
  deliveryBaseFeeCents: number;
  deliveryPerKmCents: number;
}>;

export type CheckoutInput = Readonly<{
  clientId: string;
  deliveryAddress: { lat: number; lng: number };
  fulfillmentType?: "DELIVERY" | "PICKUP";
  paymentMethod?: "CARD" | "PAYPAL" | "MOBILE_MONEY" | "CASH";
  tipCents?: number;
}>;

export type CheckoutDeps = Readonly<{
  carts: CartRepository;
  restaurants: RestaurantRepository;
  menus: MenuRepository;
  orders: OrderRepository;
  invoices: InvoiceRepository;
  payments: PaymentService;
  distance: DistanceService;
  clock: Clock;
  ids: IdGenerator;
  pricing: PricingPolicy;
}>;

export async function checkout(
  deps: CheckoutDeps,
  input: CheckoutInput
): Promise<ResultT<{ orderId: string; invoiceId: string }, RestaurantNotFoundError | MenuItemOutOfStockError>> {
  const cart = await deps.carts.getCart(input.clientId);
  if (!cart.restaurantId || cart.items.length === 0) {
    // pas spécifié dans le PDF; on renvoie "out of stock" pour éviter une couche d'erreurs inutile ici
    return Result.err(new MenuItemOutOfStockError());
  }

  const restaurant = await deps.restaurants.getRestaurant(cart.restaurantId);
  if (!restaurant) return Result.err(new RestaurantNotFoundError());

  const menuItemsById = new Map<string, { name: string; priceCents: number }>();
  for (const menuItem of await deps.menus.listMenuItems(cart.restaurantId)) {
    menuItemsById.set(menuItem.id, {
      name: menuItem.name,
      priceCents: menuItem.priceCents,
    });
  }

  for (const cartItem of cart.items) {
    const menuItemSnapshot = menuItemsById.get(cartItem.menuItemId);
    if (!menuItemSnapshot) return Result.err(new MenuItemOutOfStockError());
  }

  const itemsTotalCents = cart.items.reduce(
    (sum, i) => sum + i.unitPriceCents * i.quantity,
    0
  );

  const fulfillmentType = input.fulfillmentType ?? "DELIVERY";
  const paymentMethod = input.paymentMethod ?? "CARD";

  let deliveryFeeCents = 0;
  if (fulfillmentType === "DELIVERY") {
    const deliveryDistanceKm = await deps.distance.distanceKm(restaurant.location, input.deliveryAddress);
    deliveryFeeCents =
      deps.pricing.deliveryBaseFeeCents + Math.round(deliveryDistanceKm * deps.pricing.deliveryPerKmCents);
  }

  const serviceFeeCents = Math.round(itemsTotalCents * deps.pricing.serviceFeeRate);
  const tipCents = fulfillmentType === "DELIVERY" ? input.tipCents ?? 0 : 0;
  const totalCents = itemsTotalCents + deliveryFeeCents + serviceFeeCents + tipCents;

  const orderId = deps.ids.newId();
  const invoiceId = deps.ids.newId();

  const order: Order = {
    id: orderId,
    clientId: input.clientId,
    restaurantId: cart.restaurantId,
    fulfillmentType,
    paymentMethod,
    deliveryAddress: input.deliveryAddress,
    status: "PAID",
    lines: cart.items.map((cartLineItem) => {
      const menuItemSnapshot = menuItemsById.get(cartLineItem.menuItemId)!;
      return {
        menuItemId: cartLineItem.menuItemId,
        name: menuItemSnapshot.name,
        unitPriceCents: cartLineItem.unitPriceCents,
        quantity: cartLineItem.quantity,
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

  try {
    await deps.payments.simulatePayment({ orderId, amountCents: totalCents, paymentMethod });
    await deps.orders.create(order);

    const invoice: Invoice = {
      id: invoiceId,
      orderId,
      createdAt: deps.clock.nowIso(),
      lines: [
        ...order.lines.map((orderLine) => ({
          label: `${orderLine.quantity} x ${orderLine.name}`,
          amountCents: orderLine.unitPriceCents * orderLine.quantity,
        })),
        ...(deliveryFeeCents > 0 ? [{ label: "Frais de livraison", amountCents: deliveryFeeCents }] : []),
        { label: "Frais de service", amountCents: serviceFeeCents },
        ...(tipCents > 0 ? [{ label: "Pourboire", amountCents: tipCents }] : []),
      ],
      totalCents,
    };
    await deps.invoices.create(invoice);
    await deps.carts.clearCart(input.clientId);
  } catch (error) {
    throw error;
  }

  return Result.ok({ orderId, invoiceId });
}

