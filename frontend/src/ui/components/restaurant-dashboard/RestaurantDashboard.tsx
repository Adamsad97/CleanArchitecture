import { useMemo, useState, type FormEvent } from "react";
import type { MenuItem, Restaurant } from "../../../api/ecoeats-api";

type RestaurantDashboardProps = {
  userDisplayName: string;
  restaurants: Restaurant[];
  selectedRestaurantId: string;
  menu: MenuItem[];
  statusMessage: string;
  isSaving: boolean;
  onRestaurantChange: (restaurantId: string) => void;
  onSaveMenuItem: (payload: {
    id: string;
    restaurantId: string;
    name: string;
    description: string;
    priceCents: number;
    allergens: string[];
    dailyStock: number;
  }) => Promise<void>;
  onDeleteMenuItem: (menuItemId: string) => Promise<void>;
  onRefreshMenu: () => Promise<void>;
};

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2)} EUR`;
}

function itemIdFromName(name: string): string {
  const normalizedName = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `menu-${normalizedName || "item"}-${Date.now()}`;
}

export function RestaurantDashboard({
  userDisplayName,
  restaurants,
  selectedRestaurantId,
  menu,
  statusMessage,
  isSaving,
  onRestaurantChange,
  onSaveMenuItem,
  onDeleteMenuItem,
  onRefreshMenu,
}: RestaurantDashboardProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceEuros, setPriceEuros] = useState("");
  const [allergensText, setAllergensText] = useState("");
  const [dailyStock, setDailyStock] = useState("10");
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const selectedRestaurantName =
    restaurants.find((restaurant) => restaurant.id === selectedRestaurantId)?.name ?? "Restaurant";

  const dashboardStats = useMemo(() => {
    const lowStockCount = menu.filter((menuItem) => menuItem.dailyStock > 0 && menuItem.dailyStock <= 5).length;
    const soldOutCount = menu.filter((menuItem) => menuItem.dailyStock === 0).length;
    const stockValueCents = menu.reduce((sum, menuItem) => sum + menuItem.priceCents * menuItem.dailyStock, 0);

    return {
      menuItemsCount: menu.length,
      lowStockCount,
      soldOutCount,
      stockValueCents,
    };
  }, [menu]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRestaurantId) return;

    const parsedPrice = Number(priceEuros.replace(",", "."));
    const parsedStock = Number(dailyStock);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return;
    if (!Number.isInteger(parsedStock) || parsedStock < 0) return;

    const allergens = allergensText
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    await onSaveMenuItem({
      id: itemIdFromName(name),
      restaurantId: selectedRestaurantId,
      name,
      description,
      priceCents: Math.round(parsedPrice * 100),
      allergens,
      dailyStock: parsedStock,
    });

    setName("");
    setDescription("");
    setPriceEuros("");
    setAllergensText("");
    setDailyStock("10");
  }

  async function handleDelete(menuItemId: string) {
    setIsDeletingId(menuItemId);
    try {
      await onDeleteMenuItem(menuItemId);
    } finally {
      setIsDeletingId(null);
    }
  }

  return (
    <div className="restaurant-dashboard">
      <div className="restaurant-dashboard-head">
        <div>
          <div className="restaurant-dashboard-title">Dashboard Restaurant</div>
          <div className="muted">Pilotez votre activite en temps reel, {userDisplayName}.</div>
        </div>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <select value={selectedRestaurantId} onChange={(event) => onRestaurantChange(event.target.value)}>
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
              </option>
            ))}
          </select>
          <button type="button" className="secondary" onClick={() => onRefreshMenu()}>
            Actualiser le menu
          </button>
        </div>
      </div>

      <div className="restaurant-kpi-grid">
        <div className="card">
          <div className="muted">Articles actifs</div>
          <div className="restaurant-kpi-value">{dashboardStats.menuItemsCount}</div>
        </div>
        <div className="card">
          <div className="muted">Stock faible</div>
          <div className="restaurant-kpi-value">{dashboardStats.lowStockCount}</div>
        </div>
        <div className="card">
          <div className="muted">Rupture</div>
          <div className="restaurant-kpi-value">{dashboardStats.soldOutCount}</div>
        </div>
        <div className="card">
          <div className="muted">Valeur stock</div>
          <div className="restaurant-kpi-value">{euros(dashboardStats.stockValueCents)}</div>
        </div>
      </div>

      <div className="restaurant-dashboard-grid">
        <div className="card">
          <div className="restaurant-panel-title">Ajouter un produit</div>
          <div className="muted" style={{ marginBottom: 10 }}>
            Etablissement: {selectedRestaurantName}
          </div>
          <form className="restaurant-form" onSubmit={handleSubmit}>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nom du produit"
            />
            <input
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description"
            />
            <div className="restaurant-form-split">
              <input
                required
                value={priceEuros}
                onChange={(event) => setPriceEuros(event.target.value)}
                placeholder="Prix EUR"
                inputMode="decimal"
              />
              <input
                required
                value={dailyStock}
                onChange={(event) => setDailyStock(event.target.value)}
                placeholder="Stock journalier"
                inputMode="numeric"
              />
            </div>
            <input
              value={allergensText}
              onChange={(event) => setAllergensText(event.target.value)}
              placeholder="Allergenes (separes par des virgules)"
            />
            <button type="submit" disabled={isSaving || !selectedRestaurantId}>
              {isSaving ? "Enregistrement..." : "Enregistrer le produit"}
            </button>
          </form>
          {statusMessage ? <div className="muted" style={{ marginTop: 10 }}>{statusMessage}</div> : null}
        </div>

        <div className="card">
          <div className="restaurant-panel-title">Catalogue et stock</div>
          <div className="restaurant-table-wrap">
            <table className="restaurant-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Prix</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {menu.map((menuItem) => (
                  <tr key={menuItem.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{menuItem.name}</div>
                      <div className="muted" style={{ fontSize: 13 }}>{menuItem.description}</div>
                    </td>
                    <td>{euros(menuItem.priceCents)}</td>
                    <td>
                      <span
                        className={`stock-badge ${
                          menuItem.dailyStock === 0
                            ? "soldout"
                            : menuItem.dailyStock <= 5
                              ? "low"
                              : "ok"
                        }`}
                      >
                        {menuItem.dailyStock}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="secondary"
                        disabled={isDeletingId === menuItem.id}
                        onClick={() => handleDelete(menuItem.id)}
                      >
                        {isDeletingId === menuItem.id ? "Suppression..." : "Supprimer"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}