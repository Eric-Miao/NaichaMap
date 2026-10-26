"use client";

import { useState } from "react";

import { CorrectionDialog } from "@/components/corrections/correction-dialog";
import styles from "@/components/experience.module.css";
import { PageStatus } from "@/components/feedback/page-status";
import { LocationPrompt } from "@/components/location/location-prompt";
import { PlaceSearch } from "@/components/location/place-search";
import { MapShell } from "@/components/map/map-shell";
import { useNearby } from "@/features/map/use-nearby";
import type { PlaceSearchResult } from "@/features/place-search/service";
import { getPublicEnv } from "@/lib/env/public";

export default function HomePage() {
  const { state, dispatch, requestLocation, retry, loadAt, mapCenter } = useNearby();
  const [manualSearch, setManualSearch] = useState(false);
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const styleUrl = getPublicEnv().NEXT_PUBLIC_MAP_STYLE_URL;

  function selectPlace(place: PlaceSearchResult) {
    setPlaceLabel(place.label);
    setManualSearch(false);
    void loadAt(place.location);
  }

  if (manualSearch) return <PlaceSearch onSelect={selectPlace} onBack={() => setManualSearch(false)} />;

  if (state.status === "denied" || state.status === "unavailable") {
    return <PlaceSearch onSelect={selectPlace} onBack={requestLocation} />;
  }

  if (state.status === "permission") {
    return <LocationPrompt state="permission" onLocate={requestLocation} onSearch={() => setManualSearch(true)} />;
  }

  if (state.status === "locating" || state.status === "loading-cache" || state.status === "refreshing") {
    return <PageStatus kind={state.status === "refreshing" ? "refreshing" : "loading"} />;
  }

  if (state.status === "error") {
    return <PageStatus kind="error" message={state.error?.message} retryable={state.error?.retryable} onRetry={retry} />;
  }

  if (state.status === "empty") {
    return (
      <div className={styles.page}>
        <PageStatus kind="empty" onCorrection={() => setCorrectionOpen(true)} />
        <CorrectionDialog open={correctionOpen} onClose={() => setCorrectionOpen(false)} />
      </div>
    );
  }

  if (!state.data || !mapCenter) return <PageStatus kind="loading" />;

  const title = state.data.currentMall?.name ?? placeLabel ?? "附近好喝的";
  const storeCount = state.data.groups.reduce((total, group) => total + group.stores.length, 0);
  const subtitle = state.data.currentMall ? `定位成功 · 商场内及附近共 ${storeCount} 家` : `附近 1 公里 · 共 ${storeCount} 家`;

  return (
    <div className={styles.page}>
      {state.status === "stale" ? (
        <div className={styles.staleBanner} role="status">
          显示的是较早数据
          {state.data.cachedAt ? ` · 更新于 ${new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short", hour12: false }).format(new Date(state.data.cachedAt))}` : ""}
        </div>
      ) : null}
      <button type="button" className={styles.feedbackButton} onClick={() => setCorrectionOpen(true)}>信息有误？</button>
      <MapShell
        title={title}
        subtitle={subtitle}
        styleUrl={styleUrl}
        userPoint={mapCenter}
        groups={state.data.groups}
        filter={state.filter}
        selectedId={state.selectedId}
        drawerExpanded={state.drawerOpen}
        onDrawerExpandedChange={(open) => dispatch({ type: "SET_DRAWER", open })}
        onFilterChange={(filter) => dispatch({ type: "SET_FILTER", filter })}
        onSelectGroup={(id) => dispatch({ type: "SELECT", id })}
        onSelectStore={(id) => dispatch({ type: "SELECT", id })}
      />
      <CorrectionDialog open={correctionOpen} onClose={() => setCorrectionOpen(false)} />
    </div>
  );
}
