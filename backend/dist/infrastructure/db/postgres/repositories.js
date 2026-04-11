const toJson = (value) => JSON.stringify(value);
function fromJson(value) {
    if (typeof value === "string")
        return JSON.parse(value);
    return value;
}
export function createPostgresRepositories(db) {
    const accounts = {
        async getById(id) {
            const accountRows = await db.query("SELECT account_json FROM accounts WHERE id=$1", [id]);
            const accountRow = accountRows[0];
            return accountRow ? fromJson(accountRow.account_json) : null;
        },
        async getByEmail(email) {
            const normalizedEmail = email.trim().toLowerCase();
            const accountRows = await db.query("SELECT account_json FROM accounts WHERE email=$1", [normalizedEmail]);
            const accountRow = accountRows[0];
            return accountRow ? fromJson(accountRow.account_json) : null;
        },
        async create(account) {
            await db.query("INSERT INTO accounts(id, email, account_json) VALUES($1, $2, $3::jsonb)", [account.id, account.email, toJson(account)]);
        },
    };
    const clientProfiles = {
        async create(profile) {
            await db.query(`INSERT INTO client_profiles(account_id, first_name, last_name, birth_date, phone, full_name, created_at)
         VALUES($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT(account_id) DO UPDATE SET
           first_name=excluded.first_name,
           last_name=excluded.last_name,
           birth_date=excluded.birth_date,
           phone=excluded.phone,
           full_name=excluded.full_name,
           created_at=excluded.created_at`, [profile.accountId, profile.firstName, profile.lastName, profile.birthDate, profile.phone, profile.fullName, profile.createdAt]);
        },
        async getByAccountId(accountId) {
            const clientProfileRows = await db.query("SELECT account_id, first_name, last_name, birth_date, phone, full_name, created_at FROM client_profiles WHERE account_id=$1", [accountId]);
            const clientProfileRow = clientProfileRows[0];
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
            await db.query(`INSERT INTO courier_profiles(account_id, first_name, last_name, birth_date, phone, full_name, created_at)
         VALUES($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT(account_id) DO UPDATE SET
           first_name=excluded.first_name,
           last_name=excluded.last_name,
           birth_date=excluded.birth_date,
           phone=excluded.phone,
           full_name=excluded.full_name,
           created_at=excluded.created_at`, [profile.accountId, profile.firstName, profile.lastName, profile.birthDate, profile.phone, profile.fullName, profile.createdAt]);
        },
        async getByAccountId(accountId) {
            const courierProfileRows = await db.query("SELECT account_id, first_name, last_name, birth_date, phone, full_name, created_at FROM courier_profiles WHERE account_id=$1", [accountId]);
            const courierProfileRow = courierProfileRows[0];
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
            await db.query(`INSERT INTO restaurant_profiles(account_id, first_name, last_name, birth_date, phone, full_name, created_at)
         VALUES($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT(account_id) DO UPDATE SET
           first_name=excluded.first_name,
           last_name=excluded.last_name,
           birth_date=excluded.birth_date,
           phone=excluded.phone,
           full_name=excluded.full_name,
           created_at=excluded.created_at`, [profile.accountId, profile.firstName, profile.lastName, profile.birthDate, profile.phone, profile.fullName, profile.createdAt]);
        },
        async getByAccountId(accountId) {
            const restaurantProfileRows = await db.query("SELECT account_id, first_name, last_name, birth_date, phone, full_name, created_at FROM restaurant_profiles WHERE account_id=$1", [accountId]);
            const restaurantProfileRow = restaurantProfileRows[0];
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
            const restaurantRows = await db.query(`SELECT
           r.id,
           CASE
             WHEN rp.last_name IS NOT NULL AND BTRIM(rp.last_name) <> '' THEN rp.last_name
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
            const restaurantRows = await db.query(`SELECT
           r.id,
           CASE
             WHEN rp.last_name IS NOT NULL AND BTRIM(rp.last_name) <> '' THEN rp.last_name
             ELSE r.name
           END AS name,
           r.lat,
           r.lng
         FROM restaurants r
         LEFT JOIN restaurant_profiles rp ON rp.account_id = r.id
         WHERE r.id=$1`, [id]);
            const restaurantRow = restaurantRows[0];
            if (!restaurantRow)
                return null;
            return {
                id: restaurantRow.id,
                name: restaurantRow.name,
                location: { lat: restaurantRow.lat, lng: restaurantRow.lng },
            };
        },
        async create(restaurant) {
            await db.query(`INSERT INTO restaurants(id, name, lat, lng) VALUES($1, $2, $3, $4)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name,
           lat=excluded.lat,
           lng=excluded.lng`, [restaurant.id, restaurant.name, restaurant.location.lat, restaurant.location.lng]);
        },
    };
    const menus = {
        async listMenuItems(restaurantId) {
            const menuItemRows = await db.query("SELECT id, restaurant_id, name, description, price_cents, image_url, allergens_json, daily_stock FROM menu_items WHERE restaurant_id=$1", [restaurantId]);
            return menuItemRows.map((menuItemRow) => ({
                id: menuItemRow.id,
                restaurantId: menuItemRow.restaurant_id,
                name: menuItemRow.name,
                description: menuItemRow.description,
                priceCents: menuItemRow.price_cents,
                imageUrl: menuItemRow.image_url,
                allergens: fromJson(menuItemRow.allergens_json),
                dailyStock: menuItemRow.daily_stock,
            }));
        },
        async getMenuItem(id) {
            const menuItemRows = await db.query("SELECT id, restaurant_id, name, description, price_cents, image_url, allergens_json, daily_stock FROM menu_items WHERE id=$1", [id]);
            const menuItemRow = menuItemRows[0];
            if (!menuItemRow)
                return null;
            return {
                id: menuItemRow.id,
                restaurantId: menuItemRow.restaurant_id,
                name: menuItemRow.name,
                description: menuItemRow.description,
                priceCents: menuItemRow.price_cents,
                imageUrl: menuItemRow.image_url,
                allergens: fromJson(menuItemRow.allergens_json),
                dailyStock: menuItemRow.daily_stock,
            };
        },
        async upsertMenuItem(item) {
            await db.query(`INSERT INTO menu_items(id, restaurant_id, name, description, price_cents, image_url, allergens_json, daily_stock)
         VALUES($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
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
        },
        async deleteMenuItem(id) {
            await db.query("DELETE FROM menu_items WHERE id=$1", [id]);
        },
    };
    const carts = {
        async getCart(clientId) {
            const cartRows = await db.query("SELECT cart_json FROM carts WHERE client_id=$1", [clientId]);
            const cartRow = cartRows[0];
            if (!cartRow) {
                return { clientId, restaurantId: null, items: [] };
            }
            return fromJson(cartRow.cart_json);
        },
        async saveCart(cart) {
            await db.query(`INSERT INTO carts(client_id, cart_json) VALUES($1, $2::jsonb)
         ON CONFLICT(client_id) DO UPDATE SET cart_json=excluded.cart_json`, [cart.clientId, toJson(cart)]);
        },
        async clearCart(clientId) {
            const cart = { clientId, restaurantId: null, items: [] };
            await carts.saveCart(cart);
        },
    };
    const orders = {
        async create(order) {
            await db.query("INSERT INTO orders(id, restaurant_id, status, order_json) VALUES($1, $2, $3, $4::jsonb)", [order.id, order.restaurantId, order.status, toJson(order)]);
        },
        async get(id) {
            const orderRows = await db.query("SELECT order_json FROM orders WHERE id=$1", [id]);
            const orderRow = orderRows[0];
            return orderRow ? fromJson(orderRow.order_json) : null;
        },
        async update(order) {
            await db.query("UPDATE orders SET restaurant_id=$1, status=$2, order_json=$3::jsonb WHERE id=$4", [
                order.restaurantId,
                order.status,
                toJson(order),
                order.id,
            ]);
        },
        async listByRestaurant(restaurantId) {
            const orderRows = await db.query("SELECT order_json FROM orders WHERE restaurant_id=$1", [restaurantId]);
            return orderRows.map((orderRow) => fromJson(orderRow.order_json));
        },
        async listReadyOrPreparing() {
            const orderRows = await db.query("SELECT order_json FROM orders WHERE status IN ('PREPARING', 'READY_FOR_PICKUP')");
            return orderRows.map((orderRow) => fromJson(orderRow.order_json));
        },
    };
    const invoices = {
        async create(invoice) {
            await db.query("INSERT INTO invoices(id, invoice_json) VALUES($1, $2::jsonb)", [
                invoice.id,
                toJson(invoice),
            ]);
        },
        async get(id) {
            const invoiceRows = await db.query("SELECT invoice_json FROM invoices WHERE id=$1", [id]);
            const invoiceRow = invoiceRows[0];
            return invoiceRow ? fromJson(invoiceRow.invoice_json) : null;
        },
    };
    const couriers = {
        async get(id) {
            const courierRows = await db.query("SELECT courier_json FROM couriers WHERE id=$1", [id]);
            const courierRow = courierRows[0];
            return courierRow ? fromJson(courierRow.courier_json) : null;
        },
        async upsert(courier) {
            await db.query(`INSERT INTO couriers(id, status, courier_json) VALUES($1, $2, $3::jsonb)
         ON CONFLICT(id) DO UPDATE SET status=excluded.status, courier_json=excluded.courier_json`, [courier.id, courier.status, toJson(courier)]);
        },
        async listAvailable() {
            const courierRows = await db.query("SELECT courier_json FROM couriers WHERE status='AVAILABLE'");
            return courierRows.map((courierRow) => fromJson(courierRow.courier_json));
        },
    };
    async function seedIfEmpty() {
        const restaurantCountRows = await db.query("SELECT COUNT(*)::text as c FROM restaurants");
        const restaurantCount = Number(restaurantCountRows[0]?.c ?? "0");
        if (restaurantCount > 0)
            return;
        // No seed data - only display restaurants and menu items created by users
    }
    return { accounts, clientProfiles, courierProfiles, restaurantProfiles, restaurants, menus, carts, orders, invoices, couriers, seedIfEmpty };
}
function getProfileTableName(role) {
    if (role === "CLIENT")
        return "client_profiles";
    if (role === "COURIER")
        return "courier_profiles";
    return "restaurant_profiles";
}
