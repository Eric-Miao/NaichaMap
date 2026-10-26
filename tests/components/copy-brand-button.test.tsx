import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CopyBrandButton } from "../../src/components/stores/copy-brand-button";

describe("CopyBrandButton", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn(async () => {}) },
    });
  });

  it("copies only the canonical brand name and announces the WeChat hint", async () => {
    render(<CopyBrandButton brandName="喜茶" />);

    await userEvent.click(screen.getByRole("button", { name: "复制喜茶品牌名" }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("喜茶");
    expect(screen.getByRole("status")).toHaveTextContent("已复制，可前往微信搜索");
  });
});
