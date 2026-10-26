"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

import type { GeoPoint } from "@/lib/geo/coordinates";

import { fetchNearby, MapApiError } from "./api";
import { initialMapState, mapReducer } from "./reducer";

export function useNearby() {
  const [state, dispatch] = useReducer(mapReducer, initialMapState);
  const controllerRef = useRef<AbortController | null>(null);
  const lastPointRef = useRef<GeoPoint | null>(null);

  const load = useCallback(async (point: GeoPoint) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    lastPointRef.current = point;
    dispatch({ type: "LOAD_START" });

    try {
      const data = await fetchNearby(point, controller.signal);
      dispatch({ type: "LOAD_SUCCESS", payload: data });
    } catch (error) {
      if (controller.signal.aborted) return;
      const apiError = error instanceof MapApiError ? error : new MapApiError("REQUEST_FAILED", "暂时无法加载", true);
      dispatch({
        type: "LOAD_ERROR",
        error: { code: apiError.code as "INTERNAL_ERROR", message: apiError.message, retryable: apiError.retryable },
      });
    }
  }, []);

  const requestLocation = useCallback(() => {
    dispatch({ type: "REQUEST_LOCATION" });
    if (!("geolocation" in navigator)) {
      dispatch({ type: "LOCATION_UNAVAILABLE" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => void load({ lng: position.coords.longitude, lat: position.coords.latitude }),
      (error) =>
        dispatch({ type: error.code === error.PERMISSION_DENIED ? "LOCATION_DENIED" : "LOCATION_UNAVAILABLE" }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }, [load]);

  const retry = useCallback(() => {
    if (lastPointRef.current) void load(lastPointRef.current);
    else requestLocation();
  }, [load, requestLocation]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  return { state, dispatch, requestLocation, retry };
}
