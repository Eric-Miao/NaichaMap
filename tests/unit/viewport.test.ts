import { describe, expect, it } from "vitest";

import { fitMapView, metresPerPixel, projectPoint } from "../../src/lib/geo/viewport";

const size = { width: 390, height: 420 };

describe("fitMapView", () => {
  it("returns null until the viewport is measured", () => {
    expect(fitMapView([{ lng: 121.5, lat: 31.24 }], { width: 0, height: 0 })).toBeNull();
    expect(fitMapView([], size)).toBeNull();
  });

  it("centres a single point and clamps to max zoom", () => {
    const point = { lng: 121.5, lat: 31.24 };
    const view = fitMapView([point], size, { padding: 20, maxZoom: 17, minZoom: 13 });
    expect(view?.center.lng).toBeCloseTo(point.lng, 6);
    expect(view?.center.lat).toBeCloseTo(point.lat, 6);
    expect(view?.zoom).toBe(17);
  });

  it("keeps every point inside the padded viewport", () => {
    const points = [
      { lng: 121.49, lat: 31.23 },
      { lng: 121.51, lat: 31.24 },
      { lng: 121.5, lat: 31.25 },
    ];
    const view = fitMapView(points, size, { padding: 30 });
    expect(view).not.toBeNull();
    for (const point of points) {
      const screen = projectPoint(point, view!, size);
      expect(screen.x).toBeGreaterThanOrEqual(28);
      expect(screen.x).toBeLessThanOrEqual(size.width - 28);
      expect(screen.y).toBeGreaterThanOrEqual(28);
      expect(screen.y).toBeLessThanOrEqual(size.height - 28);
    }
  });

  it("projects east to the right and north upward", () => {
    const centre = { lng: 121.5, lat: 31.24 };
    const view = fitMapView([centre], size, { maxZoom: 15 });
    const here = projectPoint(centre, view!, size);
    const east = projectPoint({ lng: 121.51, lat: 31.24 }, view!, size);
    const north = projectPoint({ lng: 121.5, lat: 31.25 }, view!, size);

    expect(east.x).toBeGreaterThan(here.x);
    expect(east.y).toBeCloseTo(here.y, 5);
    expect(north.y).toBeLessThan(here.y);
    expect(north.x).toBeCloseTo(here.x, 5);
  });

  it("uses the 512px tile scale MapLibre projects with", () => {
    expect(metresPerPixel(31.24, 15)).toBeCloseTo(2.0, 0);
    expect(metresPerPixel(31.24, 16)).toBeCloseTo(1.0, 0);
  });
});
