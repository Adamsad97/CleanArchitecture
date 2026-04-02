export function createInMemoryRepositories(store) {
    const accounts = {
        async getById(id) {
            return store.accounts.get(id) ?? null;
        },
        async getByEmail(email) {
            const normalizedEmail = email.trim().toLowerCase();
            for (const account of store.accounts.values()) {
                if (account.email === normalizedEmail)
                    return account;
            }
            return null;
        },
        async create(account) {
            store.accounts.set(account.id, account);
        },
    };
    const restaurants = {
        async listRestaurants() {
            return [...store.restaurants.values()];
        },
        async getRestaurant(id) {
            return store.restaurants.get(id) ?? null;
        },
    };
    const menus = {
        async listMenuItems(restaurantId) {
            return [...store.menuItems.values()].filter((m) => m.restaurantId === restaurantId);
        },
        async getMenuItem(id) {
            return store.menuItems.get(id) ?? null;
        },
        async upsertMenuItem(item) {
            store.menuItems.set(item.id, item);
        },
        async deleteMenuItem(id) {
            store.menuItems.delete(id);
        },
    };
    const carts = {
        async getCart(clientId) {
            return (store.carts.get(clientId) ?? {
                clientId,
                restaurantId: null,
                items: [],
            });
        },
        async saveCart(cart) {
            store.carts.set(cart.clientId, cart);
        },
        async clearCart(clientId) {
            store.carts.set(clientId, { clientId, restaurantId: null, items: [] });
        },
    };
    const orders = {
        async create(order) {
            store.orders.set(order.id, order);
        },
        async get(id) {
            return store.orders.get(id) ?? null;
        },
        async update(order) {
            store.orders.set(order.id, order);
        },
        async listByRestaurant(restaurantId) {
            return [...store.orders.values()].filter((o) => o.restaurantId === restaurantId);
        },
        async listReadyOrPreparing() {
            return [...store.orders.values()].filter((o) => o.status === "PREPARING" || o.status === "READY_FOR_PICKUP");
        },
    };
    const invoices = {
        async create(invoice) {
            store.invoices.set(invoice.id, invoice);
        },
        async get(id) {
            return store.invoices.get(id) ?? null;
        },
    };
    const couriers = {
        async get(id) {
            return store.couriers.get(id) ?? null;
        },
        async upsert(courier) {
            store.couriers.set(courier.id, courier);
        },
        async listAvailable() {
            return [...store.couriers.values()].filter((c) => c.status === "AVAILABLE");
        },
    };
    return { accounts, restaurants, menus, carts, orders, invoices, couriers };
}
