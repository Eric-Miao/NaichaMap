import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn(() => ({ kind: "admin-client" })),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("../../src/lib/env/server", () => ({
  getServerEnv: () => ({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SECRET_KEY: "sb_secret_server_only",
    AMAP_WEB_SERVICE_KEY: "amap-key",
    IP_HASH_SALT: "a-long-random-salt",
  }),
}));

import * as publicEnv from "../../src/lib/env/public";
import { createAdminClient } from "../../src/lib/supabase/server";

describe("createAdminClient", () => {
  beforeEach(() => {
    createClient.mockClear();
  });

  it("creates a non-persistent client with the server-only secret", () => {
    expect(createAdminClient()).toEqual({ kind: "admin-client" });
    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "sb_secret_server_only",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  });

  it("does not export a server secret from the public environment module", () => {
    expect(publicEnv).not.toHaveProperty("SUPABASE_SECRET_KEY");
    expect(publicEnv).not.toHaveProperty("getServerEnv");
  });
});
