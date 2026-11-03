import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CorrectionDialog } from "../../src/components/corrections/correction-dialog";

describe("CorrectionDialog", () => {
  it("closes on Escape and returns focus to the opener", async () => {
    const onClose = vi.fn();
    function Harness() {
      return (
        <>
          <button type="button">打开纠错</button>
          <CorrectionDialog open onClose={onClose} />
        </>
      );
    }
    render(<Harness />);

    expect(await screen.findByRole("dialog", { name: "补充或纠错" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭纠错" })).toHaveFocus();

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("traps Tab inside the dialog", async () => {
    render(<CorrectionDialog open onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog", { name: "补充或纠错" });
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])'),
    ).filter((element) => !element.hasAttribute("disabled"));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    last.focus();
    await userEvent.tab();
    expect(first).toHaveFocus();

    await userEvent.tab({ shift: true });
    expect(last).toHaveFocus();
  });
});
