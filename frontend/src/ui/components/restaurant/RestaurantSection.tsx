import { extractRestaurantName } from "../../utils/restaurant-name";
import { useMemo, useState, type KeyboardEvent } from "react";
import type { MenuItem, Restaurant } from "../../../api/ecoeats-api";

type RestaurantSectionProps = {
  restaurants: Restaurant[];
  selectedRestaurantId: string;
  activeRestaurantId: string | null;
  menu: MenuItem[];
  cartRestaurantId: string | null;
  favoriteRestaurantIds: string[];
  showOnlyFavorites: boolean;
  searchQuery: string;
  onToggleShowOnlyFavorites: () => void;
  onToggleFavoriteRestaurant: (restaurantId: string) => void;
  onOpenRestaurant: (restaurantId: string) => void;
  onCloseRestaurant: () => void;
  onAddToCart: (menuItemId: string) => void;
};

function euros(cents: number): string {
  return (cents / 100).toFixed(2) + " €";
}

function brandLabel(name: string): string {
  const cleanName = extractRestaurantName(name);
  return cleanName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function locationLabel(restaurant: Restaurant): string {
  return `Coordonnees: ${restaurant.location.lat.toFixed(4)}, ${restaurant.location.lng.toFixed(4)}`;
}

export function RestaurantSection({
  restaurants,
  selectedRestaurantId,
  activeRestaurantId,
  menu,
  cartRestaurantId,
  favoriteRestaurantIds,
  showOnlyFavorites,
  searchQuery,
  onToggleShowOnlyFavorites,
  onToggleFavoriteRestaurant,
  onOpenRestaurant,
  onCloseRestaurant,
  onAddToCart,
}: RestaurantSectionProps) {
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string | null>(null);

  const isCartLockedToAnotherRestaurant =
    cartRestaurantId !== null && cartRestaurantId !== selectedRestaurantId;
  const isRestaurantDetailOpen = activeRestaurantId !== null;

  const visibleRestaurants = useMemo(() => {
    let filtered = restaurants;
    
    if (showOnlyFavorites) {
      filtered = filtered.filter((restaurant) => favoriteRestaurantIds.includes(restaurant.id));
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((restaurant) => extractRestaurantName(restaurant.name).toLowerCase().includes(query));
    }
    
    return filtered;
  }, [favoriteRestaurantIds, restaurants, showOnlyFavorites, searchQuery]);

  const selectedRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === selectedRestaurantId) ?? null,
    [restaurants, selectedRestaurantId]
  );

  const isSelectedRestaurantFavorite =
    selectedRestaurant !== null && favoriteRestaurantIds.includes(selectedRestaurant.id);

  const filteredMenu = useMemo(() => {
    if (!searchQuery.trim() || !activeRestaurantId) return menu;
    const query = searchQuery.toLowerCase();
    return menu.filter(
      (menuItem) =>
        menuItem.name.toLowerCase().includes(query) ||
        menuItem.description?.toLowerCase().includes(query)
    );
  }, [menu, searchQuery, activeRestaurantId]);

  const restaurantCoverImageByRestaurantId = useMemo(() => {
    const covers: Record<string, string> = {};

    for (const menuItem of menu) {
      if (covers[menuItem.restaurantId]) continue;
      const customImage = menuItem.imageUrl;
      if (customImage) {
        covers[menuItem.restaurantId] = customImage;
      }
    }

    return covers;
  }, [menu]);

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>, restaurantId: string) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpenRestaurant(restaurantId);
  }

  function openProductDetails(menuItemId: string) {
    setSelectedMenuItemId((current) => (current === menuItemId ? null : menuItemId));
  }

  function renderRestaurantCard(restaurant: Restaurant) {
    const isSelected = restaurant.id === selectedRestaurantId;
    const isFavorite = favoriteRestaurantIds.includes(restaurant.id);

    return (
      <article
        key={restaurant.id}
        className={`restaurant-market-card ${isSelected ? "selected" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => onOpenRestaurant(restaurant.id)}
        onKeyDown={(event) => handleCardKeyDown(event, restaurant.id)}
      >
        <div className="restaurant-market-cover-wrap">
          {restaurantCoverImageByRestaurantId[restaurant.id] ? (
            <img
              className="restaurant-market-cover"
              src={restaurantCoverImageByRestaurantId[restaurant.id]}
              alt={restaurant.name}
              loading="lazy"
            />
          ) : (
            <div className="restaurant-market-cover restaurant-image-placeholder">Image non disponible</div>
          )}
          <span className="restaurant-brand-chip">
            <span>{brandLabel(restaurant.name)}</span>
          </span>
          <button
            type="button"
            className={`restaurant-favorite-button ${isFavorite ? "active" : ""}`}
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavoriteRestaurant(restaurant.id);
            }}
            aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            {isFavorite ? "♥" : "♡"}
          </button>
        </div>
        <div className="restaurant-market-content">
          <div className="restaurant-market-title">{extractRestaurantName(restaurant.name)}</div>
          <div className="muted">{locationLabel(restaurant)}</div>
        </div>
      </article>
    );
  }

  return (
    <div className="card">
      {!isRestaurantDetailOpen ? (
        <>
          <div className="row" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 22 }}>Restaurants</div>
            <button
              type="button"
              className={showOnlyFavorites ? "" : "secondary"}
              onClick={onToggleShowOnlyFavorites}
            >
              {showOnlyFavorites ? "Tous les restaurants" : "Favoris uniquement"}
            </button>
          </div>

          <section className="restaurant-section-block">
            <div className="restaurant-section-title">Tous les restaurants</div>
            <div className="restaurants-grid" style={{ marginBottom: 8 }}>
              {visibleRestaurants.map(renderRestaurantCard)}
            </div>
          </section>

          {visibleRestaurants.length === 0 ? (
            <div className="muted" style={{ marginBottom: 8 }}>
              Aucun favori pour le moment. Ajoutez des restaurants avec le coeur.
            </div>
          ) : null}

          <div className="muted">Cliquez sur un restaurant pour voir toutes ses propositions.</div>
        </>
      ) : (
        <>
          <div className="row" style={{ marginBottom: 12 }}>
            <button type="button" className="secondary" onClick={onCloseRestaurant}>
              Retour aux restaurants
            </button>
          </div>

          {selectedRestaurant ? (
            <div className="restaurant-detail-shell" style={{ marginBottom: 16 }}>
              <div className="restaurant-detail-banner generic" />

              <div className="restaurant-detail-header-row">
                <div className="restaurant-detail-logo">
                  {brandLabel(selectedRestaurant.name)}
                </div>
                <div className="restaurant-detail-actions">
                  <button
                    type="button"
                    className={`restaurant-favorite-button detail ${isSelectedRestaurantFavorite ? "active" : ""}`}
                    onClick={() => onToggleFavoriteRestaurant(selectedRestaurant.id)}
                    aria-label={isSelectedRestaurantFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                  >
                    {isSelectedRestaurantFavorite ? "♥" : "♡"}
                  </button>
                </div>
              </div>

              <div className="restaurant-detail-content">
                <div className="restaurant-detail-info">
                  <div className="restaurant-detail-name">{extractRestaurantName(selectedRestaurant.name)}</div>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    {locationLabel(selectedRestaurant)}
                  </div>

                </div>

                <div className="restaurant-detail-products">
                  <div className="restaurant-detail-products-header">
                    <div className="restaurant-section-title" style={{ marginBottom: 0 }}>
                      Produits
                    </div>
                  </div>
                  <div className="restaurant-products-strip">
                    {filteredMenu.map((menuItem) => (
                      <article
                        key={menuItem.id}
                        className={`restaurant-product-card ${selectedMenuItemId === menuItem.id ? "active" : ""}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => openProductDetails(menuItem.id)}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          openProductDetails(menuItem.id);
                        }}
                        aria-label={`Voir les details de ${menuItem.name}`}
                      >
                        {menuItem.imageUrl ? (
                          <img
                            className="restaurant-product-image"
                            src={menuItem.imageUrl}
                            alt={menuItem.name}
                            loading="lazy"
                          />
                        ) : (
                          <div className="restaurant-product-image restaurant-product-image-placeholder">Image non disponible</div>
                        )}
                        <button
                          type="button"
                          className="restaurant-product-add"
                          onClick={(event) => {
                            event.stopPropagation();
                            onAddToCart(menuItem.id);
                          }}
                          disabled={menuItem.dailyStock <= 0 || isCartLockedToAnotherRestaurant}
                        >
                          +
                        </button>
                        <div className="restaurant-product-price">{euros(menuItem.priceCents)}</div>
                        <div className="restaurant-product-name">{menuItem.name}</div>
                        <div
                          className={`restaurant-client-availability ${
                            menuItem.dailyStock <= 0 ? "unavailable" : "available"
                          }`}
                        >
                          {menuItem.dailyStock <= 0 ? "Indisponible" : "Disponible"}
                        </div>

                        {selectedMenuItemId === menuItem.id ? (
                          <div className="restaurant-product-inline-details">
                            <div className="restaurant-product-details-body">
                              {menuItem.description ? (
                                <div>
                                  <strong>Description:</strong> {menuItem.description}
                                </div>
                              ) : null}
                              <div>
                                <strong>Allergenes:</strong>{" "}
                                {menuItem.allergens.length > 0
                                  ? menuItem.allergens.join(", ")
                                  : "Non renseignes"}
                              </div>
                              <div>
                                <strong>Statut:</strong>{" "}
                                {menuItem.dailyStock <= 0 ? "Indisponible" : "Disponible"}
                              </div>
                            </div>
                            <div className="restaurant-product-details-actions">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onAddToCart(menuItem.id);
                                }}
                                disabled={menuItem.dailyStock <= 0 || isCartLockedToAnotherRestaurant}
                              >
                                {menuItem.dailyStock <= 0 ? "Indisponible" : "Ajouter au panier"}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {isCartLockedToAnotherRestaurant ? (
            <div className="muted" style={{ marginBottom: 12 }}>
              Votre panier contient deja des articles d'un autre restaurant. Videz le panier pour ajouter ici.
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}