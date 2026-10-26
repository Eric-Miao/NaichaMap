"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { useLocation } from "@/features/location/use-location";
import type { GeoPoint } from "@/lib/geo/coordinates";
import { getSearchCell } from "@/lib/geo/grid";

import { fetchNearby, MapApiError } from "./api";
import { initialMapState, mapReducer } from "./reducer";

export function useNearby() {
  const [state, dispatch] = useReducer(mapReducer, initialMapState);
  const [mapCenter, setMapCenter] = useState<GeoPoint | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async (point: GeoPoint) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setMapCenter(getSearchCell(point).center);
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

  const onLocated = useCallback((point: GeoPoint) => void load(point), [load]);
  const onDenied = useCallback(() => dispatch({ type: "LOCATION_DENIED" }), []);
  const onUnavailable = useCallback(() => dispatch({ type: "LOCATION_UNAVAILABLE" }), []);
  const { requestLocation: requestBrowserLocation } = useLocation({ onLocated, onDenied, onUnavailable });

  const requestLocation = useCallback(() => {
    dispatch({ type: "REQUEST_LOCATION" });
    requestBrowserLocation();
  }, [requestBrowserLocation]);

  const retry = useCallback(() => requestLocation(), [requestLocation]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  return { state, dispatch, requestLocation, retry, loadAt: load, mapCenter };
}
