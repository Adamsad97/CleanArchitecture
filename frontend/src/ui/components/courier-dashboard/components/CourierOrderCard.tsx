import { type CSSProperties } from "react";
import type { CourierOrder } from "../../../../api/ecoeats-api";
import {
  ORDER_STATUS_DELIVERED,
  ORDER_STATUS_PICKED_UP,
  ORDER_STATUS_READY_FOR_PICKUP,
} from "../../../../constants/domain-status";
import { useReadableAddress } from "../../../hooks/use-readable-address";
import {
  etaLabel,
  euros,
  haversineKm,
  mapUrlForFocus,
  missionPriorityScore,
  priorityBucket,
  progressLabel,
} from "../utils";

type CourierOrderCardProps = {
  order: CourierOrder;
  restaurantName: string;
  courierLocation: { lat: number; lng: number } | null;
  processingOrderId: string | null;
  centeredOrderId: string | null;
  onToggleCenterOrder: (orderId: string) => void;
  onAcceptOrder: (orderId: string) => void;
  onPickUpOrder: (orderId: string) => void;
  onDeliverOrder: (orderId: string) => void;
  index: number;
};

export function CourierOrderCard({
  order,
  restaurantName,
  courierLocation,
  processingOrderId,
  centeredOrderId,
  onToggleCenterOrder,
  onAcceptOrder,
  onPickUpOrder,
  onDeliverOrder,
  index,
}: CourierOrderCardProps) {
  const isProcessing = processingOrderId === order.id;
  const distanceKm = courierLocation ? haversineKm(courierLocation, order.deliveryAddress) : null;
  const priorityScore = missionPriorityScore({ order, courierLocation });
  const priority = priorityBucket(priorityScore);
  const isCenteredOnCourier = centeredOrderId === order.id;
  const { deliveryAddressLabel } = useReadableAddress({
    lat: order.deliveryAddress.lat,
    lng: order.deliveryAddress.lng,
  });

  const deliveryMapUrl = courierLocation
    ? `https://www.google.com/maps/dir/?api=1&origin=${courierLocation.lat},${courierLocation.lng}&destination=${order.deliveryAddress.lat},${order.deliveryAddress.lng}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${order.deliveryAddress.lat},${order.deliveryAddress.lng}`;

  const cardAnimationStyle = {
    "--stagger-index": index,
  } as CSSProperties;

  return (
    <article className={`courier-order-card courier-priority-${priority}`} style={cardAnimationStyle}>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div>
          <div className="courier-order-id">#{order.id.slice(0, 8)}</div>
          <div className="muted">{restaurantName}</div>
        </div>
        <div className="courier-badges-stack">
          <span className={`courier-status-badge status-${order.status.toLowerCase()}`}>
            {progressLabel(order.status)}
          </span>
          <span className={`courier-priority-badge ${priority}`}>
            Priorite {priority === "high" ? "Haute" : priority === "medium" ? "Moyenne" : "Basse"}
          </span>
        </div>
      </div>

      <div className="courier-order-meta">
        <div>Adresse: {deliveryAddressLabel}</div>
        <div>ETA estimee: {etaLabel(order.id)}</div>
        <div>Distance: {distanceKm !== null ? `${distanceKm.toFixed(2)} km` : "Non disponible"}</div>
        <div>Total client: {euros(order.totalCents)}</div>
        <div>Tip: {euros(order.tipCents)}</div>
        <div>Score intelligent: {priorityScore}</div>
      </div>

      <div className="courier-mini-map">
        <div className="courier-mini-map-toolbar">
          <a className="secondary courier-mini-map-link" href={deliveryMapUrl} target="_blank" rel="noreferrer">
            Ouvrir sur Google Maps
          </a>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              onToggleCenterOrder(order.id);
            }}
            disabled={!courierLocation}
          >
            {isCenteredOnCourier ? "Voir destination" : "Centrer sur ma position"}
          </button>
        </div>
        <iframe
          title={`Carte mission ${order.id}`}
          src={mapUrlForFocus({
            deliveryAddress: order.deliveryAddress,
            courierLocation,
            focusOnCourier: isCenteredOnCourier,
          })}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div className="courier-order-lines">
        {order.lines.slice(0, 2).map((line) => (
          <div key={`${order.id}-${line.menuItemId}`} className="muted">
            {line.quantity} x {line.name}
          </div>
        ))}
        {order.lines.length > 2 ? (
          <div className="muted">+{order.lines.length - 2} autre(s) article(s)</div>
        ) : null}
      </div>

      <div className="courier-order-actions">
        <button
          type="button"
          className="secondary"
          disabled={
            isProcessing ||
            order.status === ORDER_STATUS_PICKED_UP ||
            order.status === ORDER_STATUS_DELIVERED
          }
          onClick={() => onAcceptOrder(order.id)}
        >
          Accepter
        </button>
        <button
          type="button"
          className="secondary"
          disabled={isProcessing || order.status !== ORDER_STATUS_READY_FOR_PICKUP}
          onClick={() => onPickUpOrder(order.id)}
        >
          Recuperer
        </button>
        <button
          type="button"
          disabled={isProcessing || order.status !== ORDER_STATUS_PICKED_UP}
          onClick={() => onDeliverOrder(order.id)}
        >
          Livrer
        </button>
      </div>
    </article>
  );
}
