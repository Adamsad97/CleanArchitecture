const parseJson = (json) => JSON.parse(json);
const toJson = (value) => JSON.stringify(value);
const ORDER_STATUS_PREPARING = "PREPARING";
const ORDER_STATUS_READY_FOR_PICKUP = "READY_FOR_PICKUP";
const COURIER_STATUS_AVAILABLE = "AVAILABLE";
export function createSqliteRepositories(db) {
    const accounts = {
        async getById(id) {
            const accountRow = db.get("SELECT account_json FROM accounts WHERE id=?", [id]);
            return accountRow ? parseJson(accountRow.account_json) : null;
        },
        async getByEmail(email) {
            const normalizedEmail = email.trim().toLowerCase();
            const accountRow = db.get("SELECT account_json FROM accounts WHERE email=?", [normalizedEmail]);
            return accountRow ? parseJson(accountRow.account_json) : null;
        },
        async create(account) {
            db.run("INSERT INTO accounts(id, email, account_json) VALUES(?, ?, ?)", [
                account.id,
                account.email,
                toJson(account),
            ]);
            db.persist();
        },
    };
    const clientProfiles = {
        async create(profile) {
            db.run(`INSERT INTO client_profiles(account_id, first_name, last_name, birth_date, phone, full_name, created_at)
         VALUES(?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(account_id) DO UPDATE SET
           first_name=excluded.first_name,
           last_name=excluded.last_name,
           birth_date=excluded.birth_date,
           phone=excluded.phone,
           full_name=excluded.full_name,
           created_at=excluded.created_at`, [
                profile.accountId,
                profile.firstName,
                profile.lastName,
                profile.birthDate,
                profile.phone,
                profile.fullName,
                profile.createdAt,
            ]);
            db.persist();
        },
        async getByAccountId(accountId) {
            const clientProfileRow = db.get("SELECT account_id, first_name, last_name, birth_date, phone, full_name, created_at FROM client_profiles WHERE account_id=?", [accountId]);
            if (!clientProfileRow)
                return null;
            return {
                accountId: clientProfileRow.account_id,
                firstName: clientProfileRow.first_name,
                lastName: clientProfileRow.last_name,
                birthDate: clientProfileRow.birth_date,
                phone: clientProfileRow.phone,
                fullName: clientProfileRow.full_name,
                createdAt: clientProfileRow.created_at,
            };
        },
    };
    const courierProfiles = {
        async create(profile) {
            db.run(`INSERT INTO courier_profiles(account_id, first_name, last_name, birth_date, phone, full_name, created_at)
         VALUES(?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(account_id) DO UPDATE SET
           first_name=excluded.first_name,
           last_name=excluded.last_name,
           birth_date=excluded.birth_date,
           phone=excluded.phone,
           full_name=excluded.full_name,
           created_at=excluded.created_at`, [
                profile.accountId,
                profile.firstName,
                profile.lastName,
                profile.birthDate,
                profile.phone,
                profile.fullName,
                profile.createdAt,
            ]);
            db.persist();
        },
        async getByAccountId(accountId) {
            const courierProfileRow = db.get("SELECT account_id, first_name, last_name, birth_date, phone, full_name, created_at FROM courier_profiles WHERE account_id=?", [accountId]);
            if (!courierProfileRow)
                return null;
            return {
                accountId: courierProfileRow.account_id,
                firstName: courierProfileRow.first_name,
                lastName: courierProfileRow.last_name,
                birthDate: courierProfileRow.birth_date,
                phone: courierProfileRow.phone,
                fullName: courierProfileRow.full_name,
                createdAt: courierProfileRow.created_at,
            };
        },
    };
    const restaurantProfiles = {
        async create(profile) {
            db.run(`INSERT INTO restaurant_profiles(account_id, first_name, last_name, birth_date, phone, full_name, created_at)
         VALUES(?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(account_id) DO UPDATE SET
           first_name=excluded.first_name,
           last_name=excluded.last_name,
           birth_date=excluded.birth_date,
           phone=excluded.phone,
           full_name=excluded.full_name,
           created_at=excluded.created_at`, [
                profile.accountId,
                profile.firstName,
                profile.lastName,
                profile.birthDate,
                profile.phone,
                profile.fullName,
                profile.createdAt,
            ]);
            db.persist();
        },
        async getByAccountId(accountId) {
            const restaurantProfileRow = db.get("SELECT account_id, first_name, last_name, birth_date, phone, full_name, created_at FROM restaurant_profiles WHERE account_id=?", [accountId]);
            if (!restaurantProfileRow)
                return null;
            return {
                accountId: restaurantProfileRow.account_id,
                firstName: restaurantProfileRow.first_name,
                lastName: restaurantProfileRow.last_name,
                birthDate: restaurantProfileRow.birth_date,
                phone: restaurantProfileRow.phone,
                fullName: restaurantProfileRow.full_name,
                createdAt: restaurantProfileRow.created_at,
            };
        },
    };
    const restaurants = {
        async listRestaurants() {
            const restaurantRows = db.all(`SELECT
           r.id,
           CASE
             WHEN rp.last_name IS NOT NULL AND TRIM(rp.last_name) <> '' THEN rp.last_name
             ELSE r.name
           END AS name,
           r.lat,
           r.lng
         FROM restaurants r
         LEFT JOIN restaurant_profiles rp ON rp.account_id = r.id`);
            return restaurantRows.map((restaurantRow) => ({
                id: restaurantRow.id,
                name: restaurantRow.name,
                location: { lat: restaurantRow.lat, lng: restaurantRow.lng },
            }));
        },
        async getRestaurant(id) {
            const restaurantRow = db.get(`SELECT
           r.id,
           CASE
             WHEN rp.last_name IS NOT NULL AND TRIM(rp.last_name) <> '' THEN rp.last_name
             ELSE r.name
           END AS name,
           r.lat,
           r.lng
         FROM restaurants r
         LEFT JOIN restaurant_profiles rp ON rp.account_id = r.id
         WHERE r.id=?`, [id]);
            if (!restaurantRow)
                return null;
            return {
                id: restaurantRow.id,
                name: restaurantRow.name,
                location: { lat: restaurantRow.lat, lng: restaurantRow.lng },
            };
        },
        async create(restaurant) {
            db.run(`INSERT INTO restaurants(id, name, lat, lng) VALUES(?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name,
           lat=excluded.lat,
           lng=excluded.lng`, [restaurant.id, restaurant.name, restaurant.location.lat, restaurant.location.lng]);
            db.persist();
        },
    };
    const menus = {
        async listMenuItems(restaurantId) {
            const menuItemRows = db.all("SELECT id, restaurant_id, name, description, price_cents, image_url, allergens_json, daily_stock FROM menu_items WHERE restaurant_id=?", [restaurantId]);
            return menuItemRows.map((menuItemRow) => ({
                id: menuItemRow.id,
                restaurantId: menuItemRow.restaurant_id,
                name: menuItemRow.name,
                description: menuItemRow.description,
                priceCents: menuItemRow.price_cents,
                imageUrl: menuItemRow.image_url ?? null,
                allergens: parseJson(menuItemRow.allergens_json),
                dailyStock: menuItemRow.daily_stock,
            }));
        },
        async getMenuItem(id) {
            const menuItemRow = db.get("SELECT id, restaurant_id, name, description, price_cents, image_url, allergens_json, daily_stock FROM menu_items WHERE id=?", [id]);
            if (!menuItemRow)
                return null;
            return {
                id: menuItemRow.id,
                restaurantId: menuItemRow.restaurant_id,
                name: menuItemRow.name,
                description: menuItemRow.description,
                priceCents: menuItemRow.price_cents,
                imageUrl: menuItemRow.image_url ?? null,
                allergens: parseJson(menuItemRow.allergens_json),
                dailyStock: menuItemRow.daily_stock,
            };
        },
        async upsertMenuItem(item) {
            db.run(`INSERT INTO menu_items(id, restaurant_id, name, description, price_cents, image_url, allergens_json, daily_stock)
         VALUES(?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           restaurant_id=excluded.restaurant_id,
           name=excluded.name,
           description=excluded.description,
           price_cents=excluded.price_cents,
           image_url=excluded.image_url,
           allergens_json=excluded.allergens_json,
           daily_stock=excluded.daily_stock`, [
                item.id,
                item.restaurantId,
                item.name,
                item.description,
                item.priceCents,
                item.imageUrl,
                toJson(item.allergens),
                item.dailyStock,
            ]);
            db.persist();
        },
        async deleteMenuItem(id) {
            db.run("DELETE FROM menu_items WHERE id=?", [id]);
            db.persist();
        },
    };
    const carts = {
        async getCart(clientId) {
            const cartRow = db.get("SELECT cart_json FROM carts WHERE client_id=?", [clientId]);
            if (!cartRow)
                return { clientId, restaurantId: null, items: [] };
            return parseJson(cartRow.cart_json);
        },
        async saveCart(cart) {
            db.run(`INSERT INTO carts(client_id, cart_json) VALUES(?, ?)
         ON CONFLICT(client_id) DO UPDATE SET cart_json=excluded.cart_json`, [cart.clientId, toJson(cart)]);
            db.persist();
        },
        async clearCart(clientId) {
            const cart = { clientId, restaurantId: null, items: [] };
            await carts.saveCart(cart);
        },
    };
    const orders = {
        async create(order) {
            db.run("INSERT INTO orders(id, order_json) VALUES(?, ?)", [order.id, toJson(order)]);
            db.persist();
        },
        async get(id) {
            const orderRow = db.get("SELECT order_json FROM orders WHERE id=?", [id]);
            return orderRow ? parseJson(orderRow.order_json) : null;
        },
        async update(order) {
            db.run("UPDATE orders SET order_json=? WHERE id=?", [toJson(order), order.id]);
            db.persist();
        },
        async listByRestaurant(restaurantId) {
            const orderRows = db.all("SELECT order_json FROM orders");
            return orderRows
                .map((orderRow) => parseJson(orderRow.order_json))
                .filter((order) => order.restaurantId === restaurantId);
        },
        async listReadyOrPreparing() {
            const orderRows = db.all("SELECT order_json FROM orders");
            return orderRows
                .map((orderRow) => parseJson(orderRow.order_json))
                .filter((order) => order.status === ORDER_STATUS_PREPARING ||
                order.status === ORDER_STATUS_READY_FOR_PICKUP);
        },
    };
    const invoices = {
        async create(invoice) {
            db.run("INSERT INTO invoices(id, invoice_json) VALUES(?, ?)", [invoice.id, toJson(invoice)]);
            db.persist();
        },
        async get(id) {
            const invoiceRow = db.get("SELECT invoice_json FROM invoices WHERE id=?", [id]);
            return invoiceRow ? parseJson(invoiceRow.invoice_json) : null;
        },
    };
    const couriers = {
        async get(id) {
            const courierRow = db.get("SELECT courier_json FROM couriers WHERE id=?", [id]);
            return courierRow ? parseJson(courierRow.courier_json) : null;
        },
        async upsert(courier) {
            db.run(`INSERT INTO couriers(id, courier_json) VALUES(?, ?)
         ON CONFLICT(id) DO UPDATE SET courier_json=excluded.courier_json`, [courier.id, toJson(courier)]);
            db.persist();
        },
        async listAvailable() {
            const courierRows = db.all("SELECT courier_json FROM couriers");
            return courierRows
                .map((courierRow) => parseJson(courierRow.courier_json))
                .filter((courier) => courier.status === COURIER_STATUS_AVAILABLE);
        },
    };
    function seedIfEmpty() {
        const restaurantCountRow = db.get("SELECT COUNT(*) as c FROM restaurants");
        const restaurantCount = restaurantCountRow?.c ?? 0;
        if (restaurantCount > 0)
            return;
        // No seed data - only display restaurants and menu items created by users
        db.persist();
    }
    return { accounts, clientProfiles, courierProfiles, restaurantProfiles, restaurants, menus, carts, orders, invoices, couriers, seedIfEmpty };
}
