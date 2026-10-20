import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("renders a real button that does not submit forms by default", () => {
    render(<Button>Найти</Button>);
    const button = screen.getByRole("button", { name: "Найти" });
    expect(button).toHaveAttribute("type", "button");
  });

  it("calls onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Заказать услугу</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Заказать услугу" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders a link when href is given", () => {
    render(<Button href="/ru/services">Каталог</Button>);
    const link = screen.getByRole("link", { name: "Каталог" });
    expect(link).toHaveAttribute("href", "/ru/services");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("exposes the variant and size for styling", () => {
    render(
      <Button variant="ghost" size="lg">
        Войти
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Войти" });
    expect(button).toHaveAttribute("data-variant", "ghost");
    expect(button).toHaveAttribute("data-size", "lg");
  });

  it("uses the primary medium style by default", () => {
    render(<Button>Ок</Button>);
    const button = screen.getByRole("button", { name: "Ок" });
    expect(button).toHaveAttribute("data-variant", "primary");
    expect(button).toHaveAttribute("data-size", "md");
  });

  it("can be disabled", () => {
    render(<Button disabled>Отправить</Button>);
    expect(screen.getByRole("button", { name: "Отправить" })).toBeDisabled();
  });
});
