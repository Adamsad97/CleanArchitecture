import { useEffect, useState } from "react";
import { resolveReadableAddress } from "../../api/geocoding-api";

type UseReadableAddressParams = Readonly<{
  lat: number;
  lng: number;
}>;

type UseReadableAddressResult = Readonly<{
  deliveryAddressLabel: string;
}>;

export function useReadableAddress({ lat, lng }: UseReadableAddressParams): UseReadableAddressResult {
  const [deliveryAddressLabel, setDeliveryAddressLabel] = useState<string>("Recherche de l'adresse...");

  useEffect(() => {
    const controller = new AbortController();

    async function refreshReadableAddressLabel() {
      setDeliveryAddressLabel("Recherche de l'adresse...");
      try {
        const shortAddress = await resolveReadableAddress({ lat, lng }, controller.signal);
        if (!shortAddress) {
          setDeliveryAddressLabel("Adresse introuvable pour cette position.");
          return;
        }

        setDeliveryAddressLabel(shortAddress);
      } catch {
        if (controller.signal.aborted) return;
        setDeliveryAddressLabel("Adresse introuvable pour cette position.");
      }
    }

    refreshReadableAddressLabel();

    return () => controller.abort();
  }, [lat, lng]);

  return { deliveryAddressLabel };
}
