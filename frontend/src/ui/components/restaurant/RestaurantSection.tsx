import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
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

function scoreFromId(id: string): number {
  return id.split("").reduce((score, character) => score + character.charCodeAt(0), 0);
}

function deliveryFeeFromId(id: string): string {
  const score = scoreFromId(id);
  const fee = ((score % 6) + 1) * 0.5;
  return `${fee.toFixed(2).replace(".", ",")} €`;
}

function etaFromId(id: string): string {
  const score = scoreFromId(id);
  return `${14 + (score % 18)} min`;
}

function ratingFromId(id: string): string {
  const score = scoreFromId(id);
  const rating = 4 + (score % 10) / 10;
  return rating.toFixed(1);
}

function reviewsFromId(id: string): string {
  const score = scoreFromId(id);
  const count = 180 + (score % 1200);
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k+`;
  }
  return `${count}+`;
}

function imageUrlFromRestaurant(restaurant: Restaurant): string {
  return `https://picsum.photos/seed/ecoeats-${encodeURIComponent(restaurant.id)}/900/520`;
}

function imageUrlFromMenuItem(menuItemId: string): string {
  return `https://picsum.photos/seed/ecoeats-menu-${encodeURIComponent(menuItemId)}/500/500`;
}

function hasPromo(id: string): boolean {
  return scoreFromId(id) % 2 === 0;
}

function isSponsored(id: string): boolean {
  return scoreFromId(id) % 5 === 0;
}

