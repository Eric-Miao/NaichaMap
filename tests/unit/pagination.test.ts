import { describe, expect, it, vi } from "vitest";

import { collectAllPages } from "../../src/lib/supabase/pagination";

describe("collectAllPages", () => {
  it("continues beyond a full first page", async () => {
    const firstPage = Array.from({ length: 1_000 }, (_, index) => index);
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce([1_000]);

    await expect(collectAllPages(fetchPage, 1_000)).resolves.toHaveLength(1_001);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 999);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 1_000, 1_999);
  });
});
