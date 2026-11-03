import { describe, expect, it } from "vitest";

import { buildUrl, emptyUrlView, parseUrl } from "../../src/features/map/url";

describe("URL view", () => {
  it("keeps the entry and search modes short", () => {
    expect(buildUrl(emptyUrlView)).toBe("");
    expect(buildUrl({ ...emptyUrlView, mode: "search" })).toBe("?mode=search");
    expect(parseUrl("?mode=search")).toMatchObject({ mode: "search", lat: null, lng: null });
  });

  it("round-trips a location, filters, selection and drawer state", () => {
    const view = {
      mode: "app" as const,
      lat: 31.2397,
      lng: 121.5005,
      place: "上海国金中心",
      filter: "coffee" as const,
      group: "mall-1",
      selected: "coffee-1",
      drawer: true,
    };
    const url = buildUrl(view);
    expect(url).toContain("lat=31.239700");
    expect(url).toContain("lng=121.500500");
    expect(url).toContain("filter=coffee");
    expect(url).toContain("group=mall-1");
    expect(url).toContain("selected=coffee-1");
    expect(url).toContain("drawer=1");
    expect(parseUrl(url)).toEqual(view);
  });

  it("drops invalid coordinates, filters and oversized text", () => {
    const parsed = parseUrl(
      "?lat=91&lng=181&place=%20%20&filter=nope&group=&selected=&drawer=0",
    );
    expect(parsed).toMatchObject({
      mode: "app",
      lat: null,
      lng: null,
      place: null,
      filter: "all",
      group: "all",
      selected: null,
      drawer: false,
    });
  });

  it("accepts street groups and safe selection ids", () => {
    expect(parseUrl("?lat=31.2&lng=121.4&group=street&selected=tea-1")).toMatchObject({
      group: "street",
      selected: "tea-1",
    });
  });
});
