import express from "express";
import cors from "cors";
import { z } from "zod";
import { mapErrorToProblem } from "../http-error-mapper.js";
import { addItemToCart } from "../../../application/usecases/cart/add-item-to-cart.js";
import { registerAccount } from "../../../application/usecases/auth/register-account.js";
import { loginAccount } from "../../../application/usecases/auth/login-account.js";
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
import { type AppDeps } from "../../../main/composition-root.js";

export function createExpressApp(deps: AppDeps) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.post("/auth/register", async (req, res) => {
    const body = z
      .object({
        firstName: z.string().min(2),
        lastName: z.string().min(2),
        birthDate: z.string().min(10),
        phone: z.string().min(6),
        email: z.string().email(),
        password: z.string().min(6),
        accountType: z.enum(["INDIVIDUAL", "BUSINESS"]),
        actorRole: z.enum(["CLIENT", "COURIER", "RESTAURANT"]),
      })
      .parse(req.body);

    const result = await registerAccount(
      {
        accounts: deps.accounts,
        ids: deps.ids,
        clock: deps.clock,
      },
      body
    );

    if (!result.ok) {
      const problem = mapErrorToProblem(result.error);
      return res.status(problem.status).json(problem);
    }

    return res.status(201).json(result.value);
  });

  app.post("/auth/login", async (req, res) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
      })
      .parse(req.body);

    const result = await loginAccount(
      {
        accounts: deps.accounts,
      },
      body
    );

    if (!result.ok) {
      const problem = mapErrorToProblem(result.error);
      return res.status(problem.status).json(problem);
    }

    return res.status(200).json(result.value);
  });

  app.get("/restaurants", async (_req, res) => {
    const data = await listRestaurants({ restaurants: deps.restaurants });
    res.json({ restaurants: data });
  });

  app.get("/restaurants/:id/menu", async (req, res) => {
    const items = await listMenu({ menus: deps.menus }, req.params.id);
    res.json({ items });
  });

  app.get("/cart", async (req, res) => {
    const clientId = z.string().min(1).parse(req.query.clientId);
    const cart = await getCart({ carts: deps.carts }, clientId);
    res.json({ cart });
  });

  app.post("/cart/items", async (req, res) => {
    const body = z
      .object({
        clientId: z.string().min(1),
        menuItemId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
      .parse(req.body);
    const result = await addItemToCart(
      { carts: deps.carts, menus: deps.menus },
      body
    );
    if (!result.ok) {
      const problem = mapErrorToProblem(result.error);
      return res.status(problem.status).json(problem);
    }
    res.status(201).json({ ok: true });
  });

  app.delete("/cart", async (req, res) => {
    const clientId = z.string().min(1).parse(req.query.clientId);
    await clearCart({ carts: deps.carts }, clientId);
    res.status(204).send();
  });

  app.post("/checkout", async (req, res) => {
    const body = z
      .object({
        clientId: z.string().min(1),
        deliveryAddress: z.object({ lat: z.number(), lng: z.number() }),
        tipCents: z.number().int().nonnegative().optional(),
      })
      .parse(req.body);

    const input = {
      clientId: body.clientId,
      deliveryAddress: body.deliveryAddress,
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
      return res.status(problem.status).json(problem);
    }
    res.status(201).json(result.value);
  });

  app.get("/invoices/:id", async (req, res) => {
    const invoice = await deps.invoices.get(req.params.id);
    if (!invoice) return res.status(404).json({ status: 404, code: "INVOICE_NOT_FOUND", message: "Facture introuvable" });
    res.json({ invoice });
  });

  // Restaurateur
  app.post("/restaurateur/menu-item", async (req, res) => {
    const body = z
      .object({
        id: z.string().min(1),
        restaurantId: z.string().min(1),
        name: z.string().min(1),
        description: z.string().min(1),
        priceCents: z.number().int().nonnegative(),
        allergens: z.array(z.string()).default([]),
        dailyStock: z.number().int().nonnegative(),
      })
      .parse(req.body);
    await upsertMenuItem({ menus: deps.menus }, body);
    res.status(201).json({ ok: true });
  });

  app.delete("/restaurateur/menu-item/:id", async (req, res) => {
    await deleteMenuItem({ menus: deps.menus }, req.params.id);
    res.status(204).send();
  });

  app.post("/restaurateur/orders/:id/accept", async (req, res) => {
    const body = z.object({ prepTimeMinutes: z.number().int().positive() }).parse(req.body);
    const result = await acceptOrder({ orders: deps.orders }, { orderId: req.params.id, prepTimeMinutes: body.prepTimeMinutes });
    if (!result.ok) {
      const problem = mapErrorToProblem(result.error);
      return res.status(problem.status).json(problem);
    }
    res.json({ ok: true });
  });

  app.post("/restaurateur/orders/:id/refuse", async (req, res) => {
    const result = await refuseOrder({ orders: deps.orders }, req.params.id);
    if (!result.ok) {
      const problem = mapErrorToProblem(result.error);
      return res.status(problem.status).json(problem);
    }
    res.json({ ok: true });
  });

  app.post("/restaurateur/orders/:id/ready", async (req, res) => {
    const result = await markOrderReady({ orders: deps.orders }, req.params.id);
    if (!result.ok) {
      const problem = mapErrorToProblem(result.error);
      return res.status(problem.status).json(problem);
    }
    res.json({ ok: true });
  });

  // Livreur
  app.post("/couriers/:id/status", async (req, res) => {
    const body = z.object({ status: z.enum(["AVAILABLE", "UNAVAILABLE"]) }).parse(req.body);
    const result = await setCourierStatus({ couriers: deps.couriers }, { courierId: req.params.id, status: body.status });
    if (!result.ok) {
      const problem = mapErrorToProblem(result.error);
      return res.status(problem.status).json(problem);
    }
    res.json({ ok: true });
  });

  app.get("/couriers/proposals", async (_req, res) => {
    const orders = await deps.orders.listReadyOrPreparing();
    res.json({ orders });
  });

  app.post("/couriers/:courierId/accept", async (req, res) => {
    const body = z.object({ orderId: z.string().min(1) }).parse(req.body);
    const result = await acceptDelivery({ couriers: deps.couriers, orders: deps.orders }, { courierId: req.params.courierId, orderId: body.orderId });
    if (!result.ok) {
      const problem = mapErrorToProblem(result.error);
      return res.status(problem.status).json(problem);
    }
    res.json({ ok: true });
  });

  app.post("/couriers/:courierId/pickup", async (req, res) => {
    const body = z.object({ orderId: z.string().min(1) }).parse(req.body);
    const result = await pickUpOrder({ orders: deps.orders }, { orderId: body.orderId, courierId: req.params.courierId });
    if (!result.ok) {
      const problem = mapErrorToProblem(result.error);
      return res.status(problem.status).json(problem);
    }
    res.json({ ok: true });
  });

  app.post("/couriers/:courierId/deliver", async (req, res) => {
    const body = z.object({ orderId: z.string().min(1) }).parse(req.body);
    const result = await completeDelivery(
      {
        orders: deps.orders,
        couriers: deps.couriers,
        restaurants: deps.restaurants,
        distance: deps.distance,
        revenue: deps.revenue,
      },
      { orderId: body.orderId, courierId: req.params.courierId }
    );
    if (!result.ok) {
      const problem = mapErrorToProblem(result.error);
      return res.status(problem.status).json(problem);
    }
    res.json(result.value);
  });

  // Error fallback
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (!(err instanceof Error)) {
      console.error("[express] unknown error", err);
    } else if (!("code" in err)) {
      console.error("[express] error", err);
    }
    const problem = mapErrorToProblem(err);
    res.status(problem.status).json(problem);
  });

  return app;
}

