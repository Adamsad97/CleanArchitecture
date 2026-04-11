import type { CourierOrder } from "../../../../api/ecoeats-api";
import {
  ORDER_STATUS_DELIVERED,
  ORDER_STATUS_PICKED_UP,
  ORDER_STATUS_READY_FOR_PICKUP,
} from "../../../../constants/domain-status";
import { euros } from "../utils";

type CourierKpisProps = {
  proposals: CourierOrder[];
};

export function CourierKpis({ proposals }: CourierKpisProps) {
  const pickedUpCount = proposals.filter(
    (order) => order.status === ORDER_STATUS_PICKED_UP
  ).length;
  const readyCount = proposals.filter(
    (order) => order.status === ORDER_STATUS_READY_FOR_PICKUP
  ).length;
  const estimatedRevenueCents = proposals.reduce((totalCents, order) => {
    if (order.status !== ORDER_STATUS_DELIVERED) return totalCents;
    return totalCents + order.tipCents + order.deliveryFeeCents;
  }, 0);

  return (
    <div className="courier-kpis">
      <article className="card courier-kpi-card">
        <div className="muted">Courses visibles</div>
        <div className="courier-kpi-value">{proposals.length}</div>
      </article>
      <article className="card courier-kpi-card">
        <div className="muted">Pretes a recuperer</div>
        <div className="courier-kpi-value">{readyCount}</div>
      </article>
      <article className="card courier-kpi-card">
        <div className="muted">En route</div>
        <div className="courier-kpi-value">{pickedUpCount}</div>
      </article>
      <article className="card courier-kpi-card">
        <div className="muted">Revenus estimes</div>
        <div className="courier-kpi-value">{euros(estimatedRevenueCents)}</div>
      </article>
    </div>
  );
}
