import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EcoEatsApi,
  type AuthRole,
  type AuthSession,
  type Cart,
  type CourierOrder,
  type CourierStatus,
  type Invoice,
  type MenuItem,
  type OrderStatus,
  type Restaurant,
} from "../api/ecoeats-api";
import type { FulfillmentType, PaymentMethod, PaymentVerificationInput } from "../payment/types";
import {
  FULFILLMENT_TYPE_DELIVERY,
  FULFILLMENT_TYPE_PICKUP,
  PAYMENT_METHOD_CARD,
  PAYMENT_METHOD_CASH,
  PAYMENT_METHOD_MOBILE_MONEY,
  PAYMENT_METHOD_PAYPAL,
} from "../payment/types";
import {
  COURIER_STATUS_AVAILABLE,
  COURIER_STATUS_UNAVAILABLE,
} from "../constants/domain-status";
import {
  clearAuthSessionFromStorage,
  loadAuthSessionFromStorage,
  saveAuthSessionToStorage,
} from "../application/auth/auth-session-storage";
import { loadAccountProfile } from "../application/auth/load-account-profile";
import { Header } from "./components/layout/Header";
import { CheckoutSection } from "./components/checkout/CheckoutSection";
import { extractRestaurantName } from "./utils/restaurant-name";
import { RestaurantSection } from "./components/restaurant/RestaurantSection";
import { RestaurantDashboard } from "./components/restaurant-dashboard/RestaurantDashboard";
import { CourierDashboard } from "./components/courier-dashboard/CourierDashboard";
import { AuthSection } from "./components/auth/AuthSection";
import {
  OrdersSection,
  type ClientOrderHistoryEntry,
} from "./components/orders/OrdersSection";
import { useLiveLocation } from "./hooks/use-live-location";
import { useReadableAddress } from "./hooks/use-readable-address";

const DEFAULT_DELIVERY_ADDRESS = { lat: 48.8584, lng: 2.2945 };
const RESTAURANT_ROUTE_PATTERN = /^\/restaurant\/([^/]+)$/;
const CLIENT_ORDER_STATUS_POLLING_INTERVAL_MS = 4000;
const COURIER_PROPOSALS_POLLING_INTERVAL_MS = 4000;
const RESTAURANT_OPERATIONS_POLLING_INTERVAL_MS = 5000;
const MAX_CLIENT_ORDER_HISTORY_ITEMS = 20;
const DEFAULT_COURIER_STATUS: CourierStatus = COURIER_STATUS_AVAILABLE;
const CLIENT_VIEW_SHOP = "SHOP" as const;
const CLIENT_VIEW_ORDERS = "ORDERS" as const;

function getRestaurantIdFromPathname(pathname: string): string | null {
  const routeMatch = pathname.match(RESTAURANT_ROUTE_PATTERN);
  if (!routeMatch || !routeMatch[1]) return null;
  return decodeURIComponent(routeMatch[1]);
}

function buildRestaurantPath(restaurantId: string): string {
  return `/restaurant/${encodeURIComponent(restaurantId)}`;
}

function favoritesStorageKey(userId: string): string {
  return `ecoeats:favorites:${userId}`;
}

type ClientOrderReceipt = Readonly<{
  orderId: string;
  invoiceId: string;
  restaurantName: string;
  fulfillmentType: FulfillmentType;
  paymentMethod: PaymentMethod;
  itemsTotalCents?: number;
  lines?: ReadonlyArray<{ label: string; amountCents: number }>;
  totalCents: number;
  status: OrderStatus;
  createdAt: string;
}>;

function clientOrderReceiptStorageKey(userId: string): string {
  return `ecoeats:last-order:${userId}`;
}

function clientOrderHistoryStorageKey(userId: string): string {
  return `ecoeats:orders-history:${userId}`;
}

function roleLabel(role: AuthRole): string {
  if (role === "CLIENT") return "Client";
  if (role === "COURIER") return "Livreur";
  return "Restaurant";
}

function seasonLabelFromDate(date: Date): string {
  const monthIndex = date.getMonth();
  if (monthIndex >= 2 && monthIndex <= 4) return "Printemps";
  if (monthIndex >= 5 && monthIndex <= 7) return "Ete";
  if (monthIndex >= 8 && monthIndex <= 10) return "Automne";
  return "Hiver";
}

