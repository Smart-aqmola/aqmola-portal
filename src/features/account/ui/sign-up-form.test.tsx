import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_KEY, parseSession } from "@/features/session/domain/session";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { ToastProvider } from "@/shared/ui/toast/toast-provider";
import { PROFILES_KEY, parseProfiles } from "../domain/storage";
import { SignUpForm } from "./sign-up-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function renderForm() {
  return render(
    <ToastProvider>
      <SignUpForm labels={ru.signUp} next="/ru/applications" signInHref="/ru/sign-in" />
    </ToastProvider>,
  );
}

type Person = { last: string; first: string; iin: string; phone: string };
const IVANOV: Person = {
  last: "Иванов",
  first: "Иван",
  iin: "900101300123",
  phone: "8 701 123 45 67",
};

function fill(person: Person) {
  fireEvent.change(screen.getByLabelText(/Фамилия/), { target: { value: person.last } });
  fireEvent.change(screen.getByLabelText(/^Имя/), { target: { value: person.first } });
  fireEvent.change(screen.getByLabelText(/^ИИН/), { target: { value: person.iin } });
  fireEvent.change(screen.getByLabelText(/Номер мобильного телефона/), {
    target: { value: person.phone },
  });
  fireEvent.click(screen.getByRole("checkbox", { name: /персональных данных/ }));
}

const getCode = () => fireEvent.click(screen.getByRole("button", { name: "Получить код" }));
const confirm = (code: string) => {
  fireEvent.change(screen.getByLabelText(/Код из SMS/), { target: { value: code } });
  fireEvent.click(screen.getByRole("button", { name: "Подтвердить и создать кабинет" }));
};

describe("SignUpForm", () => {
  beforeEach(() => {
    window.localStorage.clear();
    push.mockClear();
  });

  it("does not go on with an empty form and names every missing field", () => {
    renderForm();
    getCode();
    expect(screen.getAllByRole("alert").length).toBeGreaterThanOrEqual(5);
    expect(screen.getByLabelText(/Фамилия/)).toHaveFocus();
    expect(screen.queryByText("Подтверждение номера")).not.toBeInTheDocument();
  });

  it("says what is wrong with the IIN and the phone", () => {
    renderForm();
    fill({ ...IVANOV, iin: "123", phone: "55" });
    getCode();
    expect(screen.getByText("ИИН состоит из 12 цифр")).toBeVisible();
    expect(screen.getByText("Введите номер вида +7 701 123 45 67")).toBeVisible();
  });

  it("asks for the code, refuses a wrong one and then creates the cabinet", () => {
    renderForm();
    fill(IVANOV);
    getCode();

    expect(screen.getByRole("heading", { name: "Подтверждение номера" })).toBeVisible();
    expect(screen.getByText(/\+7 701 123 45 67/)).toBeVisible();
    expect(screen.getByLabelText(/Код из SMS/)).toHaveFocus();

    confirm("000000");
    expect(screen.getByText("Код не подходит. Проверьте цифры.")).toBeVisible();
    expect(push).not.toHaveBeenCalled();

    confirm("123 456");
    const [profile] = parseProfiles(window.localStorage.getItem(PROFILES_KEY));
    expect(profile).toMatchObject({
      lastName: "Иванов",
      firstName: "Иван",
      iin: "900101300123",
      phone: "+77011234567",
    });
    expect(parseSession(window.localStorage.getItem(SESSION_KEY))).toEqual({
      role: "resident",
      name: "Иванов Иван",
      userId: profile.id,
    });
    expect(push).toHaveBeenCalledWith("/ru/applications");
    expect(screen.getByText("Кабинет создан. Добро пожаловать, Иванов Иван!")).toBeVisible();
  });

  it("keeps what was typed when the person goes back to change the data", () => {
    renderForm();
    fill(IVANOV);
    getCode();
    fireEvent.click(screen.getByRole("button", { name: "Изменить данные" }));
    expect(screen.getByLabelText(/Фамилия/)).toHaveValue("Иванов");
    expect(screen.getByLabelText(/^ИИН/)).toHaveValue("900101300123");
  });

  it("does not register the same phone number twice", () => {
    const first = renderForm();
    fill(IVANOV);
    getCode();
    confirm("123456");
    first.unmount();
    window.localStorage.removeItem(SESSION_KEY);

    renderForm();
    fill({ last: "Петров", first: "Пётр", iin: "880202300456", phone: "+7 701 123 45 67" });
    getCode();
    expect(
      screen.getByText("Этот номер уже зарегистрирован. Войдите по номеру телефона"),
    ).toBeVisible();
    expect(screen.queryByText("Подтверждение номера")).not.toBeInTheDocument();
  });
});
