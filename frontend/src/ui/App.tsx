import { useEffect, useMemo, useState } from "react";
import {
  EcoEatsApi,
  type AuthRole,
  type AuthSession,
  type Cart,
  type MenuItem,
  type Restaurant,
} from "../api/ecoeats-api";
import {
  clearAuthSessionFromStorage,
  loadAuthSessionFromStorage,
  saveAuthSessionToStorage,
} from "../application/auth/auth-session-storage";
import { Header } from "./components/layout/Header";
import { CheckoutSection } from "./components/checkout/CheckoutSection";
import { RestaurantSection } from "./components/restaurant/RestaurantSection";
import { RestaurantDashboard } from "./components/restaurant-dashboard/RestaurantDashboard";
import { AuthSection } from "./components/auth/AuthSection";
import { useLiveLocation } from "./hooks/use-live-location";
import { useReadableAddress } from "./hooks/use-readable-address";

const defaultDeliveryAddress = { lat: 48.8584, lng: 2.2945 };

function getRestaurantIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/restaurant\/([^/]+)$/);
  if (!match || !match[1]) return null;
  return decodeURIComponent(match[1]);
}

function buildRestaurantPath(restaurantId: string): string {
  return `/restaurant/${encodeURIComponent(restaurantId)}`;
}

function favoritesStorageKey(userId: string): string {
  return `ecoeats:favorites:${userId}`;
}

function roleLabel(role: AuthRole): string {
  if (role === "CLIENT") return "Client";
  if (role === "COURIER") return "Livreur";
  return "Restaurant";
}