export function App() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";
  const api = useMemo(() => new EcoEatsApi({ baseUrl: apiBaseUrl }), [apiBaseUrl]);

  const [session, setSession] = useState<AuthSession | null>(null);
  const [accountProfileName, setAccountProfileName] = useState<string | null>(null);
  const [restaurantProfileName, setRestaurantProfileName] = useState<string | null>(null);
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
  const [restaurantOperationsOrders, setRestaurantOperationsOrders] = useState<CourierOrder[]>([]);
  const [restaurantOperationsMessage, setRestaurantOperationsMessage] = useState<string>("");
  const [isRefreshingRestaurantOperations, setIsRefreshingRestaurantOperations] = useState<boolean>(false);
  const [processingRestaurantOrderId, setProcessingRestaurantOrderId] = useState<string | null>(null);
  const [favoriteRestaurantIds, setFavoriteRestaurantIds] = useState<string[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [courierStatus, setCourierStatus] = useState<CourierStatus>(DEFAULT_COURIER_STATUS);
  const [courierLocation, setCourierLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [courierProposals, setCourierProposals] = useState<CourierOrder[]>([]);
  const [courierMessage, setCourierMessage] = useState<string>("");
  const [isRefreshingCourier, setIsRefreshingCourier] = useState<boolean>(false);
  const [processingCourierOrderId, setProcessingCourierOrderId] = useState<string | null>(null);
  const [latestClientOrder, setLatestClientOrder] = useState<ClientOrderReceipt | null>(null);
  const [clientOrderHistory, setClientOrderHistory] = useState<ClientOrderHistoryEntry[]>([]);
  const [clientView, setClientView] = useState<typeof CLIENT_VIEW_SHOP | typeof CLIENT_VIEW_ORDERS>(
    CLIENT_VIEW_SHOP
  );

  const [tipCents, setTipCents] = useState<number>(0);
  const [clientFulfillmentType, setClientFulfillmentType] = useState<FulfillmentType>(
    FULFILLMENT_TYPE_DELIVERY
  );
  const [deliveryAddress, setDeliveryAddress] = useState(DEFAULT_DELIVERY_ADDRESS);
  const selectedRestaurantName =
    restaurants.find((restaurant) => restaurant.id === selectedRestaurantId)?.name ?? "";
  const selectedRestaurantDisplayName = extractRestaurantName(
    restaurants.find((restaurant) => restaurant.id === selectedRestaurantId)?.name ?? ""
  );
  const sessionRestaurantDisplayName = extractRestaurantName(
    restaurants.find((restaurant) => restaurant.id === session?.user.id)?.name ?? ""
  );
  const restaurantDisplayName =
    session?.user.role === "RESTAURANT"
      ? (selectedRestaurantDisplayName || undefined) ??
        (sessionRestaurantDisplayName || undefined) ??
        null
      : null;
  const userDisplayName =
    session?.user.role === "RESTAURANT"
      ? restaurantDisplayName ?? "Etablissement"
      : accountProfileName ?? session?.user.fullName ?? "";
  const seasonalLabel = useMemo(() => seasonLabelFromDate(new Date()), []);
  const { deliveryAddressLabel } = useReadableAddress({
    lat: deliveryAddress.lat,
    lng: deliveryAddress.lng,
  });
  const courierLocationForDisplay = courierLocation ?? DEFAULT_DELIVERY_ADDRESS;
  const { deliveryAddressLabel: courierAddressLabel } = useReadableAddress({
    lat: courierLocationForDisplay.lat,
    lng: courierLocationForDisplay.lng,
  });

  const {
    geoStatus,
    isLiveLocationEnabled,
    requestUserLocation,
    toggleLiveLocationTracking,
    stopLiveLocationTracking,
  } = useLiveLocation({ onLocationChanged: setDeliveryAddress });

  const {
    geoStatus: courierGeoStatus,
    requestUserLocation: requestCourierLocation,
    stopLiveLocationTracking: stopCourierLiveLocation,
  } = useLiveLocation({ onLocationChanged: setCourierLocation });

  const authenticatedClientId = session?.user.id ?? "";

  useEffect(() => {
    const savedSession = loadAuthSessionFromStorage();
    if (!savedSession) return;
    setSession(savedSession);
  }, []);

  useEffect(() => {
    if (!session) {
      clearAuthSessionFromStorage();
      setAccountProfileName(null);
      setRestaurantProfileName(null);
      setFavoriteRestaurantIds([]);
      setShowOnlyFavorites(false);
      setClientOrderHistory([]);
      setClientView(CLIENT_VIEW_SHOP);
      return;
    }
    saveAuthSessionToStorage(session);
  }, [session]);

  useEffect(() => {
    if (!session) return;

    let isCancelled = false;

    loadAccountProfile(api, session.user.id)
      .then((payload) => {
        if (isCancelled) return;
        if (!payload) {
          setSession(null);
          setMessage("Session expiree. Reconnectez-vous.");
          return;
        }
        setAccountProfileName(payload.profile.fullName ?? null);
        setRestaurantProfileName(
          payload.role === "RESTAURANT" ? payload.profile.lastName.trim() || null : null
        );
      })
      .catch((error: unknown) => {
        if (isCancelled) return;
        setAccountProfileName(null);
        setRestaurantProfileName(null);
        setMessage(error instanceof Error ? error.message : JSON.stringify(error));
      });

    return () => {
      isCancelled = true;
    };
  }, [api, session]);

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
    if (!session || session.user.role !== "CLIENT") {
      setClientOrderHistory([]);
      return;
    }

    const savedHistory = window.localStorage.getItem(clientOrderHistoryStorageKey(session.user.id));
    if (!savedHistory) {
      setClientOrderHistory([]);
      return;
    }

    try {
      const parsedHistory = JSON.parse(savedHistory) as unknown;
      if (!Array.isArray(parsedHistory)) {
        setClientOrderHistory([]);
        return;
      }

      const history = parsedHistory.filter((candidate): candidate is ClientOrderHistoryEntry => {
        if (!candidate || typeof candidate !== "object") return false;
        const entry = candidate as Partial<ClientOrderHistoryEntry>;
        if (
          typeof entry.orderId !== "string" ||
          typeof entry.invoiceId !== "string" ||
          typeof entry.restaurantName !== "string" ||
          typeof entry.totalCents !== "number" ||
          typeof entry.status !== "string" ||
          typeof entry.createdAt !== "string" ||
          !Array.isArray(entry.lines)
        ) {
          return false;
        }

        return entry.lines.every(
          (line) =>
            line &&
            typeof line === "object" &&
            typeof line.label === "string" &&
            typeof line.amountCents === "number"
        );
      });

      setClientOrderHistory(history.slice(0, MAX_CLIENT_ORDER_HISTORY_ITEMS));
    } catch {
      setClientOrderHistory([]);
    }
  }, [session]);

  useEffect(() => {
    if (!session || session.user.role !== "CLIENT") return;
    window.localStorage.setItem(
      clientOrderHistoryStorageKey(session.user.id),
      JSON.stringify(clientOrderHistory)
    );
  }, [clientOrderHistory, session]);

  useEffect(() => {
    if (!session || session.user.role !== "CLIENT") {
      setLatestClientOrder(null);
      return;
    }

    const savedOrder = window.localStorage.getItem(clientOrderReceiptStorageKey(session.user.id));
    if (!savedOrder) {
      setLatestClientOrder(null);
      return;
    }

    try {
      const parsedOrder = JSON.parse(savedOrder) as ClientOrderReceipt & {
        fulfillmentType?: unknown;
        paymentMethod?: unknown;
        itemsTotalCents?: unknown;
        lines?: unknown;
      };
      const persistedFulfillmentType =
        parsedOrder?.fulfillmentType === FULFILLMENT_TYPE_PICKUP ||
        parsedOrder?.fulfillmentType === FULFILLMENT_TYPE_DELIVERY
          ? parsedOrder.fulfillmentType
          : FULFILLMENT_TYPE_DELIVERY;
      const persistedPaymentMethod =
        parsedOrder?.paymentMethod === PAYMENT_METHOD_PAYPAL ||
        parsedOrder?.paymentMethod === PAYMENT_METHOD_MOBILE_MONEY ||
        parsedOrder?.paymentMethod === PAYMENT_METHOD_CASH ||
        parsedOrder?.paymentMethod === PAYMENT_METHOD_CARD
          ? parsedOrder.paymentMethod
          : PAYMENT_METHOD_CARD;
      if (
        parsedOrder &&
        typeof parsedOrder.orderId === "string" &&
        typeof parsedOrder.invoiceId === "string" &&
        typeof parsedOrder.restaurantName === "string" &&
        typeof parsedOrder.totalCents === "number" &&
        typeof parsedOrder.status === "string" &&
        typeof parsedOrder.createdAt === "string"
      ) {
        const persistedLines = Array.isArray(parsedOrder.lines)
          ? parsedOrder.lines.filter(
              (line): line is { label: string; amountCents: number } =>
                !!line &&
                typeof line === "object" &&
                typeof (line as { label?: unknown }).label === "string" &&
                typeof (line as { amountCents?: unknown }).amountCents === "number"
            )
          : undefined;

        setLatestClientOrder({
          ...parsedOrder,
          ...(typeof parsedOrder.itemsTotalCents === "number"
            ? { itemsTotalCents: parsedOrder.itemsTotalCents }
            : {}),
          ...(persistedLines ? { lines: persistedLines } : {}),
          fulfillmentType: persistedFulfillmentType,
          paymentMethod: persistedPaymentMethod,
        });
      } else {
        setLatestClientOrder(null);
      }
    } catch {
      setLatestClientOrder(null);
    }
  }, [session]);

  useEffect(() => {
    if (!session || session.user.role !== "CLIENT") return;
    if (!latestClientOrder) {
      window.localStorage.removeItem(clientOrderReceiptStorageKey(session.user.id));
      return;
    }
    window.localStorage.setItem(
      clientOrderReceiptStorageKey(session.user.id),
      JSON.stringify(latestClientOrder)
    );
  }, [latestClientOrder, session]);

  useEffect(() => {
    if (!session || session.user.role !== "CLIENT") return;
    if (!latestClientOrder) return;
    const latestOrderSnapshot = latestClientOrder;
    const alreadyTracked = clientOrderHistory.some(
      (entry) => entry.orderId === latestOrderSnapshot.orderId
    );
    if (alreadyTracked) return;

    let isCancelled = false;

    async function backfillLatestOrderHistory() {
      try {
        const latestInvoice = await api.getInvoice(latestOrderSnapshot.invoiceId);
        if (isCancelled) return;

        const backfilledOrder: ClientOrderHistoryEntry = {
          ...latestOrderSnapshot,
          lines: latestInvoice.lines,
        };

        setClientOrderHistory((previousHistory) =>
          [backfilledOrder, ...previousHistory].slice(0, MAX_CLIENT_ORDER_HISTORY_ITEMS)
        );
      } catch {
        // If invoice retrieval fails, keep Mes commandes state as-is.
      }
    }

    backfillLatestOrderHistory().catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [api, clientOrderHistory, latestClientOrder, session]);

  useEffect(() => {
    if (!session || session.user.role !== "CLIENT") return;
    if (!latestClientOrder?.invoiceId) return;
    if (latestClientOrder.lines && latestClientOrder.lines.length > 0) return;
    const latestInvoiceId = latestClientOrder.invoiceId;

    let isCancelled = false;

    async function backfillLatestOrderInvoiceLines() {
      try {
        const invoice = await api.getInvoice(latestInvoiceId);
        if (isCancelled) return;

        setLatestClientOrder((previousReceipt) => {
          if (!previousReceipt || previousReceipt.invoiceId !== invoice.id) return previousReceipt;
          if (previousReceipt.lines && previousReceipt.lines.length > 0) return previousReceipt;
          return { ...previousReceipt, lines: invoice.lines };
        });
      } catch {
        // Keep latest order visible even if invoice backfill fails.
      }
    }

    backfillLatestOrderInvoiceLines().catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [api, latestClientOrder?.invoiceId, latestClientOrder?.lines, session]);

  useEffect(() => {
    if (!session || session.user.role !== "CLIENT") return;
    if (!latestClientOrder?.orderId) return;

    const trackedOrderId = latestClientOrder.orderId;
    const clientId = session.user.id;

    let isCancelled = false;

    async function refreshClientOrderStatus() {
      try {
        const order = await api.getOrder(trackedOrderId, clientId);
        if (isCancelled) return;

        setLatestClientOrder((previousReceipt) => {
          if (!previousReceipt || previousReceipt.orderId !== order.id) return previousReceipt;
          const alreadyHasItemsTotal = typeof previousReceipt.itemsTotalCents === "number";
          if (previousReceipt.status === order.status && alreadyHasItemsTotal) {
            return previousReceipt;
          }
          return {
            ...previousReceipt,
            status: order.status,
            ...(alreadyHasItemsTotal ? {} : { itemsTotalCents: order.itemsTotalCents }),
          };
        });
        setClientOrderHistory((previousHistory) =>
          previousHistory.map((entry) =>
            entry.orderId === order.id
              ? {
                  ...entry,
                  status: order.status,
                }
              : entry
          )
        );
      } catch {
        // Ignore transient polling failures and keep the latest known state.
      }
    }

    function refreshOnVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      refreshClientOrderStatus().catch(() => {});
    }

    function refreshOnFocus() {
      refreshClientOrderStatus().catch(() => {});
    }

    refreshClientOrderStatus().catch(() => {});
    const intervalId = window.setInterval(() => {
      refreshClientOrderStatus().catch(() => {});
    }, CLIENT_ORDER_STATUS_POLLING_INTERVAL_MS);
    document.addEventListener("visibilitychange", refreshOnVisibilityChange);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshOnVisibilityChange);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [api, latestClientOrder?.orderId, session]);

  useEffect(() => {
    function syncRouteFromBrowserNavigation() {
      setActiveRestaurantId(getRestaurantIdFromPathname(window.location.pathname));
    }

    window.addEventListener("popstate", syncRouteFromBrowserNavigation);
    return () => window.removeEventListener("popstate", syncRouteFromBrowserNavigation);
  }, []);

  useEffect(() => {
    if (!session) return;
    if (session.user.role === "RESTAURANT" && !selectedRestaurantId) {
      setSelectedRestaurantId(session.user.id);
    }
  }, [session, selectedRestaurantId]);

  useEffect(() => {
    if (!session) return;
    api
      .listRestaurants()
      .then((restaurantList) => {
        const visibleRestaurants =
          session.user.role === "RESTAURANT"
            ? restaurantList.filter((restaurant) => restaurant.id === session.user.id)
            : restaurantList;

        setRestaurants(visibleRestaurants);

        if (activeRestaurantId) {
          const matchingRestaurant = visibleRestaurants.find(
            (restaurant) => restaurant.id === activeRestaurantId
          );
          if (matchingRestaurant) {
            setSelectedRestaurantId(matchingRestaurant.id);
            return;
          }

          window.history.replaceState({}, "", "/");
          setActiveRestaurantId(null);
        }

        if (visibleRestaurants[0]) {
          setSelectedRestaurantId(visibleRestaurants[0].id);
          return;
        }

        setSelectedRestaurantId("");
      })
      .catch((error) => {
        setMessage(JSON.stringify(error));
        setSelectedRestaurantId("");
      });
  }, [activeRestaurantId, api, session]);

  useEffect(() => {
    if (!session || !selectedRestaurantId || session.user.role === "COURIER") return;
    api
      .listMenu(selectedRestaurantId)
      .then(setMenu)
      .catch((error) => setMessage(JSON.stringify(error)));
  }, [api, selectedRestaurantId, session]);

  const refreshCourierProposals = useCallback(async () => {
    if (!session || session.user.role !== "COURIER") return;
    setIsRefreshingCourier(true);
    try {
      const orders = await api.listCourierProposals();
      setCourierProposals(orders);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      setCourierMessage(errorMessage);
    } finally {
      setIsRefreshingCourier(false);
    }
  }, [api, session]);

  useEffect(() => {
    if (!session || session.user.role !== "COURIER") return;
    refreshCourierProposals().catch(() => {});
    requestCourierLocation();

    function refreshOnVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      refreshCourierProposals().catch(() => {});
      requestCourierLocation();
    }

    function refreshOnFocus() {
      refreshCourierProposals().catch(() => {});
      requestCourierLocation();
    }

    document.addEventListener("visibilitychange", refreshOnVisibilityChange);
    window.addEventListener("focus", refreshOnFocus);

    const intervalId = window.setInterval(() => {
      refreshCourierProposals().catch(() => {});
      requestCourierLocation();
    }, COURIER_PROPOSALS_POLLING_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshOnVisibilityChange);
      window.removeEventListener("focus", refreshOnFocus);
      stopCourierLiveLocation();
    };
  }, [refreshCourierProposals, requestCourierLocation, session, stopCourierLiveLocation]);

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

  async function doCheckout(paymentMethod: PaymentMethod) {
    if (!authenticatedClientId) return;
    setMessage("");
    try {
      const snapshot = cart ?? (await api.getCart(authenticatedClientId));
      const restaurantName =
        restaurants.find((restaurant) => restaurant.id === snapshot.restaurantId)?.name ??
        selectedRestaurantName ??
        "Restaurant";
      const { orderId, invoiceId } = await api.checkout({
        clientId: authenticatedClientId,
        deliveryAddress:
          clientFulfillmentType === FULFILLMENT_TYPE_PICKUP
            ? restaurants.find((restaurant) => restaurant.id === snapshot.restaurantId)?.location ?? deliveryAddress
            : deliveryAddress,
        fulfillmentType: clientFulfillmentType,
        paymentMethod,
        ...(clientFulfillmentType === FULFILLMENT_TYPE_DELIVERY && tipCents > 0
          ? { tipCents }
          : {}),
      });
      const trackedOrder = await api.getOrder(orderId, authenticatedClientId);
      const invoice = await api.getInvoice(invoiceId);

      setCart({ clientId: authenticatedClientId, restaurantId: null, items: [] });
      setCartCount(0);
      api.listMenu(selectedRestaurantId).then(setMenu).catch(() => {});
      refreshCart().catch(() => {});

      const newOrderHistoryEntry: ClientOrderHistoryEntry = {
        orderId,
        invoiceId,
        restaurantName,
        fulfillmentType: clientFulfillmentType,
        paymentMethod,
        totalCents: invoice.totalCents,
        status: trackedOrder.status,
        createdAt: new Date().toISOString(),
        lines: invoice.lines,
      };

      setLatestClientOrder({
        orderId,
        invoiceId,
        restaurantName,
        fulfillmentType: clientFulfillmentType,
        paymentMethod,
        itemsTotalCents: trackedOrder.itemsTotalCents,
        lines: invoice.lines,
        totalCents: invoice.totalCents,
        status: trackedOrder.status,
        createdAt: newOrderHistoryEntry.createdAt,
      });
      setClientOrderHistory((previousHistory) =>
        [newOrderHistoryEntry, ...previousHistory.filter((entry) => entry.orderId !== orderId)].slice(
          0,
          MAX_CLIENT_ORDER_HISTORY_ITEMS
        )
      );

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

  const refreshRestaurantOperations = useCallback(async () => {
    if (!session || session.user.role !== "RESTAURANT") return;
    setIsRefreshingRestaurantOperations(true);
    try {
      const orders = await api.listRestaurantOperationsOrders();
      setRestaurantOperationsOrders(orders);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      setRestaurantOperationsMessage(errorMessage);
    } finally {
      setIsRefreshingRestaurantOperations(false);
    }
  }, [api, session]);

  useEffect(() => {
    if (!session || session.user.role !== "RESTAURANT") return;
    refreshRestaurantOperations().catch(() => {});

    function refreshOnVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      refreshRestaurantOperations().catch(() => {});
    }

    function refreshOnFocus() {
      refreshRestaurantOperations().catch(() => {});
    }

    document.addEventListener("visibilitychange", refreshOnVisibilityChange);
    window.addEventListener("focus", refreshOnFocus);
    const intervalId = window.setInterval(() => {
      refreshRestaurantOperations().catch(() => {});
    }, RESTAURANT_OPERATIONS_POLLING_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshOnVisibilityChange);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [refreshRestaurantOperations, session]);

  async function saveRestaurantMenuItem(payload: {
    id: string;
    restaurantId: string;
    name: string;
    description: string;
    priceCents: number;
    imageUrl: string | null;
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

  async function acceptRestaurantOrder(orderId: string, prepTimeMinutes: number) {
    setRestaurantOperationsMessage("");
    setProcessingRestaurantOrderId(orderId);
    try {
      await api.acceptRestaurantOrder({ orderId, prepTimeMinutes });
      await refreshRestaurantOperations();
      setRestaurantOperationsMessage(`Commande acceptee: ${orderId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      setRestaurantOperationsMessage(errorMessage);
    } finally {
      setProcessingRestaurantOrderId(null);
    }
  }

  async function refuseRestaurantOrder(orderId: string) {
    setRestaurantOperationsMessage("");
    setProcessingRestaurantOrderId(orderId);
    try {
      await api.refuseRestaurantOrder(orderId);
      await refreshRestaurantOperations();
      setRestaurantOperationsMessage(`Commande refusee: ${orderId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      setRestaurantOperationsMessage(errorMessage);
    } finally {
      setProcessingRestaurantOrderId(null);
    }
  }

  async function markRestaurantOrderReady(orderId: string) {
    setRestaurantOperationsMessage("");
    setProcessingRestaurantOrderId(orderId);
    try {
      await api.markRestaurantOrderReady(orderId);
      await refreshRestaurantOperations();
      setRestaurantOperationsMessage(`Commande prete: ${orderId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      setRestaurantOperationsMessage(errorMessage);
    } finally {
      setProcessingRestaurantOrderId(null);
    }
  }

  async function toggleCourierStatus() {
    if (!session || session.user.role !== "COURIER") return;
    setCourierMessage("");
    const nextStatus: CourierStatus =
      courierStatus === DEFAULT_COURIER_STATUS
        ? COURIER_STATUS_UNAVAILABLE
        : DEFAULT_COURIER_STATUS;

    try {
      await api.setCourierStatus({ courierId: session.user.id, status: nextStatus });
      setCourierStatus(nextStatus);
      await refreshCourierProposals();
      setCourierMessage(
        nextStatus === DEFAULT_COURIER_STATUS
          ? "Statut mis a jour: vous etes disponible."
          : "Statut mis a jour: vous etes indisponible."
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      setCourierMessage(errorMessage);
    }
  }

  async function acceptCourierOrder(orderId: string) {
    if (!session || session.user.role !== "COURIER") return;
    setProcessingCourierOrderId(orderId);
    setCourierMessage("");
    try {
      await api.acceptCourierDelivery({ courierId: session.user.id, orderId });
      await refreshCourierProposals();
      setCourierMessage(`Mission acceptee: ${orderId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      setCourierMessage(errorMessage);
    } finally {
      setProcessingCourierOrderId(null);
    }
  }

  async function pickUpCourierOrder(orderId: string) {
    if (!session || session.user.role !== "COURIER") return;
    setProcessingCourierOrderId(orderId);
    setCourierMessage("");
    try {
      await api.pickUpCourierOrder({ courierId: session.user.id, orderId });
      await refreshCourierProposals();
      setCourierMessage(`Commande recuperee: ${orderId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      setCourierMessage(errorMessage);
    } finally {
      setProcessingCourierOrderId(null);
    }
  }

  async function deliverCourierOrder(orderId: string) {
    if (!session || session.user.role !== "COURIER") return;
    setProcessingCourierOrderId(orderId);
    setCourierMessage("");
    try {
      const { creditedCents } = await api.completeCourierDelivery({ courierId: session.user.id, orderId });
      await refreshCourierProposals();
      setCourierMessage(`Livraison terminee: +${(creditedCents / 100).toFixed(2)} EUR`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      setCourierMessage(errorMessage);
    } finally {
      setProcessingCourierOrderId(null);
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
    setClientView(CLIENT_VIEW_SHOP);
    setMessage("");
    setTipCents(0);
    setClientFulfillmentType(FULFILLMENT_TYPE_DELIVERY);
    setCart(null);
    setCartCount(0);
    setCourierStatus(DEFAULT_COURIER_STATUS);
    setCourierProposals([]);
    setCourierMessage("");
    setRestaurantOperationsOrders([]);
    setRestaurantOperationsMessage("");
    setIsRefreshingRestaurantOperations(false);
    setProcessingRestaurantOrderId(null);
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
    setClientFulfillmentType(FULFILLMENT_TYPE_DELIVERY);
    setMessage("");
    setRestaurantStatusMessage("");
    setCourierStatus(DEFAULT_COURIER_STATUS);
    setCourierProposals([]);
    setCourierMessage("");
    setIsRefreshingCourier(false);
    setProcessingCourierOrderId(null);
    setRestaurantOperationsOrders([]);
    setRestaurantOperationsMessage("");
    setIsRefreshingRestaurantOperations(false);
    setProcessingRestaurantOrderId(null);
    setCourierLocation(null);
    stopCourierLiveLocation();
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
          showClientCounters={false}
          searchPlaceholder="Recherchez dans votre menu"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          userDisplayName={userDisplayName}
          userRoleLabel={roleLabel(session.user.role)}
          onLogout={handleLogout}
        />

        <RestaurantDashboard
          restaurants={restaurants}
          selectedRestaurantId={selectedRestaurantId}
          menu={menu}
          operationsOrders={restaurantOperationsOrders}
          operationsMessage={restaurantOperationsMessage}
          statusMessage={restaurantStatusMessage}
          isSaving={isSavingMenuItem}
          isRefreshingOperations={isRefreshingRestaurantOperations}
          processingOrderId={processingRestaurantOrderId}
          searchQuery={searchQuery}
          onSaveMenuItem={saveRestaurantMenuItem}
          onDeleteMenuItem={removeRestaurantMenuItem}
          onRefreshMenu={refreshSelectedRestaurantMenu}
          onRefreshOperations={refreshRestaurantOperations}
          onAcceptOrder={acceptRestaurantOrder}
          onRefuseOrder={refuseRestaurantOrder}
          onMarkOrderReady={markRestaurantOrderReady}
        />
      </div>
    );
  }

  if (session.user.role === "COURIER") {
    return (
      <div className="container">
        <Header
          cartCount={0}
          favoritesCount={0}
          showClientCounters={false}
          searchPlaceholder="Filtrer les missions"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          userDisplayName={userDisplayName}
          userRoleLabel={roleLabel(session.user.role)}
          onLogout={handleLogout}
        />

        <CourierDashboard
          courierName={userDisplayName}
          courierStatus={courierStatus}
          courierLocation={courierLocation}
          courierAddressLabel={courierAddressLabel}
          courierGeoStatus={courierGeoStatus}
          proposals={courierProposals}
          restaurants={restaurants}
          searchQuery={searchQuery}
          dashboardMessage={courierMessage}
          isRefreshing={isRefreshingCourier}
          processingOrderId={processingCourierOrderId}
          onSearchChange={setSearchQuery}
          onToggleStatus={toggleCourierStatus}
          onRefresh={() => {
            refreshCourierProposals().catch(() => {});
          }}
          onAcceptOrder={(orderId) => {
            acceptCourierOrder(orderId).catch(() => {});
          }}
          onPickUpOrder={(orderId) => {
            pickUpCourierOrder(orderId).catch(() => {});
          }}
          onDeliverOrder={(orderId) => {
            deliverCourierOrder(orderId).catch(() => {});
          }}
        />
      </div>
    );
  }

  return (
    <div className="container">
      <Header
        cartCount={cartCount}
        favoritesCount={favoriteRestaurantIds.length}
        clientView={clientView}
        onOpenShop={() => setClientView(CLIENT_VIEW_SHOP)}
        onOpenOrders={() => setClientView(CLIENT_VIEW_ORDERS)}
        searchPlaceholder={
          activeRestaurantId && selectedRestaurantName
            ? `Recherchez dans ${selectedRestaurantName}`
            : "Recherchez restaurants et plats"
        }
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        userDisplayName={userDisplayName}
        userRoleLabel={roleLabel(session.user.role)}
        onLogout={handleLogout}
      />

      {clientView === CLIENT_VIEW_ORDERS ? (
        <OrdersSection orders={clientOrderHistory} />
      ) : (
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
            <div className="mini-cart-head">
              <div className="mini-cart-title-wrap">
                <div className="mini-cart-title">Panier Client</div>
                <div className="mini-cart-subtitle">Assistant de commande pro</div>
              </div>
              <span className="mini-cart-season-badge">Selection {seasonalLabel}</span>
            </div>
            <div className="mini-cart-summary">
              {cartCount > 0
                ? `${cartCount} article(s) pret(s) pour validation`
                : "Votre panier est vide, ajoutez des produits pour commencer"}
            </div>
            <div className="mini-cart-meta">
              <span>
                Mode: {clientFulfillmentType === FULFILLMENT_TYPE_DELIVERY ? "Livraison" : "A emporter"}
              </span>
              <span>Etat: {cartCount > 0 ? "Actif" : "En attente"}</span>
            </div>
            <a className="mini-cart-link" href="#checkout-panel">
              {cartCount > 0 ? "Finaliser la commande" : "Configurer votre commande"}
            </a>
          </div>

          <div id="checkout-panel">
            <CheckoutSection
              fulfillmentType={clientFulfillmentType}
              deliveryAddress={deliveryAddress}
              deliveryAddressLabel={deliveryAddressLabel}
              geoStatus={geoStatus}
              isLiveLocationEnabled={isLiveLocationEnabled}
              tipCents={tipCents}
              cartCount={cartCount}
              latestOrder={latestClientOrder}
              message={message}
              onFulfillmentTypeChange={(nextType) => {
                setClientFulfillmentType(nextType);
                if (nextType === FULFILLMENT_TYPE_PICKUP) {
                  setTipCents(0);
                }
              }}
              onTipChange={setTipCents}
              onClearCart={clear}
              onRefreshLocation={requestUserLocation}
              onToggleLiveLocation={toggleLiveLocationTracking}
              onVerifyPayment={async (payload: PaymentVerificationInput) => {
                await api.verifyPayment(payload);
              }}
              onCheckout={(method) => {
                doCheckout(method).catch(() => {});
              }}
            />
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
