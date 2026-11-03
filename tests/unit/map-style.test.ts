import { describe, expect, it } from "vitest";

import {
  basemapLabel,
  DEFAULT_MAP_STYLE_URL,
  FALLBACK_MAP_STYLE_URL,
  mapStyleProvider,
} from "../../src/lib/map/styles";

describe("mapStyleProvider", () => {
  it("always has an OSM primary and a different OSM fallback", () => {
    expect(DEFAULT_MAP_STYLE_URL).toContain("cartocdn.com");
    expect(FALLBACK_MAP_STYLE_URL).toContain("openfreemap.org");
    expect(DEFAULT_MAP_STYLE_URL).not.toBe(FALLBACK_MAP_STYLE_URL);
  });

  it("labels known providers and treats overrides as custom", () => {
    expect(mapStyleProvider(DEFAULT_MAP_STYLE_URL)).toBe("carto");
    expect(mapStyleProvider(FALLBACK_MAP_STYLE_URL)).toBe("openfreemap");
    expect(mapStyleProvider("https://maps.example/style.json")).toBe("custom");
    expect(basemapLabel("carto")).toBe("底图 © OpenStreetMap · CARTO");
    expect(basemapLabel("openfreemap")).toBe("底图 © OpenStreetMap");
    expect(basemapLabel("custom")).toBe("底图 © 样式提供方");
  });
});
