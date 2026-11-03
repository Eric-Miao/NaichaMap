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

function staleLabel(cachedAt?: string | null) {
  if (!cachedAt) return "显示的是较早数据";
  return `显示的是较早数据 · 更新于 ${new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(cachedAt))}`;
}

export default function HomePage() {
  const { state, dispatch, requestLocation, retry, loadAt, userPoint } = useNearby();
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
  const subtitle = `附近 1 公里 · 共 ${storeCount} 家`;

  return (
    <div className={styles.page}>
      <MapShell
        title={placeLabel ?? "附近好喝的"}
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