export function App() {
  const api = useMemo(() => new EcoEatsApi({ baseUrl: "http://localhost:3001" }), []);

  const [session, setSession] = useState<AuthSession | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(() =>
    getRestaurantIdFromPathname(window.location.pathname)
  );
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("");
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cartCount, setCartCount] = useState<number>(0);
  const [cart, setCart] = useState<Cart | null>(null);
  const [message, setMessage] = useState<string>("");
  const [restaurantStatusMessage, setRestaurantStatusMessage] = useState<string>("");
  const [isSavingMenuItem, setIsSavingMenuItem] = useState<boolean>(false);
  const [favoriteRestaurantIds, setFavoriteRestaurantIds] = useState<string[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [tipCents, setTipCents] = useState<number>(0);
  const [deliveryAddress, setDeliveryAddress] = useState(defaultDeliveryAddress);
  const selectedRestaurantName =
    restaurants.find((restaurant) => restaurant.id === selectedRestaurantId)?.name ?? "";
  const { deliveryAddressLabel } = useReadableAddress({
    lat: deliveryAddress.lat,
    lng: deliveryAddress.lng,
  });

  const {
    geoStatus,
    isLiveLocationEnabled,
    requestUserLocation,
    toggleLiveLocationTracking,
    stopLiveLocationTracking,
  } = useLiveLocation({ onLocationChanged: setDeliveryAddress });

  const authenticatedClientId = session?.user.id ?? "";

  useEffect(() => {
    const savedSession = loadAuthSessionFromStorage();
    if (!savedSession) return;
    setSession(savedSession);
  }, []);

  useEffect(() => {
    if (!session) {
      clearAuthSessionFromStorage();
      setFavoriteRestaurantIds([]);
      setShowOnlyFavorites(false);
      return;
    }
    saveAuthSessionToStorage(session);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const savedFavorites = window.localStorage.getItem(favoritesStorageKey(session.user.id));
    if (!savedFavorites) {
      setFavoriteRestaurantIds([]);
      return;
    }

    try {
      const parsedFavorites = JSON.parse(savedFavorites);
      if (Array.isArray(parsedFavorites) && parsedFavorites.every((value) => typeof value === "string")) {
        setFavoriteRestaurantIds(parsedFavorites);
      } else {
        setFavoriteRestaurantIds([]);
      }
    } catch {
      setFavoriteRestaurantIds([]);
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    window.localStorage.setItem(
      favoritesStorageKey(session.user.id),
      JSON.stringify(favoriteRestaurantIds)
    );
  }, [favoriteRestaurantIds, session]);

  useEffect(() => {
    function syncRouteFromBrowserNavigation() {
      setActiveRestaurantId(getRestaurantIdFromPathname(window.location.pathname));
    }

    window.addEventListener("popstate", syncRouteFromBrowserNavigation);
    return () => window.removeEventListener("popstate", syncRouteFromBrowserNavigation);
  }, []);

  useEffect(() => {
    if (!session) return;
    api
      .listRestaurants()
      .then((restaurantList) => {
        setRestaurants(restaurantList);

        if (activeRestaurantId) {
          const matchingRestaurant = restaurantList.find(
            (restaurant) => restaurant.id === activeRestaurantId
          );
          if (matchingRestaurant) {
            setSelectedRestaurantId(matchingRestaurant.id);
            return;
          }

          window.history.replaceState({}, "", "/");
          setActiveRestaurantId(null);
        }

        if (restaurantList[0]) setSelectedRestaurantId(restaurantList[0].id);
      })
      .catch((error) => setMessage(JSON.stringify(error)));
  }, [activeRestaurantId, api, session]);

  useEffect(() => {
    if (!session || !selectedRestaurantId) return;
    api
      .listMenu(selectedRestaurantId)
      .then(setMenu)
      .catch((error) => setMessage(JSON.stringify(error)));
  }, [api, selectedRestaurantId, session]);

  async function refreshCart() {
    if (!authenticatedClientId) return;
    const currentCart = await api.getCart(authenticatedClientId);
    setCart(currentCart);
    setCartCount(currentCart.items.reduce((sum, item) => sum + item.quantity, 0));
  }

  useEffect(() => {
    if (!session || session.user.role !== "CLIENT") return;
    refreshCart().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!session || session.user.role !== "CLIENT") return;
    requestUserLocation();
  }, [requestUserLocation, session]);

  async function add(menuItemId: string) {
    if (!authenticatedClientId) return;
    setMessage("");
    try {
      await api.addToCart({ clientId: authenticatedClientId, menuItemId, quantity: 1 });
      await refreshCart();
    } catch (error: any) {
      setMessage(error?.message ?? JSON.stringify(error));
    }
  }

  async function clear() {
    if (!authenticatedClientId) return;
    await api.clearCart(authenticatedClientId);
    await refreshCart();
  }

  async function doCheckout() {
    if (!authenticatedClientId) return;
    setMessage("");
    try {
      const snapshot = cart ?? (await api.getCart(authenticatedClientId));
      const { orderId, invoiceId } = await api.checkout({
        clientId: authenticatedClientId,
        deliveryAddress,
        ...(tipCents > 0 ? { tipCents } : {}),
      });

      const purchased = new Map<string, number>();
      for (const item of snapshot.items) {
        purchased.set(item.menuItemId, (purchased.get(item.menuItemId) ?? 0) + item.quantity);
      }
      setMenu((previousMenu) =>
        previousMenu.map((menuItem) => {
          const quantity = purchased.get(menuItem.id);
          if (!quantity) return menuItem;
          return { ...menuItem, dailyStock: Math.max(0, menuItem.dailyStock - quantity) };
        })
      );

      setCart({ clientId: authenticatedClientId, restaurantId: null, items: [] });
      setCartCount(0);
      api.listMenu(selectedRestaurantId).then(setMenu).catch(() => {});
      refreshCart().catch(() => {});

      setMessage(`Commande OK: orderId=${orderId} invoiceId=${invoiceId}`);
    } catch (error: any) {
      setMessage(error?.message ?? JSON.stringify(error));
    }
  }

  async function refreshSelectedRestaurantMenu() {
    if (!selectedRestaurantId) return;
    const latestMenu = await api.listMenu(selectedRestaurantId);
    setMenu(latestMenu);
  }

  async function saveRestaurantMenuItem(payload: {
    id: string;
    restaurantId: string;
    name: string;
    description: string;
    priceCents: number;
    allergens: string[];
    dailyStock: number;
  }) {
    setRestaurantStatusMessage("");
    setIsSavingMenuItem(true);
    try {
      await api.upsertMenuItem(payload);
      await refreshSelectedRestaurantMenu();
      setRestaurantStatusMessage("Produit enregistre avec succes.");
    } catch (error: any) {
      setRestaurantStatusMessage(error?.message ?? JSON.stringify(error));
    } finally {
      setIsSavingMenuItem(false);
    }
  }

  async function removeRestaurantMenuItem(menuItemId: string) {
    setRestaurantStatusMessage("");
    try {
      await api.deleteMenuItem(menuItemId);
      await refreshSelectedRestaurantMenu();
      setRestaurantStatusMessage("Produit supprime du menu.");
    } catch (error: any) {
      setRestaurantStatusMessage(error?.message ?? JSON.stringify(error));
    }
  }

  function openRestaurant(restaurantId: string) {
    setSelectedRestaurantId(restaurantId);
    setActiveRestaurantId(restaurantId);
    window.history.pushState({}, "", buildRestaurantPath(restaurantId));
  }

  function closeRestaurant() {
    setActiveRestaurantId(null);
    window.history.pushState({}, "", "/");
  }

  function toggleFavoriteRestaurant(restaurantId: string) {
    setFavoriteRestaurantIds((previousFavorites) => {
      if (previousFavorites.includes(restaurantId)) {
        return previousFavorites.filter((id) => id !== restaurantId);
      }
      return [...previousFavorites, restaurantId];
    });
  }

  function handleAuthenticated(nextSession: AuthSession) {
    setSession(nextSession);
    setMessage("");
    setTipCents(0);
    setCart(null);
    setCartCount(0);
  }

  function handleLogout() {
    setSession(null);
    setRestaurants([]);
    setMenu([]);
    setActiveRestaurantId(null);
    setSelectedRestaurantId("");
    setCart(null);
    setCartCount(0);
    setTipCents(0);
    setMessage("");
    setRestaurantStatusMessage("");
    stopLiveLocationTracking();
  }

  if (!session) {
    return (
      <AuthSection
        onRegister={(params) => api.register(params)}
        onLogin={(params) => api.login(params)}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  if (session.user.role === "RESTAURANT") {
    return (
      <div className="container">
        <Header
          cartCount={0}
          favoritesCount={0}
          searchPlaceholder="Recherchez dans votre menu"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          userDisplayName={session.user.fullName}
          userRoleLabel={roleLabel(session.user.role)}
          onLogout={handleLogout}
        />

        <RestaurantDashboard
          userDisplayName={session.user.fullName}
          restaurants={restaurants}
          selectedRestaurantId={selectedRestaurantId}
          menu={menu}
          statusMessage={restaurantStatusMessage}
          isSaving={isSavingMenuItem}
          onRestaurantChange={(restaurantId) => {
            setSelectedRestaurantId(restaurantId);
            setActiveRestaurantId(null);
          }}
          onSaveMenuItem={saveRestaurantMenuItem}
          onDeleteMenuItem={removeRestaurantMenuItem}
          onRefreshMenu={refreshSelectedRestaurantMenu}
        />
      </div>
    );
  }

  return (
    <div className="container">
      <Header
        cartCount={cartCount}
        favoritesCount={favoriteRestaurantIds.length}
        searchPlaceholder={
          activeRestaurantId && selectedRestaurantName
            ? `Recherchez dans ${selectedRestaurantName}`
            : "Recherchez restaurants et plats"
        }
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        userDisplayName={session.user.fullName}
        userRoleLabel={roleLabel(session.user.role)}
        onLogout={handleLogout}
      />

      <div className="grid">
        <RestaurantSection
          restaurants={restaurants}
          selectedRestaurantId={selectedRestaurantId}
          activeRestaurantId={activeRestaurantId}
          menu={menu}
          cartRestaurantId={cart?.restaurantId ?? null}
          favoriteRestaurantIds={favoriteRestaurantIds}
          showOnlyFavorites={showOnlyFavorites}
          searchQuery={searchQuery}
          onToggleShowOnlyFavorites={() => setShowOnlyFavorites((value) => !value)}
          onToggleFavoriteRestaurant={toggleFavoriteRestaurant}
          onOpenRestaurant={openRestaurant}
          onCloseRestaurant={closeRestaurant}
          onAddToCart={add}
        />

        <div className="checkout-column">
          <div className="card mini-cart-panel">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Mini panier</div>
            <div className="muted" style={{ marginBottom: 10 }}>
              {cartCount > 0
                ? `${cartCount} article(s) dans votre panier`
                : "Votre panier est vide pour le moment"}
            </div>
            <a className="mini-cart-link" href="#checkout-panel">
              {cartCount > 0 ? "Voir panier et payer" : "Aller au checkout"}
            </a>
          </div>

          <div id="checkout-panel">
            <CheckoutSection
              deliveryAddress={deliveryAddress}
              deliveryAddressLabel={deliveryAddressLabel}
              geoStatus={geoStatus}
              isLiveLocationEnabled={isLiveLocationEnabled}
              tipCents={tipCents}
              cartCount={cartCount}
              message={message}
              onTipChange={setTipCents}
              onClearCart={clear}
              onRefreshLocation={requestUserLocation}
              onToggleLiveLocation={toggleLiveLocationTracking}
              onCheckout={doCheckout}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
