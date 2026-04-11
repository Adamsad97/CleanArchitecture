import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import type {
  CourierOrder,
  CourierStatus,
  MenuItem,
  Restaurant,
} from "../../../api/ecoeats-api";
import {
  COURIER_STATUS_AVAILABLE,
  COURIER_STATUS_UNAVAILABLE,
  ORDER_STATUS_PAID,
  ORDER_STATUS_PREPARING,
  ORDER_STATUS_READY_FOR_PICKUP,
  ORDER_STATUS_RESTAURANT_ACCEPTED,
} from "../../../constants/domain-status";
import { extractRestaurantName } from "../../utils/restaurant-name";

const CENTS_PER_EURO = 100;
const DEFAULT_PREP_TIME_MINUTES = 15;
const MENU_ITEM_AVAILABLE_STATUS: CourierStatus = COURIER_STATUS_AVAILABLE;
const MENU_ITEM_UNAVAILABLE_STATUS: CourierStatus = COURIER_STATUS_UNAVAILABLE;

function categoriesStorageKey(restaurantId: string): string {
  return `ecoeats:menu-categories:${restaurantId}`;
}

function itemCategoriesStorageKey(restaurantId: string): string {
  return `ecoeats:menu-item-categories:${restaurantId}`;
}

function normalizeCategoryName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

type RestaurantDashboardProps = {
  restaurants: Restaurant[];
  selectedRestaurantId: string;
  menu: MenuItem[];
  operationsOrders: CourierOrder[];
  operationsMessage: string;
  statusMessage: string;
  isSaving: boolean;
  isRefreshingOperations: boolean;
  processingOrderId: string | null;
  searchQuery: string;
  onSaveMenuItem: (payload: {
    id: string;
    restaurantId: string;
    name: string;
    description: string;
    priceCents: number;
    imageUrl: string | null;
    allergens: string[];
    dailyStock: number;
  }) => Promise<void>;
  onDeleteMenuItem: (menuItemId: string) => Promise<void>;
  onRefreshMenu: () => Promise<void>;
  onRefreshOperations: () => Promise<void>;
  onAcceptOrder: (orderId: string, prepTimeMinutes: number) => Promise<void>;
  onRefuseOrder: (orderId: string) => Promise<void>;
  onMarkOrderReady: (orderId: string) => Promise<void>;
};