function brandLabel(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function brandLogoUrl(name: string): string | null {
  const normalizedName = name.toLowerCase();

  if (normalizedName.includes("intermarche")) {
    return "https://upload.wikimedia.org/wikipedia/fr/thumb/b/b8/Logo_Intermarch%C3%A9.svg/512px-Logo_Intermarch%C3%A9.svg.png";
  }
  if (normalizedName.includes("monoprix")) {
    return "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Monoprix_2013.svg/512px-Monoprix_2013.svg.png";
  }
  if (normalizedName.includes("carrefour")) {
    return "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Carrefour_logo.svg/512px-Carrefour_logo.svg.png";
  }
  if (normalizedName.includes("pharmacie")) {
    return "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Green_cross.svg/512px-Green_cross.svg.png";
  }

  return null;
}

function brandThemeKey(name: string): "intermarche" | "monoprix" | "carrefour" | "pharmacie" | "generic" {
  const normalizedName = name.toLowerCase();

  if (normalizedName.includes("intermarche")) return "intermarche";
  if (normalizedName.includes("monoprix")) return "monoprix";
  if (normalizedName.includes("carrefour")) return "carrefour";
  if (normalizedName.includes("pharmacie")) return "pharmacie";
  return "generic";
}

function productCategory(menuItem: MenuItem): "Epicerie" | "Boissons" | "Sante & Beaute" | "Snacking" {
  const haystack = `${menuItem.name} ${menuItem.description}`.toLowerCase();

  if (haystack.includes("eau") || haystack.includes("jus") || haystack.includes("soda")) {
    return "Boissons";
  }
  if (
    haystack.includes("pharma") ||
    haystack.includes("hygiene") ||
    haystack.includes("beaute") ||
    haystack.includes("sante")
  ) {
    return "Sante & Beaute";
  }
  if (haystack.includes("chocolat") || haystack.includes("snack") || haystack.includes("gateau")) {
    return "Snacking";
  }

  return "Epicerie";
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
  const productsStripRef = useRef<HTMLDivElement | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("Tous");

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
      filtered = filtered.filter((restaurant) => restaurant.name.toLowerCase().includes(query));
    }
    
    return filtered;
  }, [favoriteRestaurantIds, restaurants, showOnlyFavorites, searchQuery]);

  const selectedRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === selectedRestaurantId) ?? null,
    [restaurants, selectedRestaurantId]
  );

  const isSelectedRestaurantFavorite =
    selectedRestaurant !== null && favoriteRestaurantIds.includes(selectedRestaurant.id);

  const categories = useMemo(() => {
    const orderedCategories = ["Tous", ...Array.from(new Set(menu.map((menuItem) => productCategory(menuItem))))];
    return orderedCategories;
  }, [menu]);

  const filteredMenu = useMemo(() => {
    let filtered = menu;
    
    if (selectedCategory !== "Tous") {
      filtered = filtered.filter((menuItem) => productCategory(menuItem) === selectedCategory);
    }
    
    if (searchQuery.trim() && activeRestaurantId) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (menuItem) =>
          menuItem.name.toLowerCase().includes(query) ||
          menuItem.description?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [menu, selectedCategory, searchQuery, activeRestaurantId]);

  const menuGroupedByCategory = useMemo(() => {
    return filteredMenu.reduce<Record<string, MenuItem[]>>((accumulator, menuItem) => {
      const category = productCategory(menuItem);
      if (!accumulator[category]) accumulator[category] = [];
      accumulator[category].push(menuItem);
      return accumulator;
    }, {});
  }, [filteredMenu]);

  useEffect(() => {
    setSelectedCategory("Tous");
  }, [selectedRestaurantId]);

  const promotedRestaurants = useMemo(
    () => visibleRestaurants.filter((restaurant) => hasPromo(restaurant.id)),
    [visibleRestaurants]
  );

  const topRatedRestaurants = useMemo(
    () =>
      [...visibleRestaurants]
        .sort((leftRestaurant, rightRestaurant) => {
          return Number(ratingFromId(rightRestaurant.id)) - Number(ratingFromId(leftRestaurant.id));
        })
        .slice(0, 6),
    [visibleRestaurants]
  );

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>, restaurantId: string) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpenRestaurant(restaurantId);
  }

  function scrollProducts(direction: "left" | "right") {
    const productsStrip = productsStripRef.current;
    if (!productsStrip) return;

    const delta = direction === "left" ? -320 : 320;
    productsStrip.scrollBy({ left: delta, behavior: "smooth" });
  }

  function renderRestaurantCard(restaurant: Restaurant) {
    const isSelected = restaurant.id === selectedRestaurantId;
    const isFavorite = favoriteRestaurantIds.includes(restaurant.id);
    const logoUrl = brandLogoUrl(restaurant.name);

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
          <img
            className="restaurant-market-cover"
            src={imageUrlFromRestaurant(restaurant)}
            alt={restaurant.name}
            loading="lazy"
          />
          <span className="restaurant-brand-chip">
            {logoUrl ? (
              <img className="restaurant-brand-logo" src={logoUrl} alt={restaurant.name} loading="lazy" />
            ) : (
              <span>{brandLabel(restaurant.name)}</span>
            )}
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
          {hasPromo(restaurant.id) ? (
            <span className="restaurant-badge promo">Articles en promotion</span>
          ) : null}
          {isSponsored(restaurant.id) ? (
            <span className="restaurant-badge sponsored">Sponsorise</span>
          ) : null}
        </div>
        <div className="restaurant-market-content">
          <div className="restaurant-market-title">{restaurant.name}</div>
          <div className="muted">
            Frais de livraison: {deliveryFeeFromId(restaurant.id)} • {etaFromId(restaurant.id)}
          </div>
          <div className="restaurant-market-rating">
            {ratingFromId(restaurant.id)}★ ({reviewsFromId(restaurant.id)})
          </div>
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
            <div className="restaurant-section-title">En promotion</div>
            <div className="restaurants-grid" style={{ marginBottom: 8 }}>
              {(promotedRestaurants.length > 0 ? promotedRestaurants : visibleRestaurants)
                .slice(0, 6)
                .map(renderRestaurantCard)}
            </div>
          </section>

          <section className="restaurant-section-block">
            <div className="restaurant-section-title">Les mieux notes</div>
            <div className="restaurants-grid" style={{ marginBottom: 8 }}>
              {topRatedRestaurants.map(renderRestaurantCard)}
            </div>
          </section>

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
              <div className={`restaurant-detail-banner ${brandThemeKey(selectedRestaurant.name)}`} />

              <div className="restaurant-detail-header-row">
                <div className="restaurant-detail-logo">
                  {brandLogoUrl(selectedRestaurant.name) ? (
                    <img
                      className="restaurant-detail-logo-image"
                      src={brandLogoUrl(selectedRestaurant.name) as string}
                      alt={selectedRestaurant.name}
                    />
                  ) : (
                    brandLabel(selectedRestaurant.name)
                  )}
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
                  <button type="button" className="restaurant-favorite-button detail" aria-label="Plus d'options">
                    ...
                  </button>
                </div>
              </div>

              <div className="restaurant-detail-content">
                <div className="restaurant-detail-info">
                  <div className="restaurant-detail-name">{selectedRestaurant.name}</div>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Arrivee estimee: {etaFromId(selectedRestaurant.id)} • Frais de livraison: {deliveryFeeFromId(selectedRestaurant.id)}
                  </div>
                  <div className="restaurant-market-rating" style={{ marginBottom: 6 }}>
                    {ratingFromId(selectedRestaurant.id)}★ ({reviewsFromId(selectedRestaurant.id)} notes)
                  </div>
                  <div className="muted" style={{ marginBottom: 10 }}>
                    86 Avenue Rouget De Lisle, Vitry-sur-Seine
                  </div>
                  <div className="restaurant-mode-toggle">
                    <span className="restaurant-mode-pill active">Livraison</span>
                    <span className="restaurant-mode-pill">A emporter</span>
                  </div>

                  <div className="restaurant-category-list">
                    {categories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        className={`restaurant-category-chip ${selectedCategory === category ? "active" : ""}`}
                        onClick={() => setSelectedCategory(category)}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="restaurant-detail-products">
                  <div className="restaurant-detail-products-header">
                    <div className="restaurant-section-title" style={{ marginBottom: 0 }}>
                      A decouvrir
                    </div>
                    <div className="restaurant-carousel-controls">
                      <button
                        type="button"
                        className="secondary restaurant-carousel-button"
                        onClick={() => scrollProducts("left")}
                        aria-label="Produits precedents"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        className="secondary restaurant-carousel-button"
                        onClick={() => scrollProducts("right")}
                        aria-label="Produits suivants"
                      >
                        →
                      </button>
                    </div>
                  </div>
                  <div ref={productsStripRef} className="restaurant-products-strip">
                    {filteredMenu.slice(0, 10).map((menuItem) => (
                      <article key={menuItem.id} className="restaurant-product-card">
                        <img
                          className="restaurant-product-image"
                          src={imageUrlFromMenuItem(menuItem.id)}
                          alt={menuItem.name}
                          loading="lazy"
                        />
                        <button
                          type="button"
                          className="restaurant-product-add"
                          onClick={() => onAddToCart(menuItem.id)}
                          disabled={menuItem.dailyStock <= 0 || isCartLockedToAnotherRestaurant}
                        >
                          +
                        </button>
                        <div className="restaurant-product-price">{euros(menuItem.priceCents)}</div>
                        <div className="restaurant-product-name">{menuItem.name}</div>
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

          <div style={{ fontWeight: 700, marginBottom: 10 }}>Toutes les propositions du restaurant</div>

          <div className="items restaurant-detail-menu-grid">
            {Object.entries(menuGroupedByCategory).map(([categoryName, menuItems]) => (
              <div key={categoryName} className="restaurant-category-block">
                <div className="restaurant-category-heading">{categoryName}</div>
                <div className="restaurant-category-items">
                  {menuItems.map((menuItem) => (
                    <div key={menuItem.id} className="card" style={{ padding: 12 }}>
                      <div className="row">
                        <div>
                          <div style={{ fontWeight: 700 }}>{menuItem.name}</div>
                          <div className="muted">{menuItem.description}</div>
                          <div className="muted">
                            {euros(menuItem.priceCents)} • stock {menuItem.dailyStock}
                          </div>
                        </div>
                        <button
                          onClick={() => onAddToCart(menuItem.id)}
                          disabled={menuItem.dailyStock <= 0 || isCartLockedToAnotherRestaurant}
                        >
                          Ajouter
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}