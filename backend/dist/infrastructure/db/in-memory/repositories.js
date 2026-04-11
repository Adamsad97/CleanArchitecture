const ORDER_STATUS_PREPARING = "PREPARING";
const ORDER_STATUS_READY_FOR_PICKUP = "READY_FOR_PICKUP";
const COURIER_STATUS_AVAILABLE = "AVAILABLE";
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
    const clientProfiles = {
        async create(profile) {
            store.clientProfiles.set(profile.accountId, profile);
        },
        async getByAccountId(accountId) {
            return store.clientProfiles.get(accountId) ?? null;
        },
    };
    const courierProfiles = {
        async create(profile) {
            store.courierProfiles.set(profile.accountId, profile);
        },
        async getByAccountId(accountId) {
            return store.courierProfiles.get(accountId) ?? null;
        },
    };
    const restaurantProfiles = {
        async create(profile) {
            store.restaurantProfiles.set(profile.accountId, profile);
        },
        async getByAccountId(accountId) {
            return store.restaurantProfiles.get(accountId) ?? null;
        },
    };
    const restaurants = {
        async listRestaurants() {
            return [...store.restaurants.values()].map((restaurant) => {
                const profile = store.restaurantProfiles.get(restaurant.id);
                const profileName = profile?.lastName?.trim();
                if (!profileName)
                    return restaurant;
                return { ...restaurant, name: profileName };
            });
        },
        async getRestaurant(id) {
            const restaurant = store.restaurants.get(id);
            if (!restaurant)
                return null;
            const profile = store.restaurantProfiles.get(id);
            const profileName = profile?.lastName?.trim();
            if (!profileName)
                return restaurant;
            return { ...restaurant, name: profileName };
        },
        async create(restaurant) {
            store.restaurants.set(restaurant.id, restaurant);
        },
    };
    const menus = {
        async listMenuItems(restaurantId) {
            return [...store.menuItems.values()].filter((menuItem) => menuItem.restaurantId === restaurantId);
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
            return [...store.orders.values()].filter((order) => order.restaurantId === restaurantId);
        },
        async listReadyOrPreparing() {
            return [...store.orders.values()].filter((order) => order.status === ORDER_STATUS_PREPARING ||
                order.status === ORDER_STATUS_READY_FOR_PICKUP);
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
            return [...store.couriers.values()].filter((courier) => courier.status === COURIER_STATUS_AVAILABLE);
        },
    };
    return { accounts, clientProfiles, courierProfiles, restaurantProfiles, restaurants, menus, carts, orders, invoices, couriers };
}
