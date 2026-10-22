import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { STORAGE_FAILED_EVENT } from "@/shared/lib/local-store";
import { ToastProvider } from "@/shared/ui/toast/toast-provider";
import { StorageNotice } from "./storage-notice";

describe("StorageNotice", () => {
  it("tells the person once that the browser did not save", () => {
    render(
      <ToastProvider>
        <StorageNotice text="Не сохранено" />
      </ToastProvider>,
    );
    act(() => {
      window.dispatchEvent(new Event(STORAGE_FAILED_EVENT));
      window.dispatchEvent(new Event(STORAGE_FAILED_EVENT));
    });
    expect(screen.getAllByText("Не сохранено")).toHaveLength(1);
  });
});
