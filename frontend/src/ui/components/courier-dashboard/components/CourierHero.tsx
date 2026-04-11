import type { CourierStatus } from "../../../../api/ecoeats-api";
import { COURIER_STATUS_AVAILABLE } from "../../../../constants/domain-status";

type CourierHeroProps = {
  courierName: string;
  courierStatus: CourierStatus;
  isRefreshing: boolean;
  onRefresh: () => void;
  onToggleStatus: () => void;
};

export function CourierHero({
  courierName,
  courierStatus,
  isRefreshing,
  onRefresh,
  onToggleStatus,
}: CourierHeroProps) {
  return (
    <div className="courier-hero">
      <div>
        <div className="courier-title">Tableau de bord livreur</div>
        <div className="muted" style={{ marginTop: 6 }}>
          {courierName} • Statut actuel: {courierStatus === COURIER_STATUS_AVAILABLE ? "Disponible" : "Indisponible"}
        </div>
      </div>

      <div className="courier-hero-actions">
        <button type="button" className="secondary" onClick={onRefresh} disabled={isRefreshing}>
          {isRefreshing ? "Actualisation..." : "Actualiser les courses"}
        </button>
        <button
          type="button"
          className={courierStatus === COURIER_STATUS_AVAILABLE ? "" : "secondary"}
          onClick={onToggleStatus}
        >
          {courierStatus === COURIER_STATUS_AVAILABLE ? "Passer indisponible" : "Passer disponible"}
        </button>
      </div>
    </div>
  );
}
