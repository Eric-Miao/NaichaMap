"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map, setWorkerUrl } from "maplibre-gl";

import { mapAnchors } from "@/features/map/map-anchors";
import type { StoreGroup } from "@/features/nearby/contracts";
import type { DirectoryView } from "@/features/map/selectors";
import type { GeoPoint } from "@/lib/geo/coordinates";
import { fitMapView, type ViewportSize } from "@/lib/geo/viewport";

import styles from "./map-ui.module.css";
import { MapMarkers } from "./map-markers";

const FALLBACK_SIZE: ViewportSize = { width: 360, height: 320 };

// Next bundles maplibre's inline worker chunk in a way the browser cannot load
// in dev; serving the self-contained worker from /public keeps vector tiles working.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export function StoreMap({
  styleUrl,
  userPoint,
  groups,
  view,
  selectedId,
  onSelectGroup,
  onSelectStore,
}: {
  styleUrl?: string;
  userPoint: GeoPoint;
  groups: StoreGroup[];
  view: DirectoryView;
  selectedId: string | null;
  onSelectGroup: (id: string) => void;
  onSelectStore: (id: string) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [size, setSize] = useState<ViewportSize>(FALLBACK_SIZE);
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const measure = () => {
      const rect = frame.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({ width: rect.width, height: rect.height });
      }
    };
    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const anchors = useMemo(() => mapAnchors(groups), [groups]);
  const points = useMemo(() => [userPoint, ...anchors.map((anchor) => anchor.point)], [anchors, userPoint]);
  const projection = useMemo(
    () => fitMapView(points, size, { padding: 30, minZoom: 13.5, maxZoom: 16.8 }),
    [points, size],
  );

  useEffect(() => {
    if (!styleUrl || !canvasRef.current) return;
    const map = new Map({
      container: canvasRef.current,
      style: styleUrl,
      center: [userPoint.lng, userPoint.lat],
      zoom: 15,
      attributionControl: false,
      interactive: false,
    });
    mapRef.current = map;
    if (typeof map.on === "function") {
      map.on("error", (event) => {
        console.error("map_error", event.error?.message ?? event);
        setMapFailed(true);
      });
      map.on("load", () => {
        setMapFailed(false);
      });
    }
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // The map is created once per style; position changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !projection) return;
    if (typeof map.resize === "function") map.resize();
    if (typeof map.jumpTo === "function") {
      map.jumpTo({ center: [projection.center.lng, projection.center.lat], zoom: projection.zoom });
    }
  }, [projection, size]);

  return (
    <div
      className={styles.mapFrame}
      ref={frameRef}
      data-has-map={styleUrl && !mapFailed ? "true" : "false"}
    >
      <div ref={canvasRef} className={styles.mapCanvas} aria-hidden="true" />
      <div className={styles.mapVeil} aria-hidden="true" />
      <span className={styles.mapNote} aria-hidden="true">
        {styleUrl && !mapFailed ? "数据 © 高德地图" : "示意视图 · 门店按真实坐标缩放"}
      </span>
      <span className={styles.mapScale} aria-hidden="true">
        1 KM
      </span>
      <div className={styles.mapCorners} aria-hidden="true" />
      <MapMarkers
        userPoint={userPoint}
        groups={groups}
        view={view}
        projection={projection}
        size={size}
        selectedId={selectedId}
        onSelectGroup={onSelectGroup}
        onSelectStore={onSelectStore}
      />
    </div>
  );
}
