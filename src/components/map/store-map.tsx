"use client";

import { useEffect, useRef } from "react";
import { Map, type StyleSpecification } from "maplibre-gl";

import type { StoreGroup } from "@/features/nearby/contracts";
import type { GeoPoint } from "@/lib/geo/coordinates";

import styles from "./map-ui.module.css";
import { MapMarkers } from "./map-markers";

const fallbackStyle: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#e2ddd2" } }],
};

export function StoreMap({
  styleUrl,
  userPoint,
  groups,
  selectedId,
  onSelectGroup,
  onSelectStore,
}: {
  styleUrl?: string;
  userPoint: GeoPoint;
  groups: StoreGroup[];
  selectedId: string | null;
  onSelectGroup: (id: string) => void;
  onSelectStore: (id: string) => void;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    const map = new Map({
      container: mapContainer.current,
      style: styleUrl || fallbackStyle,
      center: [userPoint.lng, userPoint.lat],
      zoom: 14.6,
      attributionControl: false,
      interactive: false,
    });
    return () => map.remove();
  }, [styleUrl, userPoint.lat, userPoint.lng]);

  return (
    <div className={styles.mapFrame} aria-label="附近门店地图">
      <div ref={mapContainer} className={styles.mapCanvas} />
      <MapMarkers
        userPoint={userPoint}
        groups={groups}
        selectedId={selectedId}
        onSelectGroup={onSelectGroup}
        onSelectStore={onSelectStore}
      />
    </div>
  );
}
