export function createMemoryStore() {
    const accounts = new Map();
    const clientProfiles = new Map();
    const restaurantProfiles = new Map();
    const courierProfiles = new Map();
    const restaurants = new Map();
    const menuItems = new Map();
    const carts = new Map();
    const orders = new Map();
    const invoices = new Map();
    const couriers = new Map();
    return { accounts, clientProfiles, restaurantProfiles, courierProfiles, restaurants, menuItems, carts, orders, invoices, couriers };
}
