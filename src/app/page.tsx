"use client";

import { type Dispatch, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { CorrectionDialog } from "@/components/corrections/correction-dialog";
import styles from "@/components/experience.module.css";
import { PageStatus } from "@/components/feedback/page-status";
import { LocationPrompt } from "@/components/location/location-prompt";
import { PlaceSearch } from "@/components/location/place-search";
import { MapShell } from "@/components/map/map-shell";
import type { MapAction } from "@/features/map/reducer";
import { useNearby } from "@/features/map/use-nearby";
import {
  buildUrl,
  emptyUrlView,
  locationKey,
  parseUrl,
  type UrlView,
} from "@/features/map/url";
import type { NearbyResponse } from "@/features/nearby/contracts";
import type { PlaceSearchResult } from "@/features/place-search/service";
import { getPublicEnv } from "@/lib/env/public";
import { NEARBY_RADIUS_LABEL } from "@/lib/geo/search";
import { DEFAULT_MAP_STYLE_URL } from "@/lib/map/styles";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function applyUrlView(parsed: UrlView, data: NearbyResponse, dispatch: Dispatch<MapAction>) {
  const groups = data.groups;
  const group =
    parsed.group === "all" || groups.some((candidate) => candidate.id === parsed.group)
      ? parsed.group
      : "all";
  const selected =
    parsed.selected &&
    (groups.some((candidate) => candidate.id === parsed.selected) ||
      groups.some((candidate) => candidate.stores.some((store) => store.id === parsed.selected)))
      ? parsed.selected
      : null;

  dispatch({ type: "SET_PLACE_LABEL", label: parsed.place });
  dispatch({ type: "SET_FILTER", filter: parsed.filter });
  dispatch({ type: "SET_GROUP_FILTER", groupFilter: group });
  dispatch({ type: "SELECT", id: selected });
  dispatch({ type: "SET_DRAWER", open: parsed.drawer });
}

function staleLabel(cachedAt?: string | null) {
  if (!cachedAt) return "显示的是较早数据";
  return `显示的是较早数据 · 更新于 ${new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(cachedAt))}`;
}

export default function HomePage() {
  const { state, dispatch, requestLocation, retry, reset, loadAt, userPoint } = useNearby();
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const hydrated = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const restored = useRef(false);
  const pendingView = useRef<UrlView | null>(null);
  const skipSync = useRef(false);
  const lastLocation = useRef<string | null>(null);
  const lastScreen = useRef<"app" | "search">("app");
  const styleUrl = getPublicEnv().NEXT_PUBLIC_MAP_STYLE_URL ?? DEFAULT_MAP_STYLE_URL;

  useEffect(() => {
    if (!hydrated || restored.current) return;
    restored.current = true;
    const parsed = parseUrl(window.location.search);
    lastScreen.current = parsed.mode === "search" ? "search" : "app";
    if (parsed.mode === "search") {
      dispatch({ type: "SET_SCREEN", screen: "search" });
      return;
    }
    if (parsed.lat !== null && parsed.lng !== null) {
      pendingView.current = parsed;
      lastLocation.current = locationKey(parsed.lat, parsed.lng);
      dispatch({ type: "SET_PLACE_LABEL", label: parsed.place });
      void loadAt({ lng: parsed.lng, lat: parsed.lat });
    }
  }, [dispatch, hydrated, loadAt]);

  useEffect(() => {
    const parsed = pendingView.current;
    if (!parsed || !state.data) return;
    pendingView.current = null;
    skipSync.current = true;
    applyUrlView(parsed, state.data, dispatch);
  }, [dispatch, state.data]);

  useEffect(() => {
    function onPopState() {
      const parsed = parseUrl(window.location.search);
      lastScreen.current = parsed.mode === "search" ? "search" : "app";
      if (parsed.mode === "search") {
        dispatch({ type: "SET_SCREEN", screen: "search" });
        return;
      }

      dispatch({ type: "SET_SCREEN", screen: "app" });
      if (parsed.lat !== null && parsed.lng !== null) {
        const key = locationKey(parsed.lat, parsed.lng);
        const current = userPoint ? locationKey(userPoint.lat, userPoint.lng) : null;
        if (current !== key) {
          pendingView.current = parsed;
          lastLocation.current = key;
          dispatch({ type: "SET_PLACE_LABEL", label: parsed.place });
          void loadAt({ lng: parsed.lng, lat: parsed.lat });
        } else if (state.data) {
          applyUrlView(parsed, state.data, dispatch);
        }
      } else {
        pendingView.current = null;
        lastLocation.current = null;
        reset();
      }
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [dispatch, loadAt, reset, state.data, userPoint]);

  const currentLocation = userPoint ? locationKey(userPoint.lat, userPoint.lng) : null;

  useEffect(() => {
    if (!hydrated || pendingView.current) return;
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }

    const searchMode =
      state.screen === "search" || state.status === "denied" || state.status === "unavailable";
    const ready =
      state.status === "ready" ||
      state.status === "stale" ||
      state.status === "empty" ||
      state.status === "error";
    const loadingWithPoint =
      Boolean(userPoint) &&
      (state.status === "loading-cache" ||
        state.status === "refreshing" ||
        state.status === "locating");
    const permission = state.status === "permission" && !userPoint;
    if (!searchMode && !ready && !loadingWithPoint && !permission) return;

    const view: UrlView = searchMode
      ? { ...emptyUrlView, mode: "search" }
      : {
          ...emptyUrlView,
          lat: userPoint?.lat ?? null,
          lng: userPoint?.lng ?? null,
          place: state.placeLabel,
          filter: state.filter,
          group: state.groupFilter,
          selected: state.selectedId,
          drawer: state.drawerOpen,
        };

    const next = `${window.location.pathname}${buildUrl(view)}`;
    const current = `${window.location.pathname}${window.location.search}`;
    if (next === current) return;

    const shouldPush =
      (searchMode && lastScreen.current !== "search") ||
      Boolean(!searchMode && currentLocation && currentLocation !== lastLocation.current);
    lastScreen.current = searchMode ? "search" : "app";
    lastLocation.current = currentLocation;
    window.history[shouldPush ? "pushState" : "replaceState"](null, "", next);
  }, [
    currentLocation,
    hydrated,
    state.drawerOpen,
    state.filter,
    state.groupFilter,
    state.placeLabel,
    state.screen,
    state.selectedId,
    state.status,
    userPoint,
  ]);

  function choosePlace(place: PlaceSearchResult) {
    dispatch({ type: "SET_PLACE_LABEL", label: place.label });
    dispatch({ type: "SET_SCREEN", screen: "app" });
    void loadAt(place.location);
  }

  if (state.screen === "search") {
    return (
      <PlaceSearch
        onSelect={choosePlace}
        onBack={() => dispatch({ type: "SET_SCREEN", screen: "app" })}
      />
    );
  }

  if (state.status === "denied" || state.status === "unavailable") {
    return <PlaceSearch onSelect={choosePlace} onBack={requestLocation} />;
  }

  if (state.status === "permission") {
    return (
      <LocationPrompt
        state="permission"
        onLocate={requestLocation}
        onSearch={() => dispatch({ type: "SET_SCREEN", screen: "search" })}
      />
    );
  }

  if (state.status === "locating" || state.status === "loading-cache" || state.status === "refreshing") {
    return <PageStatus kind={state.status === "refreshing" ? "refreshing" : "loading"} />;
  }

  if (state.status === "error") {
    return (
      <PageStatus
        kind="error"
        message={state.error?.message}
        retryable={state.error?.retryable}
        onRetry={retry}
      />
    );
  }

  if (!state.data || !userPoint) return <PageStatus kind="loading" />;

  const storeCount = state.data.groups.reduce((total, group) => total + group.stores.length, 0);
  const subtitle = `附近 ${NEARBY_RADIUS_LABEL} · 共 ${storeCount} 家`;

  return (
    <div className={styles.page}>
      <MapShell
        title={state.placeLabel ?? "附近好喝的"}
        subtitle={subtitle}
        stale={state.status === "stale" ? staleLabel(state.data.cachedAt) : null}
        styleUrl={styleUrl}
        userPoint={userPoint}
        groups={state.data.groups}
        currentMallId={state.data.currentMall?.id ?? null}
        filter={state.filter}
        groupFilter={state.groupFilter}
        selectedId={state.selectedId}
        drawerExpanded={state.drawerOpen}
        onOpenCorrections={() => setCorrectionOpen(true)}
        onDrawerExpandedChange={(open) => dispatch({ type: "SET_DRAWER", open })}
        onFilterChange={(filter) => dispatch({ type: "SET_FILTER", filter })}
        onGroupFilterChange={(groupFilter) => dispatch({ type: "SET_GROUP_FILTER", groupFilter })}
        onSelectGroup={(id) => dispatch({ type: "SELECT", id })}
        onSelectStore={(id) => dispatch({ type: "SELECT", id })}
      />
      <CorrectionDialog open={correctionOpen} onClose={() => setCorrectionOpen(false)} />
    </div>
  );
}
