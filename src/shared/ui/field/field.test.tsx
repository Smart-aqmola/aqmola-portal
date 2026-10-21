import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CheckField, Field } from "./field";

describe("Field", () => {
  it("gives the control a name, a hint and no error by default", () => {
    render(
      <Field label="Фамилия" hint="Как в документе">
        {(control) => <input {...control} />}
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Фамилия" });
    expect(input).toHaveAccessibleDescription("Как в документе");
    expect(input).not.toBeInvalid();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("marks the control invalid and announces the error", () => {
    render(
      <Field label="ИИН" hint="12 цифр" error="Проверьте запись">
        {(control) => <input {...control} />}
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "ИИН" });
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription("12 цифр Проверьте запись");
    expect(screen.getByRole("alert")).toHaveTextContent("Проверьте запись");
  });

  it("marks a required field for assistive technology", () => {
    render(
      <Field label="Телефон" required>
        {(control) => <input {...control} />}
      </Field>,
    );
    expect(screen.getByRole("textbox", { name: /Телефон/ })).toBeRequired();
  });
});

describe("CheckField", () => {
  it("reports the new state when the line is clicked", () => {
    const onChange = vi.fn();
    render(<CheckField label="Согласен" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Согласен" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("shows its error next to the checkbox", () => {
    render(
      <CheckField label="Согласен" checked={false} onChange={() => {}} error="Нужно согласие" />,
    );
    expect(screen.getByRole("checkbox")).toBeInvalid();
    expect(screen.getByRole("alert")).toHaveTextContent("Нужно согласие");
  });
});
