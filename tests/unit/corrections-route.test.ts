import { describe, expect, it, vi } from "vitest";

import { createCorrectionService } from "../../src/features/corrections/service";
import { handleCorrection } from "../../src/app/api/corrections/route";

const validBody = {
  storeId: "6c26f0ad-89d7-442a-8e75-36665918f4b8",
  issueType: "incorrect_info",
  details: "店名应该更新",
} as const;

function request(body: unknown) {
  return new Request("http://localhost/api/corrections", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.4" },
    body: JSON.stringify(body),
  });
}

describe("correction service", () => {
  it("passes only the IP hash to the atomic RPC and treats details as text", async () => {
    const rpc = vi.fn(async () => ({ accepted: true, retryAfterSeconds: 0, correctionId: "correction-1" }));
    const submit = createCorrectionService(rpc);

    await submit({
      ...validBody,
      details: "<script>alert('text only')</script>",
      ip: "203.0.113.4",
      salt: "a-long-private-salt",
    });

    expect(rpc).toHaveBeenCalledWith(
      expect.objectContaining({
        details: "<script>alert('text only')</script>",
        ipHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(JSON.stringify(rpc.mock.calls)).not.toContain("203.0.113.4");
  });
});

describe("POST /api/corrections", () => {
  it.each([
    [{ ...validBody, issueType: "unsupported" }],
    [{ ...validBody, details: "x".repeat(501) }],
    [{ ...validBody, details: "" }],
  ])("rejects invalid correction fields", async (body) => {
    const response = await handleCorrection(request(body), {
      resolveIp: () => "203.0.113.4",
      submit: vi.fn(),
      salt: "a-long-private-salt",
    });
    expect(response.status).toBe(400);
  });

  it("rejects a request without a trustworthy platform IP", async () => {
    const response = await handleCorrection(request(validBody), {
      resolveIp: () => null,
      submit: vi.fn(),
      salt: "a-long-private-salt",
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "UNTRUSTED_CLIENT" } });
  });

  it("returns success for an accepted correction", async () => {
    const response = await handleCorrection(request(validBody), {
      resolveIp: () => "203.0.113.4",
      submit: vi.fn(async () => ({ accepted: true, retryAfterSeconds: 0, correctionId: "id-1" })),
      salt: "a-long-private-salt",
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("returns 429 and remaining wait time for a repeated correction", async () => {
    const response = await handleCorrection(request(validBody), {
      resolveIp: () => "203.0.113.4",
      submit: vi.fn(async () => ({ accepted: false, retryAfterSeconds: 287, correctionId: null })),
      salt: "a-long-private-salt",
    });
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({
      error: { code: "RATE_LIMITED", retryable: true },
      retryAfterSeconds: 287,
    });
  });
});
