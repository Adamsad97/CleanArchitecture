import { useEffect, useMemo, useRef, useState } from "react";
import type {
  FulfillmentType,
  PaymentMethod,
  PaymentVerificationInput,
} from "../../../payment/types";
import {
  FULFILLMENT_TYPE_DELIVERY,
  FULFILLMENT_TYPE_PICKUP,
  PAYMENT_METHOD_CASH,
  PAYMENT_METHOD_MOBILE_MONEY,
  PAYMENT_METHOD_PAYPAL,
} from "../../../payment/types";
import { ShareLocationButton } from "../location/ShareLocationButton";
import { PaymentSection } from "../../../payment/PaymentSection";
import { formatEuroFromCents } from "../../utils/money";

const CENTS_PER_EURO = 100;

type DeliveryAddress = {
  lat: number;
  lng: number;
};

type CheckoutSectionProps = {
  fulfillmentType: FulfillmentType;
  deliveryAddress: DeliveryAddress;
  deliveryAddressLabel: string;
  geoStatus: string;
  isLiveLocationEnabled: boolean;
  tipCents: number;
  cartCount: number;
  latestOrder: {
    orderId: string;
    invoiceId: string;
    restaurantName: string;
    fulfillmentType: FulfillmentType;
    itemsTotalCents?: number;
    lines?: ReadonlyArray<{ label: string; amountCents: number }>;
    totalCents: number;
    status: string;
    createdAt: string;
    paymentMethod?: PaymentMethod;
  } | null;
  message: string;
  onFulfillmentTypeChange: (type: FulfillmentType) => void;
  onTipChange: (tip: number) => void;
  onClearCart: () => void;
  onRefreshLocation: () => void;
  onToggleLiveLocation: () => void;
  onVerifyPayment: (payload: PaymentVerificationInput) => Promise<void>;
  onCheckout: (paymentMethod: PaymentMethod) => void;
};

