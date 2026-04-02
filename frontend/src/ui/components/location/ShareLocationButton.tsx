import { useState } from "react";

type ShareLocationButtonProps = {
  lat: number;
  lng: number;
  className?: string;
  compact?: boolean;
};

function fmtCoord(value: number): string {
  return value.toFixed(5);
}

function shareMapUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function shareText(lat: number, lng: number): string {
  return `Ma position: ${fmtCoord(lat)}, ${fmtCoord(lng)}`;
}

export function ShareLocationButton({ lat, lng, className, compact = false }: ShareLocationButtonProps) {
  const [status, setStatus] = useState<string>("");

  async function shareUserLocation() {
    const url = shareMapUrl(lat, lng);
    const text = shareText(lat, lng);

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Ma position",
          text,
          url,
        });
        setStatus("Position partagée.");
        return;
      }

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        setStatus("Lien copié. Collez-le dans WhatsApp, SMS ou Mail.");
        return;
      }

      setStatus(`Copiez ce lien: ${url}`);
    } catch {
      setStatus("Partage annulé.");
    }
  }

  async function copyLink() {
    const url = shareMapUrl(lat, lng);
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
      setStatus("Lien copié.");
      return;
    }
    setStatus(`Copiez ce lien: ${url}`);
  }

  function openChannel(targetUrl: string, channelLabel: string) {
    const popup = window.open(targetUrl, "_blank", "noopener,noreferrer");
    if (!popup) {
      setStatus(`Impossible d'ouvrir ${channelLabel}. Autorisez les popups.`);
      return;
    }
    setStatus(`Ouverture ${channelLabel}...`);
  }

  const url = shareMapUrl(lat, lng);
  const text = shareText(lat, lng);
  const encodedMessage = encodeURIComponent(`${text}\n${url}`);
  const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent("Ma position")}&body=${encodedMessage}`;
  const smsUrl = `sms:?body=${encodedMessage}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      <button className={className} onClick={shareUserLocation}>
        Partager ma position
      </button>
      {!compact ? (
        <div className="row" style={{ marginTop: 8, gap: 8 }}>
          <button className="secondary" onClick={() => openChannel(whatsappUrl, "WhatsApp")}>
            WhatsApp
          </button>
          <button className="secondary" onClick={() => openChannel(emailUrl, "Email")}>
            Email
          </button>
          <button className="secondary" onClick={() => openChannel(smsUrl, "SMS")}>
            SMS
          </button>
          <button className="secondary" onClick={copyLink}>
            Copier lien
          </button>
        </div>
      ) : null}
      {status ? (
        <div className="muted" style={{ marginTop: 12 }}>
          {status}
        </div>
      ) : null}
    </div>
  );
}