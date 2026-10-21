import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./toast-provider";

function Trigger({ message }: { message: string }) {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast.show(message)}>
      go
    </button>
  );
}

describe("ToastProvider", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("keeps an empty status region ready for announcements", () => {
    render(
      <ToastProvider>
        <Trigger message="Готово" />
      </ToastProvider>,
    );
    expect(screen.getByRole("log")).toBeEmptyDOMElement();
  });

  it("shows a message in the status region", () => {
    render(
      <ToastProvider>
        <Trigger message="Добавлено в избранное" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "go" }));
    expect(screen.getByRole("log")).toHaveTextContent("Добавлено в избранное");
  });

  it("removes the message after a few seconds", () => {
    render(
      <ToastProvider>
        <Trigger message="Добавлено в избранное" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "go" }));
    act(() => {
      vi.advanceTimersByTime(3999);
    });
    expect(screen.getByRole("log")).toHaveTextContent("Добавлено в избранное");
    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(screen.getByRole("log")).toBeEmptyDOMElement();
  });

  it("shows at most three messages and drops the oldest", () => {
    function Many() {
      const toast = useToast();
      return (
        <button
          type="button"
          onClick={() => ["один", "два", "три", "четыре"].forEach((text) => toast.show(text))}
        >
          many
        </button>
      );
    }
    render(
      <ToastProvider>
        <Many />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "many" }));
    const status = screen.getByRole("log");
    expect(status).not.toHaveTextContent("один");
    expect(status).toHaveTextContent("два");
    expect(status).toHaveTextContent("четыре");
  });

  it("does nothing, and does not fail, without a provider", () => {
    render(<Trigger message="Готово" />);
    expect(() => fireEvent.click(screen.getByRole("button", { name: "go" }))).not.toThrow();
  });
});
