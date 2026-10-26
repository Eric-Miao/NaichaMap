import { describe, expect, it } from "vitest";

import { extractVercelIp, hashClientIp } from "../../src/features/corrections/ip";

describe("correction IP privacy", () => {
  it("extracts only the first valid Vercel forwarded address", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.4, 10.0.0.1" });
    expect(extractVercelIp(headers, { VERCEL: "1" })).toBe("203.0.113.4");
  });

  it("rejects untrusted local headers and malformed addresses", () => {
    const valid = new Headers({ "x-forwarded-for": "203.0.113.4" });
    const invalid = new Headers({ "x-forwarded-for": "not-an-ip, 203.0.113.4" });
    expect(extractVercelIp(valid, {})).toBeNull();
    expect(extractVercelIp(invalid, { VERCEL: "1" })).toBeNull();
  });

  it("creates a deterministic, non-reversible HMAC without returning the IP", () => {
    const first = hashClientIp("203.0.113.4", "a-long-private-salt");
    const second = hashClientIp("203.0.113.4", "a-long-private-salt");
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain("203.0.113.4");
  });
});
