import { useEffect, useMemo, useRef, useState } from "react";
import { ShareLocationButton } from "../location/ShareLocationButton";

type DeliveryAddress = {
  lat: number;
  lng: number;
};

type CheckoutSectionProps = {
  deliveryAddress: DeliveryAddress;
  deliveryAddressLabel: string;
  geoStatus: string;
  isLiveLocationEnabled: boolean;
  tipCents: number;
  cartCount: number;
  message: string;
  onTipChange: (tip: number) => void;
  onClearCart: () => void;
  onRefreshLocation: () => void;
  onToggleLiveLocation: () => void;
  onCheckout: () => void;
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
  deliveryAddress,
  deliveryAddressLabel,
  geoStatus,
  isLiveLocationEnabled,
  tipCents,
  cartCount,
  message,
  onTipChange,
  onClearCart,
  onRefreshLocation,
  onToggleLiveLocation,
  onCheckout,
}: CheckoutSectionProps) {
  const presetTipsEuros = useMemo(() => [0, 1, 2, 3, 4, 5], []);
  const isPresetSelected = presetTipsEuros.some((amount) => amount * 100 === tipCents);
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
    setCustomTipEuroInput((tipCents / 100).toFixed(2));
  }, [isCustomAmount, tipCents]);

  function selectPresetTip(euros: number) {
    setIsCustomAmount(false);
    onTipChange(euros * 100);
  }

  function enableCustomTip() {
    setIsCustomAmount(true);
    if (tipCents > 0 && !isPresetSelected) {
      setCustomTipEuroInput((tipCents / 100).toFixed(2));
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
    onTipChange(Math.round(parsed * 100));
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
            ? `Pourboire selectionné: ${(tipCents / 100).toFixed(2)} EUR`
            : "Aucun pourboire selectionne"}
        </div>
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          {presetTipsEuros.map((amount) => {
            const isSelected = !isCustomAmount && tipCents === amount * 100;
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

      <div className="row">
        <button className="secondary" onClick={onClearCart} disabled={cartCount === 0}>
          Vider panier
        </button>
        <button className="secondary" onClick={onRefreshLocation}>
          Actualiser position
        </button>
        <button
          className={isLiveLocationEnabled ? "" : "secondary"}
          onClick={onToggleLiveLocation}
          type="button"
        >
          {isLiveLocationEnabled
            ? "Arreter partage temps reel"
            : "Partager position en temps reel"}
        </button>
        <button onClick={onCheckout} disabled={cartCount === 0}>
          Payer (simulation)
        </button>
      </div>

      {message ? (
        <div className="card" style={{ marginTop: 12, background: "#f1f5f9" }}>
          <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{message}</div>
        </div>
      ) : null}
    </div>
  );
}