"use client";

import { useCallback } from "react";

import type { GeoPoint } from "@/lib/geo/coordinates";

export function useLocation({ onLocated, onDenied, onUnavailable }: {
  onLocated: (point: GeoPoint) => void;
  onDenied: () => void;
  onUnavailable: () => void;
}) {
  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      onUnavailable();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => onLocated({ lng: position.coords.longitude, lat: position.coords.latitude }),
      (error) => (error.code === error.PERMISSION_DENIED ? onDenied() : onUnavailable()),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }, [onDenied, onLocated, onUnavailable]);

  return { requestLocation };
}
