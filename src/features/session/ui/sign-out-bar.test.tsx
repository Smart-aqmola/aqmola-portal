import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_PROFILES, SESSION_KEY } from "../domain/session";
import { SignOutBar } from "./sign-out-bar";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const labels = { signedAs: "Вы вошли как {name}", signOut: "Выйти" };

beforeEach(() => {
  window.localStorage.clear();
  push.mockClear();
});

describe("SignOutBar", () => {
  it("says who is signed in and signs out to the home page", () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_PROFILES.resident));
    render(<SignOutBar lang="ru" labels={labels} />);
    expect(screen.getByText(`Вы вошли как ${DEMO_PROFILES.resident.name}`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Выйти" }));
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(push).toHaveBeenCalledWith("/ru");
  });

  it("shows nothing to a guest", () => {
    const { container } = render(<SignOutBar lang="ru" labels={labels} />);
    expect(container).toBeEmptyDOMElement();
  });
});
