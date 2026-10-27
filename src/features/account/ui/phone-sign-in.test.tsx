import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_PROFILES, SESSION_KEY, parseSession } from "@/features/session/domain/session";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { ToastProvider } from "@/shared/ui/toast/toast-provider";
import { createProfile } from "../domain/profile";
import { PROFILES_KEY } from "../domain/storage";
import { PhoneSignIn } from "./phone-sign-in";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const profile = createProfile(
  {
    lastName: "Иванов",
    firstName: "Иван",
    middleName: "",
    iin: "900101300123",
    phone: "+77011234567",
    email: "",
    consent: true,
  },
  "u-1",
  new Date("2026-10-21T06:00:00Z"),
);

function renderForm() {
  return render(
    <ToastProvider>
      <PhoneSignIn labels={ru.signIn.phone} next="/ru/applications" signUpHref="/ru/sign-up" />
    </ToastProvider>,
  );
}

const typePhone = (value: string) =>
  fireEvent.change(screen.getByLabelText(/Номер мобильного телефона/), { target: { value } });
const getCode = () => fireEvent.click(screen.getByRole("button", { name: "Получить код" }));

describe("PhoneSignIn", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(PROFILES_KEY, JSON.stringify([profile]));
    push.mockClear();
  });

  it("refuses a number that is not a phone number", async () => {
    renderForm();
    typePhone("12");
    getCode();
    expect(await screen.findByText("Введите номер вида +7 701 123 45 67")).toBeVisible();
  });

  it("sends an unknown number to registration", async () => {
    renderForm();
    typePhone("+7 702 000 00 00");
    getCode();
    expect(await screen.findByText("Этот номер не зарегистрирован.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Зарегистрироваться" })).toHaveAttribute(
      "href",
      "/ru/sign-up",
    );
  });

  it("signs in with a known number and the code", async () => {
    renderForm();
    typePhone("8 (701) 123-45-67");
    getCode();

    const code = await screen.findByLabelText(/Код из SMS/);
    expect(code).toHaveFocus();
    fireEvent.change(code, { target: { value: "111111" } });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));
    expect(screen.getByText("Код не подходит. Проверьте цифры.")).toBeVisible();

    fireEvent.change(code, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));
    expect(parseSession(window.localStorage.getItem(SESSION_KEY))).toEqual({
      role: "resident",
      name: "Иванов Иван",
      userId: "u-1",
    });
    expect(push).toHaveBeenCalledWith("/ru/applications");
  });

  it("is not shown to someone who is already signed in", () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_PROFILES.resident));
    renderForm();
    expect(
      screen.queryByRole("heading", { name: "Войти по номеру телефона" }),
    ).not.toBeInTheDocument();
  });
});