function euros(cents: number): string {
  return `${(cents / CENTS_PER_EURO).toFixed(2)} EUR`;
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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function RestaurantDashboard({
  restaurants,
  selectedRestaurantId,
  menu,
  operationsOrders,
  operationsMessage,
  statusMessage,
  isSaving,
  isRefreshingOperations,
  processingOrderId,
  searchQuery,
  onSaveMenuItem,
  onDeleteMenuItem,
  onRefreshMenu,
  onRefreshOperations,
  onAcceptOrder,
  onRefuseOrder,
  onMarkOrderReady,
}: RestaurantDashboardProps) {
  const defaultDailyStock = 10;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceEuros, setPriceEuros] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFileName, setImageFileName] = useState("");
  const [allergensText, setAllergensText] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categoryToEdit, setCategoryToEdit] = useState("");
  const [categoryEditDraft, setCategoryEditDraft] = useState("");
  const [itemCategoriesById, setItemCategoriesById] = useState<Record<string, string>>({});
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isUpdatingAvailabilityId, setIsUpdatingAvailabilityId] = useState<string | null>(null);
  const [prepTimeByOrderId, setPrepTimeByOrderId] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!selectedRestaurantId) {
      setCategories([]);
      setItemCategoriesById({});
      setSelectedCategory("");
      return;
    }

    const savedCategories = window.localStorage.getItem(categoriesStorageKey(selectedRestaurantId));
    const savedItemCategories = window.localStorage.getItem(itemCategoriesStorageKey(selectedRestaurantId));

    try {
      const parsed = savedCategories ? JSON.parse(savedCategories) : [];
      if (Array.isArray(parsed)) {
        const validCategories = parsed
          .filter((value): value is string => typeof value === "string")
          .map((value) => normalizeCategoryName(value))
          .filter(Boolean);
        setCategories([...new Set(validCategories)]);
      } else {
        setCategories([]);
      }
    } catch {
      setCategories([]);
    }

    try {
      const parsed = savedItemCategories ? JSON.parse(savedItemCategories) : {};
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setItemCategoriesById({});
        return;
      }
      const sanitized = Object.entries(parsed).reduce<Record<string, string>>((acc, [key, value]) => {
        if (typeof key !== "string" || typeof value !== "string") return acc;
        const normalizedValue = normalizeCategoryName(value);
        if (!normalizedValue) return acc;
        acc[key] = normalizedValue;
        return acc;
      }, {});
      setItemCategoriesById(sanitized);
    } catch {
      setItemCategoriesById({});
    }
  }, [selectedRestaurantId]);

  useEffect(() => {
    if (!selectedRestaurantId) return;
    window.localStorage.setItem(
      categoriesStorageKey(selectedRestaurantId),
      JSON.stringify(categories)
    );
  }, [categories, selectedRestaurantId]);

  useEffect(() => {
    if (!selectedRestaurantId) return;
    window.localStorage.setItem(
      itemCategoriesStorageKey(selectedRestaurantId),
      JSON.stringify(itemCategoriesById)
    );
  }, [itemCategoriesById, selectedRestaurantId]);

  useEffect(() => {
    if (categories.length === 0) {
      setSelectedCategory("");
      return;
    }
    if (selectedCategory && categories.includes(selectedCategory)) return;
    setSelectedCategory("");
  }, [categories, selectedCategory]);

  const selectedRestaurantName =
    restaurants.find((restaurant) => restaurant.id === selectedRestaurantId)?.name ?? "";
  const establishmentDisplayName = useMemo(() => {
    const cleanedRestaurantName = extractRestaurantName(selectedRestaurantName).trim();
    if (cleanedRestaurantName) return cleanedRestaurantName;

    return "Etablissement";
  }, [selectedRestaurantName]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredMenu = useMemo(() => {
    if (!normalizedQuery) return menu;
    return menu.filter(
      (menuItem) =>
        menuItem.name.toLowerCase().includes(normalizedQuery) ||
        menuItem.description.toLowerCase().includes(normalizedQuery)
    );
  }, [menu, normalizedQuery]);

  const selectedRestaurantOrders = useMemo(() => {
    const scoped = operationsOrders.filter((order) => order.restaurantId === selectedRestaurantId);
    if (!normalizedQuery) return scoped;
    return scoped.filter((order) => {
      if (order.id.toLowerCase().includes(normalizedQuery)) return true;
      return order.lines.some((line) => line.name.toLowerCase().includes(normalizedQuery));
    });
  }, [operationsOrders, selectedRestaurantId, normalizedQuery]);

  const dashboardStats = useMemo(() => {
    const unavailableCount = menu.filter((menuItem) => menuItem.dailyStock <= 0).length;
    const avgPriceCents =
      menu.length > 0
        ? Math.round(
            menu.reduce((totalCents, menuItem) => totalCents + menuItem.priceCents, 0) /
              menu.length
          )
        : 0;

    const waitingDecisionCount = selectedRestaurantOrders.filter(
      (order) => order.status === ORDER_STATUS_PAID
    ).length;
    const inKitchenCount = selectedRestaurantOrders.filter(
      (order) =>
        order.status === ORDER_STATUS_RESTAURANT_ACCEPTED ||
        order.status === ORDER_STATUS_PREPARING
    ).length;
    const readyCount = selectedRestaurantOrders.filter(
      (order) => order.status === ORDER_STATUS_READY_FOR_PICKUP
    ).length;
    const throughputCents = selectedRestaurantOrders.reduce(
      (totalCents, order) => totalCents + order.totalCents,
      0
    );
    const dailyRevenueCents = throughputCents;
    const weeklyRevenueCents = dailyRevenueCents * 7;
    const monthlyRevenueCents = dailyRevenueCents * 30;
    const quarterlyRevenueCents = dailyRevenueCents * 90;
    const yearlyRevenueCents = dailyRevenueCents * 365;

    return {
      menuItemsCount: menu.length,
      unavailableCount,
      avgPriceCents,
      waitingDecisionCount,
      inKitchenCount,
      readyCount,
      throughputCents,
      dailyRevenueCents,
      weeklyRevenueCents,
      monthlyRevenueCents,
      quarterlyRevenueCents,
      yearlyRevenueCents,
    };
  }, [menu, selectedRestaurantOrders]);

  function resetProductForm() {
    setEditingMenuItem(null);
    setName("");
    setDescription("");
    setPriceEuros("");
    setImageUrl("");
    setImageFileName("");
    setAllergensText("");
    setSelectedCategory("");
  }

  function startEditingMenuItem(menuItem: MenuItem) {
    const existingCategory = itemCategoriesById[menuItem.id] ?? "";
    if (existingCategory && !categories.includes(existingCategory)) {
      setCategories((previous) => [...previous, existingCategory]);
    }
    setEditingMenuItem(menuItem);
    setName(menuItem.name);
    setDescription(menuItem.description);
    setPriceEuros((menuItem.priceCents / 100).toFixed(2));
    setImageUrl(menuItem.imageUrl ?? "");
    setImageFileName("");
    setAllergensText(menuItem.allergens.join(", "));
    setSelectedCategory(existingCategory);
  }

  function handleAddCategory() {
    const normalizedCategory = normalizeCategoryName(categoryDraft);
    if (!normalizedCategory) return;
    if (categories.includes(normalizedCategory)) {
      setSelectedCategory(normalizedCategory);
      setCategoryDraft("");
      return;
    }
    setCategories((previous) => [...previous, normalizedCategory]);
    setSelectedCategory(normalizedCategory);
    setCategoryDraft("");
  }

  function startCategoryEdition(category: string) {
    setCategoryToEdit(category);
    setCategoryEditDraft(category);
  }

  function cancelCategoryEdition() {
    setCategoryToEdit("");
    setCategoryEditDraft("");
  }

  function handleRenameCategory() {
    if (!categoryToEdit) return;
    const renamedCategory = normalizeCategoryName(categoryEditDraft);
    if (!renamedCategory) return;

    if (renamedCategory !== categoryToEdit && categories.includes(renamedCategory)) {
      setSelectedCategory(renamedCategory);
      cancelCategoryEdition();
      return;
    }

    if (renamedCategory === categoryToEdit) {
      cancelCategoryEdition();
      return;
    }

    const previousCategory = categoryToEdit;
    setCategories((previous) =>
      previous.map((category) => (category === previousCategory ? renamedCategory : category))
    );
    setItemCategoriesById((previous) => {
      const next = { ...previous };
      for (const [itemId, category] of Object.entries(next)) {
        if (category !== previousCategory) continue;
        next[itemId] = renamedCategory;
      }
      return next;
    });
    setSelectedCategory((previous) =>
      previous === previousCategory ? renamedCategory : previous
    );
    cancelCategoryEdition();
  }

  function handleRemoveCategory(categoryToRemove: string) {
    const shouldDelete = window.confirm(
      `Supprimer la categorie "${categoryToRemove}" ? Cette action retirera aussi la categorie des produits associes.`
    );
    if (!shouldDelete) return;

    setCategories((previous) => previous.filter((category) => category !== categoryToRemove));
    setItemCategoriesById((previous) => {
      const next = { ...previous };
      for (const [itemId, category] of Object.entries(next)) {
        if (category !== categoryToRemove) continue;
        delete next[itemId];
      }
      return next;
    });
    setSelectedCategory((previous) => (previous === categoryToRemove ? "" : previous));
    setCategoryToEdit((previous) => (previous === categoryToRemove ? "" : previous));
    setCategoryEditDraft("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRestaurantId) return;
    if (!selectedCategory) return;

    const parsedPrice = Number(priceEuros.replace(",", "."));
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return;

    const allergens = allergensText
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const generatedItemId = itemIdFromName(name);
    const targetItemId = editingMenuItem?.id ?? generatedItemId;
    const targetDailyStock = editingMenuItem?.dailyStock ?? defaultDailyStock;
    const targetRestaurantId = editingMenuItem?.restaurantId ?? selectedRestaurantId;

    await onSaveMenuItem({
      id: targetItemId,
      restaurantId: targetRestaurantId,
      name,
      description,
      priceCents: Math.round(parsedPrice * CENTS_PER_EURO),
      imageUrl: imageUrl.trim() || null,
      allergens,
      dailyStock: targetDailyStock,
    });

    setItemCategoriesById((previous) => ({ ...previous, [targetItemId]: selectedCategory }));

    resetProductForm();
  }

  async function handleDelete(menuItemId: string) {
    setIsDeletingId(menuItemId);
    try {
      await onDeleteMenuItem(menuItemId);
      setItemCategoriesById((previous) => {
        if (!(menuItemId in previous)) return previous;
        const next = { ...previous };
        delete next[menuItemId];
        return next;
      });
      if (editingMenuItem?.id === menuItemId) {
        resetProductForm();
      }
    } finally {
      setIsDeletingId(null);
    }
  }

  async function handleSetAvailability(menuItem: MenuItem, nextStatus: CourierStatus) {
    setIsUpdatingAvailabilityId(menuItem.id);
    const nextDailyStock =
      nextStatus === MENU_ITEM_AVAILABLE_STATUS
        ? Math.max(menuItem.dailyStock, defaultDailyStock)
        : 0;
    try {
      await onSaveMenuItem({
        id: menuItem.id,
        restaurantId: menuItem.restaurantId,
        name: menuItem.name,
        description: menuItem.description,
        priceCents: menuItem.priceCents,
        imageUrl: menuItem.imageUrl,
        allergens: menuItem.allergens,
        dailyStock: nextDailyStock,
      });
      setEditingMenuItem((previous) =>
        previous && previous.id === menuItem.id ? { ...previous, dailyStock: nextDailyStock } : previous
      );
    } finally {
      setIsUpdatingAvailabilityId(null);
    }
  }

  function getPrepTime(orderId: string): number {
    const parsed = Number(prepTimeByOrderId[orderId] ?? String(DEFAULT_PREP_TIME_MINUTES));
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PREP_TIME_MINUTES;
    return Math.round(parsed);
  }

  function updatePrepTime(orderId: string, value: string) {
    setPrepTimeByOrderId((previous) => ({ ...previous, [orderId]: value }));
  }

  async function handleProductImageSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setImageUrl("");
      setImageFileName("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setImageUrl("");
      setImageFileName("");
      return;
    }

    try {
      const encodedImage = await readFileAsDataUrl(file);
      setImageUrl(encodedImage);
      setImageFileName(file.name);
    } catch {
      setImageUrl("");
      setImageFileName("");
    }
  }

  return (
    <div className="restaurant-dashboard">
      <div className="card restaurant-hero-card restaurant-dashboard-head">
        <div>
          <div className="restaurant-dashboard-title">Dashboard Entreprise Restaurant</div>
          <div className="restaurant-dashboard-subtitle">Pilotez menu, commandes et operations en temps reel.</div>
        </div>
        <div className="restaurant-head-actions">
          <button type="button" className="secondary restaurant-action-btn" onClick={() => onRefreshMenu()}>
            Actualiser le menu
          </button>
          <button type="button" className="secondary restaurant-action-btn" onClick={() => onRefreshOperations()}>
            {isRefreshingOperations ? "Refresh commandes..." : "Actualiser les commandes"}
          </button>
        </div>
      </div>

      <div className="restaurant-kpi-grid">
        <div className="card restaurant-kpi-card">
          <div className="muted">Articles actifs</div>
          <div className="restaurant-kpi-value">{dashboardStats.menuItemsCount}</div>
        </div>
        <div className="card restaurant-kpi-card">
          <div className="muted">Panier moyen theorique</div>
          <div className="restaurant-kpi-value">{euros(dashboardStats.avgPriceCents)}</div>
        </div>
        <div className="card restaurant-kpi-card">
          <div className="muted">Commandes a traiter</div>
          <div className="restaurant-kpi-value">{dashboardStats.waitingDecisionCount}</div>
        </div>
        <div className="card restaurant-kpi-card">
          <div className="muted">En cuisine</div>
          <div className="restaurant-kpi-value">{dashboardStats.inKitchenCount}</div>
        </div>
        <div className="card restaurant-kpi-card">
          <div className="muted">Pretes au retrait</div>
          <div className="restaurant-kpi-value">{dashboardStats.readyCount}</div>
        </div>
        <div className="card restaurant-kpi-card">
          <div className="muted">Produits indisponibles</div>
          <div className="restaurant-kpi-value">{dashboardStats.unavailableCount}</div>
        </div>
        <div className="card restaurant-kpi-card">
          <div className="muted">CA journalier</div>
          <div className="restaurant-kpi-value">{euros(dashboardStats.dailyRevenueCents)}</div>
        </div>
        <div className="card restaurant-kpi-card">
          <div className="muted">CA hebdomadaire</div>
          <div className="restaurant-kpi-value">{euros(dashboardStats.weeklyRevenueCents)}</div>
        </div>
        <div className="card restaurant-kpi-card">
          <div className="muted">CA mensuel</div>
          <div className="restaurant-kpi-value">{euros(dashboardStats.monthlyRevenueCents)}</div>
        </div>
        <div className="card restaurant-kpi-card">
          <div className="muted">CA trimestriel</div>
          <div className="restaurant-kpi-value">{euros(dashboardStats.quarterlyRevenueCents)}</div>
        </div>
        <div className="card restaurant-kpi-card">
          <div className="muted">CA annuel</div>
          <div className="restaurant-kpi-value">{euros(dashboardStats.yearlyRevenueCents)}</div>
        </div>
      </div>

      <div className="restaurant-ops-strip">
        <div className="card restaurant-ops-strip-card">
          <div className="restaurant-panel-title">Flux du service</div>
          <div className="muted">Chiffre des commandes actuellement dans le pipeline: {euros(dashboardStats.throughputCents)}</div>
        </div>
        <div className="card restaurant-ops-strip-card">
          <div className="restaurant-panel-title">Disponibilite produits</div>
          <div className="muted">
            Activez ou desactivez manuellement chaque produit depuis le catalogue.
          </div>
        </div>
      </div>

      <div className="restaurant-dashboard-grid restaurant-ops-grid">
        <div className="card">
          <div className="restaurant-panel-title">Centre de commandes</div>
          <div className="restaurant-establishment-banner" style={{ marginBottom: 10 }}>
            <span className="restaurant-establishment-label">Etablissement</span>
            <span className="restaurant-establishment-name">{establishmentDisplayName}</span>
          </div>

          {selectedRestaurantOrders.length === 0 ? (
            <div className="muted">Aucune commande active pour le moment.</div>
          ) : (
            <div className="restaurant-order-list">
              {selectedRestaurantOrders.map((order) => (
                <div key={order.id} className="restaurant-order-card">
                  <div className="restaurant-order-head">
                    <div>
                      <div className="restaurant-order-id">Commande #{order.id}</div>
                      <div className="muted">
                        {order.lines.reduce(
                          (totalQuantity, line) => totalQuantity + line.quantity,
                          0
                        )} article(s)
                      </div>
                    </div>
                    <div className="restaurant-order-right">
                      <span className="pill">{order.status}</span>
                      <strong>{euros(order.totalCents)}</strong>
                    </div>
                  </div>

                  <div className="restaurant-order-lines">
                    {order.lines.slice(0, 3).map((line) => (
                      <div key={`${order.id}-${line.menuItemId}`} className="restaurant-order-line">
                        <span>{line.quantity}x {line.name}</span>
                        <span>{euros(line.unitPriceCents * line.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  {order.status === ORDER_STATUS_PAID ? (
                    <div className="restaurant-order-actions">
                      <input
                        value={prepTimeByOrderId[order.id] ?? "15"}
                        onChange={(event) => updatePrepTime(order.id, event.target.value)}
                        inputMode="numeric"
                        placeholder="Prep (min)"
                      />
                      <button
                        type="button"
                        disabled={processingOrderId === order.id}
                        onClick={() => onAcceptOrder(order.id, getPrepTime(order.id))}
                      >
                        {processingOrderId === order.id ? "Action..." : "Accepter"}
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        disabled={processingOrderId === order.id}
                        onClick={() => onRefuseOrder(order.id)}
                      >
                        Refuser
                      </button>
                    </div>
                  ) : null}

                  {(
                    order.status === ORDER_STATUS_RESTAURANT_ACCEPTED ||
                    order.status === ORDER_STATUS_PREPARING
                  ) ? (
                    <div className="restaurant-order-actions">
                      <button
                        type="button"
                        disabled={processingOrderId === order.id}
                        onClick={() => onMarkOrderReady(order.id)}
                      >
                        {processingOrderId === order.id ? "Action..." : "Marquer prete"}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {operationsMessage ? <div className="restaurant-feedback">{operationsMessage}</div> : null}
        </div>

        <div className="card restaurant-product-editor-card">
          <div className="restaurant-product-editor-head">
            <div className="restaurant-panel-title">
              {editingMenuItem ? "Modifier le produit" : "Ajouter un produit"}
            </div>
            <div className="restaurant-product-editor-note">
              {editingMenuItem
                ? "Appliquez vos correctifs puis validez la mise a jour."
                : "Creez une fiche menu claire pour optimiser vos conversions."}
            </div>
          </div>

          <form className="restaurant-form restaurant-product-form" onSubmit={handleSubmit}>
            <div className="restaurant-product-field">
              <label className="restaurant-product-label" htmlFor="product-category-input">Categories</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <input
                  id="product-category-input"
                  value={categoryDraft}
                  onChange={(event) => setCategoryDraft(event.target.value)}
                  placeholder="Ex: Burger"
                />
                <button type="button" className="secondary" onClick={handleAddCategory}>
                  Enregistrer categorie
                </button>
              </div>
              {categories.length > 0 ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {categories.map((category) => (
                    <div key={category} className="restaurant-category-chip-group">
                      <button
                        type="button"
                        className={selectedCategory === category ? "" : "secondary"}
                        onClick={() => setSelectedCategory(category)}
                        title={`Utiliser la categorie ${category}`}
                      >
                        {category}
                      </button>
                      {selectedCategory === category ? (
                        <button
                          type="button"
                          className="restaurant-category-edit-inline"
                          onClick={() => startCategoryEdition(category)}
                          title={`Modifier la categorie ${category}`}
                          aria-label={`Modifier la categorie ${category}`}
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </svg>
                        </button>
                      ) : null}
                      {selectedCategory === category ? (
                        <button
                          type="button"
                          className="restaurant-category-delete-inline"
                          onClick={() => handleRemoveCategory(category)}
                          title={`Supprimer la categorie ${category}`}
                          aria-label={`Supprimer la categorie ${category}`}
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                          </svg>
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted" style={{ fontSize: 12 }}>
                  Ajoutez d'abord au moins une categorie avant d'enregistrer un produit.
                </div>
              )}
              {selectedCategory && categoryToEdit === selectedCategory ? (
                <div className="restaurant-category-edit-row">
                  <input
                    value={categoryEditDraft}
                    onChange={(event) => setCategoryEditDraft(event.target.value)}
                    placeholder="Nouveau nom de categorie"
                  />
                  <button
                    type="button"
                    className="secondary"
                    onClick={handleRenameCategory}
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={cancelCategoryEdition}
                  >
                    Annuler
                  </button>
                </div>
              ) : null}
            </div>

            <div className="restaurant-product-field">
              <label className="restaurant-product-label" htmlFor="product-name-input">Nom du produit</label>
              <input
                id="product-name-input"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex: Burger Signature"
              />
            </div>

            <div className="restaurant-product-field">
              <label className="restaurant-product-label" htmlFor="product-description-input">Description</label>
              <input
                id="product-description-input"
                required
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ingredients, sauce, accompagnement..."
              />
            </div>

            <div className="restaurant-product-field">
              <label className="restaurant-product-label" htmlFor="product-price-input">Prix (EUR)</label>
              <input
                id="product-price-input"
                required
                value={priceEuros}
                onChange={(event) => setPriceEuros(event.target.value)}
                placeholder="12.90"
                inputMode="decimal"
              />
            </div>

            <div className="restaurant-product-field">
              <label className="restaurant-product-label" htmlFor="product-image-input">Photo du produit</label>
              <input
                id="product-image-input"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  handleProductImageSelected(event).catch(() => {});
                }}
              />
              <div className="muted" style={{ fontSize: 12 }}>
                {imageFileName ? `Fichier selectionne: ${imageFileName}` : "Aucune image selectionnee"}
              </div>
            </div>

            {imageUrl.trim() ? (
              <div className="restaurant-product-image-preview">
                <img src={imageUrl.trim()} alt="Apercu du produit" loading="lazy" />
              </div>
            ) : null}

            <div className="restaurant-product-field">
              <label className="restaurant-product-label" htmlFor="product-allergens-input">Allergenes</label>
              <input
                id="product-allergens-input"
                value={allergensText}
                onChange={(event) => setAllergensText(event.target.value)}
                placeholder="Ex: gluten, lait, oeuf"
              />
            </div>

            <div className="restaurant-product-form-actions">
              <button className="restaurant-product-submit" type="submit" disabled={isSaving || !selectedRestaurantId || !selectedCategory}>
                {isSaving
                  ? "Enregistrement..."
                  : editingMenuItem
                    ? "Mettre a jour le produit"
                    : "Enregistrer le produit"}
              </button>
              {editingMenuItem ? (
                <button
                  type="button"
                  className="secondary restaurant-product-cancel"
                  disabled={isSaving}
                  onClick={resetProductForm}
                >
                  Annuler
                </button>
              ) : null}
            </div>
          </form>
          {statusMessage ? <div className="restaurant-feedback">{statusMessage}</div> : null}
        </div>
      </div>

      <div className="card">
        <div className="restaurant-panel-title">Catalogue</div>
        <div className="restaurant-table-wrap">
          <table className="restaurant-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Prix</th>
                <th>Statut</th>
                <th>Categorie</th>
                <th>Allergenes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMenu.map((menuItem) => (
                <tr key={menuItem.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{menuItem.name}</div>
                    <div className="muted" style={{ fontSize: 13 }}>{menuItem.description}</div>
                    {menuItem.imageUrl ? (
                      <a
                        href={menuItem.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="restaurant-product-image-thumb-link"
                        aria-label={`Voir la photo de ${menuItem.name}`}
                      >
                        <img
                          src={menuItem.imageUrl}
                          alt={`Photo de ${menuItem.name}`}
                          className="restaurant-product-image-thumb"
                          loading="lazy"
                        />
                      </a>
                    ) : null}
                  </td>
                  <td>{euros(menuItem.priceCents)}</td>
                  <td>
                    <span
                      className={`availability-pill ${menuItem.dailyStock <= 0 ? "unavailable" : "available"}`}
                    >
                      {menuItem.dailyStock <= 0 ? "Indisponible" : "Disponible"}
                    </span>
                  </td>
                  <td>{itemCategoriesById[menuItem.id] ?? "-"}</td>
                  <td>{menuItem.allergens.length > 0 ? menuItem.allergens.join(", ") : "-"}</td>
                  <td>
                    <div className="restaurant-table-actions">
                      <button
                        type="button"
                        className={`restaurant-status-switch ${menuItem.dailyStock > 0 ? "on" : "off"}`}
                        disabled={isUpdatingAvailabilityId === menuItem.id}
                        aria-pressed={menuItem.dailyStock > 0}
                        onClick={() =>
                          handleSetAvailability(
                            menuItem,
                            menuItem.dailyStock > 0
                              ? MENU_ITEM_UNAVAILABLE_STATUS
                              : MENU_ITEM_AVAILABLE_STATUS
                          )
                        }
                      >
                        <span className="restaurant-status-switch-track" aria-hidden="true">
                          <span className="restaurant-status-switch-thumb" />
                        </span>
                        <span className="restaurant-status-switch-label">
                          {menuItem.dailyStock > 0 ? "Disponible" : "Indisponible"}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="secondary restaurant-row-action restaurant-row-action-edit"
                        disabled={isDeletingId === menuItem.id || isUpdatingAvailabilityId === menuItem.id}
                        onClick={() => startEditingMenuItem(menuItem)}
                      >
                        <span aria-hidden="true">✎</span>
                        <span>Modifier</span>
                      </button>
                      <button
                        type="button"
                        className="secondary restaurant-row-action restaurant-row-action-delete"
                        disabled={isDeletingId === menuItem.id || isUpdatingAvailabilityId === menuItem.id}
                        onClick={() => handleDelete(menuItem.id)}
                      >
                        <span aria-hidden="true">🗑</span>
                        <span>{isDeletingId === menuItem.id ? "Suppression..." : "Supprimer"}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}