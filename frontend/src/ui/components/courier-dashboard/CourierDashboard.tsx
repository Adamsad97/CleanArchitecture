import { useMemo, useState } from "react";
import { CourierHero } from "./components/CourierHero";
import { CourierKpis } from "./components/CourierKpis";
import { CourierOrderCard } from "./components/CourierOrderCard";
import { CourierToolbar } from "./components/CourierToolbar";
import type { CourierDashboardProps, SortMode } from "./types";
import { sortOrders } from "./utils";

export function CourierDashboard({
  courierName,
  courierStatus,
  courierLocation,
  courierAddressLabel,
  courierGeoStatus,
  proposals,
  restaurants,
  searchQuery,
  dashboardMessage,
  isRefreshing,
  processingOrderId,
  onSearchChange,
  onToggleStatus,
  onRefresh,
  onAcceptOrder,
  onPickUpOrder,
  onDeliverOrder,
}: CourierDashboardProps) {
  const [sortMode, setSortMode] = useState<SortMode>("SMART");
  const [centeredOrderId, setCenteredOrderId] = useState<string | null>(null);
  const courierMapsUrl = courierLocation
    ? `https://www.google.com/maps/search/?api=1&query=${courierLocation.lat},${courierLocation.lng}`
    : null;

  const restaurantNames = useMemo(() => {
    return new Map(restaurants.map((restaurant) => [restaurant.id, restaurant.name]));
  }, [restaurants]);

  const filteredProposals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const candidates = !query
      ? proposals
      : proposals.filter((order) => {
          const restaurantName = (restaurantNames.get(order.restaurantId) ?? order.restaurantId).toLowerCase();
          const orderContent = `${order.id} ${restaurantName} ${order.status}`.toLowerCase();
          return orderContent.includes(query);
        });

    return sortOrders({
      orders: candidates,
      courierLocation,
      sortMode,
    });
  }, [courierLocation, proposals, restaurantNames, searchQuery, sortMode]);

  return (
    <section className="courier-dashboard">
      <CourierHero
        courierName={courierName}
        courierStatus={courierStatus}
        isRefreshing={isRefreshing}
        onRefresh={onRefresh}
        onToggleStatus={onToggleStatus}
      />

      <CourierKpis proposals={proposals} />

      <div className="card courier-board-card">
        <div className="row" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 20 }}>Missions en direct</div>
          <CourierToolbar
            sortMode={sortMode}
            searchQuery={searchQuery}
            onSortModeChange={setSortMode}
            onSearchChange={onSearchChange}
          />
        </div>

        <div className="muted" style={{ marginBottom: 10 }}>
          {courierLocation
            ? `Position live: ${courierAddressLabel}`
            : courierGeoStatus}
        </div>

        <div style={{ marginBottom: 12 }}>
          {courierMapsUrl ? (
            <a className="secondary courier-mini-map-link" href={courierMapsUrl} target="_blank" rel="noreferrer">
              Ouvrir ma position sur Google Maps
            </a>
          ) : (
            <button type="button" className="secondary" disabled>
              Active la position pour ouvrir Google Maps
            </button>
          )}
        </div>

        {dashboardMessage ? (
          <div className="courier-feedback">{dashboardMessage}</div>
        ) : null}

        <div className="courier-orders-grid">
          {filteredProposals.map((order, index) => {
            const restaurantName = restaurantNames.get(order.restaurantId) ?? order.restaurantId;
            return (
              <CourierOrderCard
                key={order.id}
                order={order}
                restaurantName={restaurantName}
                courierLocation={courierLocation}
                processingOrderId={processingOrderId}
                centeredOrderId={centeredOrderId}
                onToggleCenterOrder={(orderId) => {
                  setCenteredOrderId((current) => (current === orderId ? null : orderId));
                }}
                onAcceptOrder={onAcceptOrder}
                onPickUpOrder={onPickUpOrder}
                onDeliverOrder={onDeliverOrder}
                index={index}
              />
            );
          })}
        </div>

        {filteredProposals.length === 0 ? (
          <div className="muted" style={{ marginTop: 10 }}>
            Aucune mission pour ce filtre. Actualisez pour verifier les nouvelles courses.
          </div>
        ) : null}
      </div>
    </section>
  );
}
