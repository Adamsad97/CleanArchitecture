import { useCallback, useEffect, useRef, useState } from "react";

export type LiveGeoPoint = Readonly<{
  lat: number;
  lng: number;
}>;

type UseLiveLocationParams = Readonly<{
  onLocationChanged: (nextLocation: LiveGeoPoint) => void;
}>;

type UseLiveLocationResult = Readonly<{
  geoStatus: string;
  isLiveLocationEnabled: boolean;
  requestUserLocation: () => void;
  toggleLiveLocationTracking: () => void;
  stopLiveLocationTracking: () => void;
}>;

export function useLiveLocation({ onLocationChanged }: UseLiveLocationParams): UseLiveLocationResult {
  const [geoStatus, setGeoStatus] = useState<string>("Utilisation de la position par défaut.");
  const [isLiveLocationEnabled, setIsLiveLocationEnabled] = useState<boolean>(false);
  const liveLocationWatchIdRef = useRef<number | null>(null);

  const requestUserLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGeoStatus("Géolocalisation non supportée par ce navigateur.");
      return;
    }

    setGeoStatus("Récupération de votre position en cours...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocationChanged({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGeoStatus("Position détectée.");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeoStatus("Permission refusée. Position par défaut utilisée.");
          return;
        }
        if (error.code === error.TIMEOUT) {
          setGeoStatus("Délai dépassé. Position par défaut utilisée.");
          return;
        }
        setGeoStatus("Position indisponible. Position par défaut utilisée.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [onLocationChanged]);

  const stopLiveLocationTracking = useCallback(() => {
    if (liveLocationWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(liveLocationWatchIdRef.current);
      liveLocationWatchIdRef.current = null;
    }
    setIsLiveLocationEnabled(false);
    setGeoStatus("Position non partagée.");
  }, []);

  const startLiveLocationTracking = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGeoStatus("Geolocalisation non supportee par ce navigateur.");
      return;
    }

    if (liveLocationWatchIdRef.current !== null) {
      setIsLiveLocationEnabled(true);
      setGeoStatus("Position partagée.");
      return;
    }

    setGeoStatus("Activation du partage de position en temps reel...");
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        onLocationChanged({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLiveLocationEnabled(true);
        setGeoStatus("Position partagée.");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeoStatus("Permission refusée. Position non partagée.");
        } else {
          setGeoStatus("Position non partagée.");
        }
        if (liveLocationWatchIdRef.current !== null) {
          navigator.geolocation.clearWatch(liveLocationWatchIdRef.current);
          liveLocationWatchIdRef.current = null;
        }
        setIsLiveLocationEnabled(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    liveLocationWatchIdRef.current = watchId;
  }, [onLocationChanged]);

  const toggleLiveLocationTracking = useCallback(() => {
    if (isLiveLocationEnabled) {
      stopLiveLocationTracking();
      return;
    }
    startLiveLocationTracking();
  }, [isLiveLocationEnabled, startLiveLocationTracking, stopLiveLocationTracking]);

  useEffect(() => {
    return () => {
      if (liveLocationWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(liveLocationWatchIdRef.current);
      }
    };
  }, []);

  return {
    geoStatus,
    isLiveLocationEnabled,
    requestUserLocation,
    toggleLiveLocationTracking,
    stopLiveLocationTracking,
  };
}
