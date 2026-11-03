"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map, setWorkerUrl } from "maplibre-gl";
import { LocateFixed } from "lucide-react";

import { mapAnchors } from "@/features/map/map-anchors";
import type { StoreGroup } from "@/features/nearby/contracts";
import type { DirectoryView } from "@/features/map/selectors";
import type { GeoPoint } from "@/lib/geo/coordinates";
import { fitMapView, scaleBar, type MapView, type ViewportSize } from "@/lib/geo/viewport";
import {
  basemapLabel,
  FALLBACK_MAP_STYLE_URL,
  mapStyleProvider,
} from "@/lib/map/styles";

import styles from "./map-ui.module.css";
import { MapMarkers } from "./map-markers";

const FALLBACK_SIZE: ViewportSize = { width: 360, height: 320 };
const STYLE_TIMEOUT_MS = 9_000;

// Next bundles maplibre's inline worker chunk in a way the browser cannot load
// in dev; serving the self-contained worker from /public keeps vector tiles working.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export function StoreMap({
  styleUrl,
  fallbackStyleUrl = FALLBACK_MAP_STYLE_URL,
  userPoint,
  groups,
  view,
  selectedId,
  onSelectGroup,
  onSelectStore,
}: {
  styleUrl?: string;
  fallbackStyleUrl?: string;
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
  const fellBack = useRef(false);
  const [size, setSize] = useState<ViewportSize>(FALLBACK_SIZE);
  const [activeStyle, setActiveStyle] = useState<string | undefined>(styleUrl);
  const [mapFailed, setMapFailed] = useState(false);
  const [liveView, setLiveView] = useState<MapView | null>(null);

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
  const points = useMemo(
    () => [userPoint, ...anchors.map((anchor) => anchor.point)],
    [anchors, userPoint],
  );
  const fitView = useMemo(
    () => fitMapView(points, size, { padding: 30, minZoom: 13.5, maxZoom: 16.8 }),
    [points, size],
  );

  useEffect(() => {
    if (!activeStyle || !canvasRef.current) return;

    const map = new Map({
      container: canvasRef.current,
      style: activeStyle,
      center: [userPoint.lng, userPoint.lat],
      zoom: 15,
      minZoom: 12,
      maxZoom: 18,
      attributionControl: false,
      interactive: true,
      dragRotate: false,
      pitchWithRotate: false,
      renderWorldCopies: false,
      cooperativeGestures: false,
    });
    mapRef.current = map;

    // Keep pan and pinch zoom, but never rotate or pitch: the DOM markers use a
    // flat Web Mercator projection.
    map.touchZoomRotate?.disableRotation?.();
    map.dragRotate?.disable?.();
    map.touchPitch?.disable?.();
    map.keyboard?.disableRotation?.();

    let settled = false;
    let frame = 0;
    const syncView = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (typeof map.getCenter !== "function" || typeof map.getZoom !== "function") return;
        const center = map.getCenter();
        setLiveView({ center: { lng: center.lng, lat: center.lat }, zoom: map.getZoom() });
      });
    };
    const fallbackToNextStyle = () => {
      if (settled) return;
      settled = true;
      if (!fellBack.current && fallbackStyleUrl && fallbackStyleUrl !== activeStyle) {
        fellBack.current = true;
        setActiveStyle(fallbackStyleUrl);
        return;
      }
      setMapFailed(true);
    };

    const timer = setTimeout(fallbackToNextStyle, STYLE_TIMEOUT_MS);
    if (typeof map.on === "function") {
      map.on("load", () => {
        settled = true;
        clearTimeout(timer);
        setMapFailed(false);
        syncView();
      });
      map.on("error", () => {
        const loaded =
          typeof map.isStyleLoaded === "function" ? map.isStyleLoaded() : false;
        if (!loaded) fallbackToNextStyle();
      });
      map.on("move", syncView);
      map.on("zoom", syncView);
      map.on("moveend", syncView);
    }

    return () => {
      settled = true;
      clearTimeout(timer);
      if (frame) cancelAnimationFrame(frame);
      map.remove();
      mapRef.current = null;
    };
    // The map is created once per style; position changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStyle, fallbackStyleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (typeof map.resize === "function") map.resize();
  }, [size]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fitView) return;
    if (typeof map.jumpTo === "function") {
      map.jumpTo({ center: [fitView.center.lng, fitView.center.lat], zoom: fitView.zoom });
    }
  }, [activeStyle, fitView]);

  function resetMap() {
    if (!fitView) return;
    const map = mapRef.current;
    if (map && typeof map.easeTo === "function") {
      map.easeTo({
        center: [fitView.center.lng, fitView.center.lat],
        zoom: fitView.zoom,
        duration: 450,
      });
    } else {
      setLiveView(fitView);
    }
  }

  const displayView = liveView ?? fitView;
  const scale = displayView ? scaleBar(displayView) : null;
  const mapReady = Boolean(activeStyle) && !mapFailed;
  const note = mapReady
    ? basemapLabel(mapStyleProvider(activeStyle!))
    : "示意视图 · 门店按真实坐标缩放";
  const moved =
    Boolean(liveView && fitView) &&
    (Math.abs(liveView!.center.lat - fitView!.center.lat) > 0.00005 ||
      Math.abs(liveView!.center.lng - fitView!.center.lng) > 0.00005 ||
      Math.abs(liveView!.zoom - fitView!.zoom) > 0.05);

  return (
    <div
      className={styles.mapFrame}
      ref={frameRef}
      data-has-map={mapReady ? "true" : "false"}
    >
      <div ref={canvasRef} className={styles.mapCanvas} aria-hidden="true" />
      <div className={styles.mapVeil} aria-hidden="true" />
      <span className={styles.mapNote} aria-hidden="true">{note}</span>
      {scale ? (
        <span className={styles.mapScale} aria-hidden="true">
          <span className={styles.scaleBar} style={{ width: `${scale.width}px` }} />
          <span>{scale.label}</span>
        </span>
      ) : null}
      <div className={styles.mapCorners} aria-hidden="true" />
      {mapReady && moved ? (
        <button
          type="button"
          className={styles.mapReset}
          onClick={resetMap}
          aria-label="回到门店范围"
          title="回到门店范围"
        >
          <LocateFixed aria-hidden="true" size={16} strokeWidth={1.8} />
        </button>
      ) : null}
      <MapMarkers
        userPoint={userPoint}
        groups={groups}
        view={view}
        projection={displayView}
        size={size}
        selectedId={selectedId}
        onSelectGroup={onSelectGroup}
        onSelectStore={onSelectStore}
      />
    </div>
  );
}
