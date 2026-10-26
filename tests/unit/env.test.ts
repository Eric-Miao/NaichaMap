import { afterEach, describe, expect, it, vi } from "vitest";

import { getPublicEnv } from "../../src/lib/env/public";
import { getServerEnv } from "../../src/lib/env/server";

const validServerEnv = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SECRET_KEY: "sb_secret_example",
  AMAP_WEB_SERVICE_KEY: "amap-example",
  IP_HASH_SALT: "a-long-random-salt",
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getServerEnv", () => {
  it.each(Object.keys(validServerEnv))("rejects a missing %s", (missingKey) => {
    for (const [key, value] of Object.entries(validServerEnv)) {
      vi.stubEnv(key, key === missingKey ? "" : value);
    }

    expect(() => getServerEnv()).toThrow(missingKey);
  });
});

describe("getPublicEnv", () => {
  it("allows an omitted map style without exposing server secrets", () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "must-not-leak");
    vi.stubEnv("NEXT_PUBLIC_MAP_STYLE_URL", "");

    expect(getPublicEnv()).toEqual({ NEXT_PUBLIC_MAP_STYLE_URL: undefined });
    expect(getPublicEnv()).not.toHaveProperty("SUPABASE_SECRET_KEY");
  });

  it("returns the configured public map style", () => {
    vi.stubEnv("NEXT_PUBLIC_MAP_STYLE_URL", "https://maps.example/style.json");

    expect(getPublicEnv()).toEqual({
      NEXT_PUBLIC_MAP_STYLE_URL: "https://maps.example/style.json",
    });
  });
});
