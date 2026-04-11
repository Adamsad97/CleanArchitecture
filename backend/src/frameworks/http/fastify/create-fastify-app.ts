import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import { z } from "zod";
import { mapErrorToProblem } from "../http-error-mapper.js";
import { addItemToCart } from "../../../application/usecases/cart/add-item-to-cart.js";
import { registerAccount } from "../../../application/usecases/auth/register-account.js";
import { loginAccount } from "../../../application/usecases/auth/login-account.js";
import { getAccountProfile } from "../../../application/usecases/auth/get-account-profile.js";
import { clearCart } from "../../../application/usecases/cart/clear-cart.js";
import { getCart } from "../../../application/usecases/cart/get-cart.js";
import { checkout } from "../../../application/usecases/orders/checkout.js";
import { listRestaurants } from "../../../application/usecases/restaurants/list-restaurants.js";
import { listMenu } from "../../../application/usecases/restaurants/list-menu.js";
import { deleteMenuItem } from "../../../application/usecases/restaurateur/delete-menu-item.js";
import { upsertMenuItem } from "../../../application/usecases/restaurateur/upsert-menu-item.js";
import { acceptOrder } from "../../../application/usecases/restaurateur/accept-order.js";
import { refuseOrder } from "../../../application/usecases/restaurateur/refuse-order.js";
import { markOrderReady } from "../../../application/usecases/restaurateur/mark-order-ready.js";
import { acceptDelivery } from "../../../application/usecases/couriers/accept-delivery.js";
import { pickUpOrder } from "../../../application/usecases/couriers/pick-up-order.js";
import { completeDelivery } from "../../../application/usecases/couriers/complete-delivery.js";
import { setCourierStatus } from "../../../application/usecases/couriers/set-courier-status.js";
import { registerFastifyPaymentRoutes } from "../payments/register-fastify-payment-routes.js";
import { type AppDeps } from "../../../main/composition-root.js";

const BYTES_PER_MEGABYTE = 1024 * 1024;
const MAX_JSON_BODY_SIZE_MB = 10;
const FASTIFY_BODY_LIMIT_BYTES = MAX_JSON_BODY_SIZE_MB * BYTES_PER_MEGABYTE;
const DEFAULT_FULFILLMENT_TYPE = "DELIVERY";

