import type { FulfillmentType, PaymentMethod } from "../../../payment/types";
import type { OrderStatus } from "../../../api/ecoeats-api";
import { formatEuroFromCents } from "../../utils/money";

export type ClientOrderHistoryEntry = Readonly<{
  orderId: string;
  invoiceId: string;
  restaurantName: string;
  fulfillmentType: FulfillmentType;
  paymentMethod: PaymentMethod;
  totalCents: number;
  status: OrderStatus;
  createdAt: string;
  lines: ReadonlyArray<{
    label: string;
    amountCents: number;
  }>;
}>;

type OrdersSectionProps = {
  orders: ClientOrderHistoryEntry[];
};

function paymentLabel(paymentMethod: PaymentMethod): string {
  if (paymentMethod === "MOBILE_MONEY") return "Mobile Money";
  if (paymentMethod === "PAYPAL") return "PayPal";
  if (paymentMethod === "CASH") return "Especes";
  return "Carte bancaire";
}

function fulfillmentLabel(fulfillmentType: FulfillmentType): string {
  if (fulfillmentType === "PICKUP") return "A emporter";
  return "Livraison";
}

function isAdditionalChargeLabel(label: string): boolean {
  return (
    label.startsWith("Frais de livraison") ||
    label.startsWith("Frais de service") ||
    label.startsWith("Pourboire")
  );
}

export function OrdersSection({ orders }: OrdersSectionProps) {
  return (
    <section className="card" style={{ minHeight: 260 }}>
      <div style={{ fontWeight: 800, fontSize: 24, marginBottom: 8 }}>Mes commandes</div>
      <div className="muted" style={{ marginBottom: 14 }}>
        Retrouvez vos produits payes et le montant de chaque commande.
      </div>

      {orders.length === 0 ? (
        <div className="card" style={{ background: "#f8fafc" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Aucune commande pour le moment</div>
          <div className="muted">Finalisez une commande pour l'afficher ici.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {orders.map((order) => (
            (() => {
              const productLines = order.lines.filter((line) => !isAdditionalChargeLabel(line.label));
              const additionalChargeLines = order.lines.filter((line) => isAdditionalChargeLabel(line.label));

              return (
            <article key={order.orderId} className="card" style={{ background: "#f8fafc" }}>
              <div style={{ display: "grid", gap: 4, marginBottom: 10 }}>
                <div style={{ fontWeight: 700 }}>Restaurant: {order.restaurantName}</div>
                <div>Mode: {fulfillmentLabel(order.fulfillmentType)}</div>
                <div>Commande: {order.orderId}</div>
                <div>Facture: {order.invoiceId}</div>
                <div>Statut: {order.status}</div>
                <div>Paiement: {paymentLabel(order.paymentMethod)}</div>
                <div>Horodatage: {new Date(order.createdAt).toLocaleString("fr-FR")}</div>
              </div>

              <div style={{ marginBottom: 6, fontWeight: 700 }}>Produits payes</div>
              {productLines.length === 0 ? (
                <div className="muted" style={{ marginBottom: 8 }}>Aucune ligne de facture.</div>
              ) : (
                <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
                  {productLines.map((line, index) => (
                    <div
                      key={`${order.orderId}-${index}`}
                      style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
                    >
                      <span>{line.label}</span>
                      <strong>{formatEuroFromCents(line.amountCents)}</strong>
                    </div>
                  ))}
                </div>
              )}

              {additionalChargeLines.length > 0 ? (
                <>
                  <div style={{ marginBottom: 6, fontWeight: 700 }}>Frais et supplements</div>
                  <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
                    {additionalChargeLines.map((line, index) => (
                      <div
                        key={`${order.orderId}-charge-${index}`}
                        style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
                      >
                        <span>{line.label}</span>
                        <strong>{formatEuroFromCents(line.amountCents)}</strong>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700 }}>Montant total</span>
                <span style={{ fontWeight: 800 }}>{formatEuroFromCents(order.totalCents)}</span>
              </div>
            </article>
              );
            })()
          ))}
        </div>
      )}
    </section>
  );
}
