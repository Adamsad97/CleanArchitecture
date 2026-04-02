export function createMemoryStore() {
    const accounts = new Map();
    const restaurants = new Map();
    const menuItems = new Map();
    const carts = new Map();
    const orders = new Map();
    const invoices = new Map();
    const couriers = new Map();
    const r1 = {
        id: "resto_paris_1",
        name: "Green Bowl Paris",
        location: { lat: 48.8566, lng: 2.3522 },
    };
    const r2 = {
        id: "resto_paris_2",
        name: "Veggie Pasta",
        location: { lat: 48.8666, lng: 2.3333 },
    };
    restaurants.set(r1.id, r1);
    restaurants.set(r2.id, r2);
    const m1 = {
        id: "item_1",
        restaurantId: r1.id,
        name: "Bowl quinoa-avocat",
        description: "Quinoa, avocat, légumes de saison",
        priceCents: 1290,
        allergens: ["sesame"],
        dailyStock: 20,
    };
    const m2 = {
        id: "item_2",
        restaurantId: r1.id,
        name: "Soupe miso",
        description: "Miso, tofu, algues",
        priceCents: 690,
        allergens: ["soy"],
        dailyStock: 30,
    };
    const m3 = {
        id: "item_3",
        restaurantId: r2.id,
        name: "Pasta arrabiata",
        description: "Tomate, ail, piment",
        priceCents: 1190,
        allergens: ["gluten"],
        dailyStock: 15,
    };
    for (const m of [m1, m2, m3])
        menuItems.set(m.id, m);
    const c1 = {
        id: "courier_1",
        displayName: "Sam",
        status: "AVAILABLE",
        level: "STANDARD",
        activeOrderIds: [],
        walletCents: 0,
    };
    const c2 = {
        id: "courier_2",
        displayName: "Lina",
        status: "AVAILABLE",
        level: "EXPERT",
        activeOrderIds: [],
        walletCents: 0,
    };
    couriers.set(c1.id, c1);
    couriers.set(c2.id, c2);
    return { accounts, restaurants, menuItems, carts, orders, invoices, couriers };
}
