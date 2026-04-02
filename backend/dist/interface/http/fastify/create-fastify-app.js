import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
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
export function createFastifyApp(deps) {
    const app = Fastify({ logger: true });
    app.register(fastifyCors, { origin: true });
    app.get("/health", async () => ({ ok: true }));
    app.post("/auth/register", async (req, reply) => {
        try {
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
            const result = await registerAccount({
                accounts: deps.accounts,
                ids: deps.ids,
                clock: deps.clock,
            }, body);
            if (!result.ok) {
                const problem = mapErrorToProblem(result.error);
                return reply.code(problem.status).send(problem);
            }
            return reply.code(201).send(result.value);
        }
        catch (e) {
            const problem = mapErrorToProblem(e);
            return reply.code(problem.status).send(problem);
        }
    });
    app.post("/auth/login", async (req, reply) => {
        try {
            const body = z
                .object({
                email: z.string().email(),
                password: z.string().min(6),
            })
                .parse(req.body);
            const result = await loginAccount({
                accounts: deps.accounts,
            }, body);
            if (!result.ok) {
                const problem = mapErrorToProblem(result.error);
                return reply.code(problem.status).send(problem);
            }
            return reply.code(200).send(result.value);
        }
        catch (e) {
            const problem = mapErrorToProblem(e);
            return reply.code(problem.status).send(problem);
        }
    });
    app.get("/restaurants", async () => {
        const restaurants = await listRestaurants({ restaurants: deps.restaurants });
        return { restaurants };
    });
    app.get("/restaurants/:id/menu", async (req) => {
        const params = z.object({ id: z.string().min(1) }).parse(req.params);
        const items = await listMenu({ menus: deps.menus }, params.id);
        return { items };
    });
    app.get("/cart", async (req, reply) => {
        try {
            const query = z.object({ clientId: z.string().min(1) }).parse(req.query);
            const cart = await getCart({ carts: deps.carts }, query.clientId);
            return { cart };
        }
        catch (e) {
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
                .parse(req.body);
            const result = await addItemToCart({ carts: deps.carts, menus: deps.menus }, body);
            if (!result.ok) {
                const problem = mapErrorToProblem(result.error);
                return reply.code(problem.status).send(problem);
            }
            return reply.code(201).send({ ok: true });
        }
        catch (e) {
            const problem = mapErrorToProblem(e);
            return reply.code(problem.status).send(problem);
        }
    });
    app.delete("/cart", async (req, reply) => {
        const query = z.object({ clientId: z.string().min(1) }).parse(req.query);
        await clearCart({ carts: deps.carts }, query.clientId);
        return reply.code(204).send();
    });
    app.post("/checkout", async (req, reply) => {
        try {
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
            const result = await checkout({
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
            }, input);
            if (!result.ok) {
                const problem = mapErrorToProblem(result.error);
                return reply.code(problem.status).send(problem);
            }
            return reply.code(201).send(result.value);
        }
        catch (e) {
            const problem = mapErrorToProblem(e);
            return reply.code(problem.status).send(problem);
        }
    });
    app.get("/invoices/:id", async (req, reply) => {
        const params = z.object({ id: z.string().min(1) }).parse(req.params);
        const invoice = await deps.invoices.get(params.id);
        if (!invoice)
            return reply.code(404).send({ status: 404, code: "INVOICE_NOT_FOUND", message: "Facture introuvable" });
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
            allergens: z.array(z.string()).default([]),
            dailyStock: z.number().int().nonnegative(),
        })
            .parse(req.body);
        await upsertMenuItem({ menus: deps.menus }, body);
        return reply.code(201).send({ ok: true });
    });
    app.delete("/restaurateur/menu-item/:id", async (req, reply) => {
        const params = z.object({ id: z.string().min(1) }).parse(req.params);
        await deleteMenuItem({ menus: deps.menus }, params.id);
        return reply.code(204).send();
    });
    app.post("/restaurateur/orders/:id/accept", async (req, reply) => {
        const params = z.object({ id: z.string().min(1) }).parse(req.params);
        const body = z.object({ prepTimeMinutes: z.number().int().positive() }).parse(req.body);
        const result = await acceptOrder({ orders: deps.orders }, { orderId: params.id, prepTimeMinutes: body.prepTimeMinutes });
        if (!result.ok) {
            const problem = mapErrorToProblem(result.error);
            return reply.code(problem.status).send(problem);
        }
        return { ok: true };
    });
    app.post("/restaurateur/orders/:id/refuse", async (req, reply) => {
        const params = z.object({ id: z.string().min(1) }).parse(req.params);
        const result = await refuseOrder({ orders: deps.orders }, params.id);
        if (!result.ok) {
            const problem = mapErrorToProblem(result.error);
            return reply.code(problem.status).send(problem);
        }
        return { ok: true };
    });
    app.post("/restaurateur/orders/:id/ready", async (req, reply) => {
        const params = z.object({ id: z.string().min(1) }).parse(req.params);
        const result = await markOrderReady({ orders: deps.orders }, params.id);
        if (!result.ok) {
            const problem = mapErrorToProblem(result.error);
            return reply.code(problem.status).send(problem);
        }
        return { ok: true };
    });
    // Livreur
    app.post("/couriers/:id/status", async (req, reply) => {
        const params = z.object({ id: z.string().min(1) }).parse(req.params);
        const body = z.object({ status: z.enum(["AVAILABLE", "UNAVAILABLE"]) }).parse(req.body);
        const result = await setCourierStatus({ couriers: deps.couriers }, { courierId: params.id, status: body.status });
        if (!result.ok) {
            const problem = mapErrorToProblem(result.error);
            return reply.code(problem.status).send(problem);
        }
        return { ok: true };
    });
    app.get("/couriers/proposals", async () => {
        const orders = await deps.orders.listReadyOrPreparing();
        return { orders };
    });
    app.post("/couriers/:courierId/accept", async (req, reply) => {
        const params = z.object({ courierId: z.string().min(1) }).parse(req.params);
        const body = z.object({ orderId: z.string().min(1) }).parse(req.body);
        const result = await acceptDelivery({ couriers: deps.couriers, orders: deps.orders }, { courierId: params.courierId, orderId: body.orderId });
        if (!result.ok) {
            const problem = mapErrorToProblem(result.error);
            return reply.code(problem.status).send(problem);
        }
        return { ok: true };
    });
    app.post("/couriers/:courierId/pickup", async (req, reply) => {
        const params = z.object({ courierId: z.string().min(1) }).parse(req.params);
        const body = z.object({ orderId: z.string().min(1) }).parse(req.body);
        const result = await pickUpOrder({ orders: deps.orders }, { orderId: body.orderId, courierId: params.courierId });
        if (!result.ok) {
            const problem = mapErrorToProblem(result.error);
            return reply.code(problem.status).send(problem);
        }
        return { ok: true };
    });
    app.post("/couriers/:courierId/deliver", async (req, reply) => {
        const params = z.object({ courierId: z.string().min(1) }).parse(req.params);
        const body = z.object({ orderId: z.string().min(1) }).parse(req.body);
        const result = await completeDelivery({
            orders: deps.orders,
            couriers: deps.couriers,
            restaurants: deps.restaurants,
            distance: deps.distance,
            revenue: deps.revenue,
        }, { orderId: body.orderId, courierId: params.courierId });
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
