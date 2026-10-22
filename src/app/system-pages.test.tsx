import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = { path: "/kk/nowhere", lang: "kk" };
vi.mock("next/navigation", () => ({
  usePathname: () => state.path,
  useParams: () => ({ lang: state.lang }),
}));

import ErrorPage from "./[lang]/error";
import NotFoundPage from "./[lang]/not-found";

beforeEach(() => {
  state.path = "/kk/nowhere";
  state.lang = "kk";
});

describe("the page that is not found", () => {
  it("speaks the language of the address and leads home", () => {
    render(<NotFoundPage />);
    expect(screen.getByText("404")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Бет табылмады" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Басты бетке" })).toHaveAttribute("href", "/kk");
  });

  it("falls back to Russian for an address without a language", () => {
    state.path = "/nowhere";
    render(<NotFoundPage />);
    expect(screen.getByRole("heading", { name: "Страница не найдена" })).toBeVisible();
    expect(screen.getByRole("link", { name: "На главную" })).toHaveAttribute("href", "/ru");
  });
});

describe("the page for an error", () => {
  const error = Object.assign(new Error("connect ECONNREFUSED 10.0.0.5:5432 password=hunter2"), {
    digest: "abc123",
  });

  it("says in plain words that something went wrong and offers to try again", () => {
    state.lang = "ru";
    const reset = vi.fn();
    render(<ErrorPage error={error} reset={reset} />);
    expect(screen.getByRole("heading", { name: "Что-то пошло не так" })).toBeVisible();
    screen.getByRole("button", { name: "Попробовать ещё раз" }).click();
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "На главную" })).toHaveAttribute("href", "/ru");
  });

  it("never shows what is inside the error: no message, no address, no secret, no digest (18.8, 19.8)", () => {
    state.lang = "kk";
    const { container } = render(<ErrorPage error={error} reset={() => {}} />);
    expect(container.textContent).not.toMatch(/ECONNREFUSED|10\.0\.0\.5|hunter2|abc123/);
  });
});
