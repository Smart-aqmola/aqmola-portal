import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { FEEDBACK_KEY } from "../domain/feedback";
import { FeedbackForm } from "./feedback-form";

const labels = ru.contactsPage.form;

describe("FeedbackForm", () => {
  beforeEach(() => window.localStorage.clear());

  it("names what is missing and moves the focus to the first wrong field", () => {
    render(<FeedbackForm labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));
    expect(screen.getAllByText("Заполните это поле")).toHaveLength(3);
    expect(screen.getByText("Нужно согласие, чтобы отправить")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Имя/)).toHaveFocus();
    expect(window.localStorage.getItem(FEEDBACK_KEY)).toBeNull();
  });

  it("sends a filled form, shows its number and keeps the message", () => {
    render(<FeedbackForm labels={labels} />);
    fireEvent.change(screen.getByLabelText(/^Имя/), { target: { value: "Айгерим" } });
    fireEvent.change(screen.getByLabelText(/^Номер телефона/), {
      target: { value: "+7 705 555 12 34" },
    });
    fireEvent.change(screen.getByLabelText(/^Ваш комментарий/), {
      target: { value: "Когда начнут принимать показания онлайн?" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /персональных данных/ }));
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));

    expect(screen.getByRole("heading", { name: "Сообщение отправлено" })).toHaveFocus();
    expect(screen.getByText(/DEMO-FB-\d{4}-00001/)).toBeInTheDocument();
    const stored = JSON.parse(window.localStorage.getItem(FEEDBACK_KEY) ?? "[]");
    expect(stored[0]).toMatchObject({ name: "Айгерим", phone: "+77055551234" });

    fireEvent.click(screen.getByRole("button", { name: "Написать ещё" }));
    expect(screen.getByLabelText(/^Имя/)).toHaveValue("");
  });
});