function mapUrl(lat: number, lng: number): string {
  const delta = 0.01;
  const left = lng - delta;
  const right = lng + delta;
  const top = lat + delta;
  const bottom = lat - delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lng}`;
}

export function CheckoutSection({
  fulfillmentType,
  deliveryAddress,
  deliveryAddressLabel,
  geoStatus,
  isLiveLocationEnabled,
  tipCents,
  cartCount,
  latestOrder,
  message,
  onFulfillmentTypeChange,
  onTipChange,
  onClearCart,
  onRefreshLocation,
  onToggleLiveLocation,
  onVerifyPayment,
  onCheckout,
}: CheckoutSectionProps) {
  const presetTipsEuros = useMemo(() => [0, 1, 2, 3, 4, 5], []);
  const isPresetSelected = presetTipsEuros.some(
    (amount) => amount * CENTS_PER_EURO === tipCents
  );
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [customTipEuroInput, setCustomTipEuroInput] = useState("");
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function syncFullscreenState() {
      setIsMapFullscreen(document.fullscreenElement === mapContainerRef.current);
    }

    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    if (!isCustomAmount || tipCents <= 0) {
      setCustomTipEuroInput("");
      return;
    }
    setCustomTipEuroInput((tipCents / CENTS_PER_EURO).toFixed(2));
  }, [isCustomAmount, tipCents]);

  function selectPresetTip(euros: number) {
    setIsCustomAmount(false);
    onTipChange(euros * CENTS_PER_EURO);
  }

  function enableCustomTip() {
    setIsCustomAmount(true);
    if (tipCents > 0 && !isPresetSelected) {
      setCustomTipEuroInput((tipCents / CENTS_PER_EURO).toFixed(2));
      return;
    }
    setCustomTipEuroInput("");
    onTipChange(0);
  }

  function handleCustomTipChange(value: string) {
    const normalized = value.replace(",", ".");
    setCustomTipEuroInput(normalized);

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      onTipChange(0);
      return;
    }
    onTipChange(Math.round(parsed * CENTS_PER_EURO));
  }

  async function toggleMapFullscreen() {
    const mapContainer = mapContainerRef.current;
    if (!mapContainer) return;

    if (document.fullscreenElement === mapContainer) {
      await document.exitFullscreen();
      return;
    }

    await mapContainer.requestFullscreen();
  }

  return (
    <div className="card">
      <div style={{ fontWeight: 700, marginBottom: 12 }}>Finaliser la commande</div>
      <div className="checkout-fulfillment-toggle" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={fulfillmentType === FULFILLMENT_TYPE_DELIVERY ? "" : "secondary"}
          onClick={() => onFulfillmentTypeChange(FULFILLMENT_TYPE_DELIVERY)}
        >
          Livraison
        </button>
        <button
          type="button"
          className={fulfillmentType === FULFILLMENT_TYPE_PICKUP ? "" : "secondary"}
          onClick={() => onFulfillmentTypeChange(FULFILLMENT_TYPE_PICKUP)}
        >
          A emporter
        </button>
      </div>

      {fulfillmentType === FULFILLMENT_TYPE_DELIVERY ? (
        <>
          <div className="muted" style={{ marginBottom: 12 }}>
            Adresse de livraison: {deliveryAddressLabel}
          </div>
          <div className="muted" style={{ marginBottom: 12 }}>
            {geoStatus}
          </div>

          <div className="row" style={{ marginBottom: 8 }}>
            <div className="muted">Carte de livraison</div>
            <button className="secondary" type="button" onClick={toggleMapFullscreen}>
              {isMapFullscreen ? "Quitter plein ecran" : "Plein ecran"}
            </button>
          </div>

          <div ref={mapContainerRef} className="map-card" style={{ marginBottom: 12 }}>
            <div className="map-overlay-actions">
              <ShareLocationButton
                className="secondary"
                lat={deliveryAddress.lat}
                lng={deliveryAddress.lng}
                compact
              />
            </div>
            <iframe
              title="Carte de livraison"
              src={mapUrl(deliveryAddress.lat, deliveryAddress.lng)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div className="muted" style={{ marginBottom: 8 }}>
              Pourboire (EUR)
            </div>
            <div className="muted" style={{ marginBottom: 8 }}>
              {tipCents > 0
                ? `Pourboire selectionné: ${(tipCents / CENTS_PER_EURO).toFixed(2)} EUR`
                : "Aucun pourboire selectionne"}
            </div>
            <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
              {presetTipsEuros.map((amount) => {
                const isSelected =
                  !isCustomAmount && tipCents === amount * CENTS_PER_EURO;
                return (
                  <button
                    key={amount}
                    type="button"
                    className={isSelected ? "" : "secondary"}
                    onClick={() => selectPresetTip(amount)}
                  >
                    {amount === 0 ? "0 EUR" : `${amount} EUR`}
                  </button>
                );
              })}
              <button
                type="button"
                className={isCustomAmount ? "" : "secondary"}
                onClick={enableCustomTip}
              >
                Autre montant
              </button>
              {isCustomAmount ? (
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.01}
                  placeholder="Ex: 2.50"
                  value={customTipEuroInput}
                  onChange={(e) => handleCustomTipChange(e.target.value)}
                  style={{ width: 140 }}
                />
              ) : null}
            </div>
          </div>
        </>
      ) : (
        <div className="muted" style={{ marginBottom: 12 }}>
          A emporter selectionne: aucun frais de livraison et aucun pourboire livreur.
        </div>
      )}

      <PaymentSection cartCount={cartCount} onVerifyPayment={onVerifyPayment} onCheckout={onCheckout} />

      <div className="row">
        <button className="secondary" onClick={onClearCart} disabled={cartCount === 0}>
          Vider panier
        </button>
        {fulfillmentType === FULFILLMENT_TYPE_DELIVERY ? (
          <button className="secondary" onClick={onRefreshLocation}>
            Actualiser position
          </button>
        ) : null}
        {fulfillmentType === FULFILLMENT_TYPE_DELIVERY ? (
          <button
            className={isLiveLocationEnabled ? "" : "secondary"}
            onClick={onToggleLiveLocation}
            type="button"
          >
            {isLiveLocationEnabled
              ? "Arreter partage temps reel"
              : "Partager position en temps reel"}
          </button>
        ) : null}
      </div>

      {latestOrder ? (
        <div className="card" style={{ marginTop: 12, background: "#ecfdf5", borderColor: "#bbf7d0" }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Votre commande</div>
          <div style={{ display: "grid", gap: 4, fontSize: 14, color: "#14532d" }}>
            <div>Restaurant: {latestOrder.restaurantName}</div>
            <div>
              Mode: {latestOrder.fulfillmentType === FULFILLMENT_TYPE_PICKUP ? "A emporter" : "Livraison"}
            </div>
            <div>Commande: {latestOrder.orderId}</div>
            <div>Facture: {latestOrder.invoiceId}</div>
            <div>Statut: {latestOrder.status}</div>
            <div>
              Paiement: {latestOrder.paymentMethod === PAYMENT_METHOD_MOBILE_MONEY
                ? "Mobile Money"
                : latestOrder.paymentMethod === PAYMENT_METHOD_PAYPAL
                ? "PayPal"
                : latestOrder.paymentMethod === PAYMENT_METHOD_CASH
                ? "Especes"
                : "Carte bancaire"}
            </div>
            <div>Total panier: {formatEuroFromCents(latestOrder.itemsTotalCents ?? latestOrder.totalCents)}</div>
            {latestOrder.lines && latestOrder.lines.length > 0 ? (
              <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                {latestOrder.lines.map((line, index) => (
                  <div
                    key={`${latestOrder.orderId}-invoice-line-${index}`}
                    style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
                  >
                    <span>{line.label}</span>
                    <strong>{formatEuroFromCents(line.amountCents)}</strong>
                  </div>
                ))}
              </div>
            ) : null}
            <div>Total facture: {formatEuroFromCents(latestOrder.totalCents)}</div>
            <div>Horodatage: {new Date(latestOrder.createdAt).toLocaleString("fr-FR")}</div>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="card" style={{ marginTop: 12, background: "#f1f5f9" }}>
          <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{message}</div>
        </div>
      ) : null}
    </div>
  );
}