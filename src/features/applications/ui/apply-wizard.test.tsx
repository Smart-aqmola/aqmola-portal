import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { APPLICATIONS_KEY, DEMO_PROFILES, SESSION_KEY, parseApplications } from "../domain/storage";
import { ApplyWizard, type ApplyService } from "./apply-wizard";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const service: ApplyService = {
  slug: "gas-contract",
  title: "Договор на газ",
  organizationId: "org-1",
  audience: "resident",
  documents: ["identity"],
};
const territories = [{ id: "kokshetau", name: "Кокшетау" }];

function renderWizard(overrides: Partial<ApplyService> = {}) {
  return render(
    <ApplyWizard
      lang="ru"
      service={{ ...service, ...overrides }}
      territories={territories}
      dict={ru}
    />,
  );
}

const signInAs = (role: keyof typeof DEMO_PROFILES) =>
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_PROFILES[role]));
const next = () => fireEvent.click(screen.getByRole("button", { name: "Далее" }));

describe("ApplyWizard", () => {
  beforeEach(() => {
    window.localStorage.clear();
    push.mockClear();
  });

  it("asks to sign in first and remembers where to come back", () => {
    renderWizard();
    const link = screen.getByRole("link", { name: "Войти" });
    expect(link).toHaveAttribute(
      "href",
      "/ru/sign-in?next=%2Fru%2Fservices%2Fgas-contract%2Fapply",
    );
  });

  it("refuses a profile that does not fit the service", () => {
    signInAs("business");
    renderWizard();
    expect(screen.getByRole("heading", { name: "Эта услуга не для вашего профиля" })).toBeVisible();
  });

  it("does not leave a step with mistakes and names them", () => {
    signInAs("resident");
    renderWizard();
    next();
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Где нужна услуга" })).toBeVisible();
  });

  it("goes through all steps and saves a submitted application", () => {
    signInAs("resident");
    renderWizard();

    fireEvent.change(screen.getByLabelText("Город или район"), { target: { value: "kokshetau" } });
    fireEvent.change(screen.getByLabelText(/Адрес объекта/), {
      target: { value: "ул. Тестовая, 1" },
    });
    next();

    next();
    expect(screen.getByRole("alert")).toHaveTextContent("Приложите все документы");
    fireEvent.click(screen.getByRole("button", { name: "Приложить тестовый файл" }));
    next();

    expect(screen.getByRole("heading", { name: "Проверьте заявку" })).toBeVisible();
    next();

    fireEvent.click(screen.getByRole("button", { name: "Подписать и подать заявку" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Отметьте согласие");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Подписать и подать заявку" }));

    const saved = parseApplications(window.localStorage.getItem(APPLICATIONS_KEY));
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      status: "submitted",
      serviceSlug: "gas-contract",
      ownerRole: "resident",
    });
    expect(push).toHaveBeenCalledWith(`/ru/applications/${saved[0].number}?new=1`);
  });

  it("goes back to the previous step without losing what was typed (18.10)", () => {
    signInAs("resident");
    renderWizard();
    fireEvent.change(screen.getByLabelText("Город или район"), { target: { value: "kokshetau" } });
    fireEvent.change(screen.getByLabelText(/Адрес объекта/), {
      target: { value: "улица Абая, 10" },
    });
    next();
    expect(screen.queryByLabelText(/Адрес объекта/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Назад" }));
    expect(screen.getByLabelText("Город или район")).toHaveValue("kokshetau");
    expect(screen.getByLabelText(/Адрес объекта/)).toHaveValue("улица Абая, 10");
  });

  it("brings the typed data back after the page was built again, for example by a change of language (18.9)", () => {
    signInAs("resident");
    const first = renderWizard();
    fireEvent.change(screen.getByLabelText(/Адрес объекта/), {
      target: { value: "улица Абая, 10" },
    });
    first.unmount();
    renderWizard();
    expect(screen.getByLabelText(/Адрес объекта/)).toHaveValue("улица Абая, 10");
  });
});