export function createFastifyApp(deps: AppDeps) {
  const app = Fastify({ logger: true, bodyLimit: FASTIFY_BODY_LIMIT_BYTES });

  app.register(fastifyCors, { origin: true });

  registerFastifyPaymentRoutes(app, deps);
  app.get("/restaurants/:id/menu", async (req) => {
    const params = z.object({ id: z.string().min(1) }).parse((req as any).params);
    const items = await listMenu({ menus: deps.menus }, params.id);
    return { items };
  });

  app.get("/cart", async (req, reply) => {
    try {
      const query = z.object({ clientId: z.string().min(1) }).parse((req as any).query);
      const cart = await getCart({ carts: deps.carts }, query.clientId);
      return { cart };
    } catch (e) {
      const problem = mapErrorToProblem(e);
      return reply.code(problem.status).send(problem);
    }
  });

  app.post("/cart/items", async (req, reply) => {
    try {
      const body = z
        .object({
          clientId: z.string().min(1),
          menuItemId: z.string().min(1),
          quantity: z.number().int().positive(),
        })
        .parse((req as any).body);
      const result = await addItemToCart({ carts: deps.carts, menus: deps.menus }, body);
      if (!result.ok) {
        const problem = mapErrorToProblem(result.error);
        return reply.code(problem.status).send(problem);
      }
      return reply.code(201).send({ ok: true });
    } catch (e) {
      const problem = mapErrorToProblem(e);
      return reply.code(problem.status).send(problem);
    }
  });

  app.delete("/cart", async (req, reply) => {
    const query = z.object({ clientId: z.string().min(1) }).parse((req as any).query);
    await clearCart({ carts: deps.carts }, query.clientId);
    return reply.code(204).send();
  });

  app.post("/payments/card/verify", async (req, reply) => {
    try {
      const body = z
        .object({
          method: z.literal("CARD"),
          provider: z.enum(["VISA", "MASTERCARD"]).default("VISA"),
          cardNumber: z.string().regex(/^\d{16}$/, "cardNumber must contain 16 digits"),
          cardHolder: z.string().min(2),
          cardExpiry: z.string().regex(/^(0[1-9]|1[0-2])\/[0-9]{2}$/, "cardExpiry must be MM/AA"),
          cardCvc: z.string().regex(/^\d{3,4}$/),
        })
        .parse((req as any).body);

      return reply.code(200).send({
        ok: true,
        method: body.method,
        provider: body.provider,
        reference: deps.ids.newId(),
        message: "Paiement carte valide.",
      });
    } catch (e) {
      const problem = mapErrorToProblem(e);
      return reply.code(problem.status).send(problem);
    }
  });

  app.post("/payments/card/visa/verify", async (req, reply) => {
    try {
      const body = z.object({ method: z.literal("CARD"), provider: z.literal("VISA"), cardNumber: z.string().regex(/^\d{16}$/), cardHolder: z.string().min(2), cardExpiry: z.string().regex(/^(0[1-9]|1[0-2])\/[0-9]{2}$/), cardCvc: z.string().regex(/^\d{3,4}$/) }).parse((req as any).body);
      return reply.code(200).send({ ok: true, method: body.method, provider: body.provider, reference: deps.ids.newId(), message: "Paiement VISA valide." });
    } catch (e) {
      const problem = mapErrorToProblem(e);
      return reply.code(problem.status).send(problem);
    }
  });

  app.post("/payments/card/mastercard/verify", async (req, reply) => {
    try {
      const body = z.object({ method: z.literal("CARD"), provider: z.literal("MASTERCARD"), cardNumber: z.string().regex(/^\d{16}$/), cardHolder: z.string().min(2), cardExpiry: z.string().regex(/^(0[1-9]|1[0-2])\/[0-9]{2}$/), cardCvc: z.string().regex(/^\d{3,4}$/) }).parse((req as any).body);
      return reply.code(200).send({ ok: true, method: body.method, provider: body.provider, reference: deps.ids.newId(), message: "Paiement MasterCard valide." });
    } catch (e) {
      const problem = mapErrorToProblem(e);
      return reply.code(problem.status).send(problem);
    }
  });

  app.post("/payments/paypal/verify", async (req, reply) => {
    try {
      const body = z.object({ method: z.literal("PAYPAL"), paypalEmail: z.string().email() }).parse((req as any).body);
      return reply.code(200).send({ ok: true, method: body.method, provider: "PAYPAL", reference: deps.ids.newId(), message: "Paiement PayPal valide." });
    } catch (e) {
      const problem = mapErrorToProblem(e);
      return reply.code(problem.status).send(problem);
    }
  });

  app.post("/payments/mobile-money/verify", async (req, reply) => {
    try {
      const body = z
        .object({
          method: z.literal("MOBILE_MONEY"),
          provider: z.enum(["ORANGE_MONEY", "WAVE"]).default("ORANGE_MONEY"),
          phoneNumber: z.string().min(8),
        })
        .parse((req as any).body);

      return reply.code(200).send({
        ok: true,
        method: body.method,
        provider: body.provider,
        reference: deps.ids.newId(),
        message: "Paiement Mobile Money valide.",
      });
    } catch (e) {
      const problem = mapErrorToProblem(e);
      return reply.code(problem.status).send(problem);
    }
  });

  app.post("/payments/mobile-money/orange-money/verify", async (req, reply) => {
    try {
      const body = z.object({ method: z.literal("MOBILE_MONEY"), provider: z.literal("ORANGE_MONEY"), phoneNumber: z.string().min(8) }).parse((req as any).body);
      return reply.code(200).send({ ok: true, method: body.method, provider: body.provider, reference: deps.ids.newId(), message: "Paiement Orange Money valide." });
    } catch (e) {
      const problem = mapErrorToProblem(e);
      return reply.code(problem.status).send(problem);
    }
  });

  app.post("/payments/mobile-money/wave/verify", async (req, reply) => {
    try {
      const body = z.object({ method: z.literal("MOBILE_MONEY"), provider: z.literal("WAVE"), phoneNumber: z.string().min(8) }).parse((req as any).body);
      return reply.code(200).send({ ok: true, method: body.method, provider: body.provider, reference: deps.ids.newId(), message: "Paiement Wave valide." });
    } catch (e) {
      const problem = mapErrorToProblem(e);
      return reply.code(problem.status).send(problem);
    }
  });

  app.post("/payments/cash/verify", async (req, reply) => {
    try {
      const body = z.object({ method: z.literal("CASH") }).parse((req as any).body);

      return reply.code(200).send({
        ok: true,
        method: body.method,
        provider: "CASH_ON_DELIVERY",
        reference: deps.ids.newId(),
        message: "Paiement en especes valide.",
      });
    } catch (e) {
      const problem = mapErrorToProblem(e);
      return reply.code(problem.status).send(problem);
    }
  });

  app.post("/checkout", async (req, reply) => {
    try {
      const body = z
        .object({
          clientId: z.string().min(1),
          deliveryAddress: z.object({ lat: z.number(), lng: z.number() }),
          fulfillmentType: z.enum(["DELIVERY", "PICKUP"]).optional(),
          paymentMethod: z.enum(["CARD", "PAYPAL", "MOBILE_MONEY", "CASH"]).optional(),
          tipCents: z.number().int().nonnegative().optional(),
        })
        .parse((req as any).body);
      const input = {
        clientId: body.clientId,
        deliveryAddress: body.deliveryAddress,
        ...(body.fulfillmentType ? { fulfillmentType: body.fulfillmentType } : {}),
        ...(body.paymentMethod ? { paymentMethod: body.paymentMethod } : {}),
        ...(body.tipCents !== undefined ? { tipCents: body.tipCents } : {}),
      };
      const result = await checkout(
        {
          carts: deps.carts,
          restaurants: deps.restaurants,
          menus: deps.menus,
          orders: deps.orders,
          invoices: deps.invoices,
          payments: deps.payments,
          distance: deps.distance,
          clock: deps.clock,
          ids: deps.ids,
          pricing: deps.pricing,
        },
        input
      );
      if (!result.ok) {
        const problem = mapErrorToProblem(result.error);
        return reply.code(problem.status).send(problem);
      }
      return reply.code(201).send(result.value);
    } catch (e) {
      const problem = mapErrorToProblem(e);
      return reply.code(problem.status).send(problem);
    }
  });

  app.get("/orders/:id", async (req, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse((req as any).params);
    const query = z.object({ clientId: z.string().min(1).optional() }).parse((req as any).query ?? {});

    const order = await deps.orders.get(params.id);
    if (!order) {
      return reply.code(404).send({ status: 404, code: "ORDER_NOT_FOUND", message: "Commande introuvable" });
    }

    if (query.clientId && order.clientId !== query.clientId) {
      return reply.code(403).send({ status: 403, code: "ORDER_FORBIDDEN", message: "Commande non accessible" });
    }

    return { order };
  });

  app.get("/invoices/:id", async (req, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse((req as any).params);
    const invoice = await deps.invoices.get(params.id);
    if (!invoice) return reply.code(404).send({ status: 404, code: "INVOICE_NOT_FOUND", message: "Facture introuvable" });
    return { invoice };
  });

  // Restaurateur
  app.post("/restaurateur/menu-item", async (req, reply) => {
    const body = z
      .object({
        id: z.string().min(1),
        restaurantId: z.string().min(1),
        name: z.string().min(1),
        description: z.string().min(1),
        priceCents: z.number().int().nonnegative(),
        imageUrl: z.string().nullable().default(null),
        allergens: z.array(z.string()).default([]),
        dailyStock: z.number().int().nonnegative(),
      })
      .parse((req as any).body);
    const result = await upsertMenuItem({ menus: deps.menus, restaurants: deps.restaurants }, body);
    if (!result.ok) {
      const problem = mapErrorToProblem(result.error);
      return reply.code(problem.status).send(problem);
    }
    return reply.code(201).send({ ok: true });
  });

  app.delete("/restaurateur/menu-item/:id", async (req, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse((req as any).params);
    await deleteMenuItem({ menus: deps.menus }, params.id);
    return reply.code(204).send();
  });

  app.post("/restaurateur/orders/:id/accept", async (req, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse((req as any).params);
    const body = z.object({ prepTimeMinutes: z.number().int().positive() }).parse((req as any).body);
    const result = await acceptOrder({ orders: deps.orders }, { orderId: params.id, prepTimeMinutes: body.prepTimeMinutes });
    if (!result.ok) {
      const problem = mapErrorToProblem(result.error);
      return reply.code(problem.status).send(problem);
    }
    return { ok: true };
  });

  app.post("/restaurateur/orders/:id/refuse", async (req, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse((req as any).params);
    const result = await refuseOrder({ orders: deps.orders }, params.id);
    if (!result.ok) {
      const problem = mapErrorToProblem(result.error);
      return reply.code(problem.status).send(problem);
    }
    return { ok: true };
  });

  app.post("/restaurateur/orders/:id/ready", async (req, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse((req as any).params);
    const result = await markOrderReady({ orders: deps.orders }, params.id);
    if (!result.ok) {
      const problem = mapErrorToProblem(result.error);
      return reply.code(problem.status).send(problem);
    }
    return { ok: true };
  });

  // Livreur
  app.post("/couriers/:id/status", async (req, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse((req as any).params);
    const body = z.object({ status: z.enum(["AVAILABLE", "UNAVAILABLE"]) }).parse((req as any).body);
    const result = await setCourierStatus({ couriers: deps.couriers }, { courierId: params.id, status: body.status });
    if (!result.ok) {
      const problem = mapErrorToProblem(result.error);
      return reply.code(problem.status).send(problem);
    }
    return { ok: true };
  });

  app.get("/couriers/proposals", async () => {
    const orders = await deps.orders.listReadyOrPreparing();
    return {
      orders: orders.filter(
        (order) =>
          (order.fulfillmentType ?? DEFAULT_FULFILLMENT_TYPE) ===
          DEFAULT_FULFILLMENT_TYPE
      ),
    };
  });

  app.post("/couriers/:courierId/accept", async (req, reply) => {
    const params = z.object({ courierId: z.string().min(1) }).parse((req as any).params);
    const body = z.object({ orderId: z.string().min(1) }).parse((req as any).body);
    const result = await acceptDelivery({ couriers: deps.couriers, orders: deps.orders }, { courierId: params.courierId, orderId: body.orderId });
    if (!result.ok) {
      const problem = mapErrorToProblem(result.error);
      return reply.code(problem.status).send(problem);
    }
    return { ok: true };
  });

  app.post("/couriers/:courierId/pickup", async (req, reply) => {
    const params = z.object({ courierId: z.string().min(1) }).parse((req as any).params);
    const body = z.object({ orderId: z.string().min(1) }).parse((req as any).body);
    const result = await pickUpOrder({ orders: deps.orders }, { orderId: body.orderId, courierId: params.courierId });
    if (!result.ok) {
      const problem = mapErrorToProblem(result.error);
      return reply.code(problem.status).send(problem);
    }
    return { ok: true };
  });

  app.post("/couriers/:courierId/deliver", async (req, reply) => {
    const params = z.object({ courierId: z.string().min(1) }).parse((req as any).params);
    const body = z.object({ orderId: z.string().min(1) }).parse((req as any).body);
    const result = await completeDelivery(
      {
        orders: deps.orders,
        couriers: deps.couriers,
        restaurants: deps.restaurants,
        distance: deps.distance,
        revenue: deps.revenue,
      },
      { orderId: body.orderId, courierId: params.courierId }
    );
    if (!result.ok) {
      const problem = mapErrorToProblem(result.error);
      return reply.code(problem.status).send(problem);
    }
    return result.value;
  });

  app.setErrorHandler((err, _req, reply) => {
    const problem = mapErrorToProblem(err);
    reply.code(problem.status).send(problem);
  });

  return app;
}

