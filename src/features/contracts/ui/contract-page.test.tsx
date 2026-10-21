import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_PROFILES, SESSION_KEY } from "@/features/applications/domain/storage";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { ToastProvider } from "@/shared/ui/toast/toast-provider";
import { createDraft } from "../domain/contract";
import { CONTRACTS_KEY, parseContracts } from "../domain/storage";
import { ContractPage } from "./contract-detail";

const download = vi.fn();
vi.mock("@/shared/lib/download-text", () => ({
  downloadText: (name: string, text: string) => download(name, text),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

function seedDraft() {
  const draft = createDraft(
    {
      propertyId: "p-1",
      sector: "water",
      serviceSlug: "water-contract-resident",
      serviceTitle: "Заключение договора на водоснабжение и водоотведение",
      providerId: "akmola-water",
      providerName: "Водоканал Акмолы",
      applicant: {
        lastName: "Демо",
        firstName: "Житель",
        middleName: "",
        iin: "",
        phone: "",
        email: "",
      },
      address: "Кокшетау, улица Абая, 10",
      propertyType: "house",
      basis: "owner",
      personalAccount: "",
    },
    "c-1",
    "demo-resident",
    new Date("2026-10-21T06:00:00Z"),
  );
  window.localStorage.setItem(CONTRACTS_KEY, JSON.stringify([draft]));
}

const stored = () => parseContracts(window.localStorage.getItem(CONTRACTS_KEY))[0];

function renderPage(id = "c-1") {
  return render(
    <ToastProvider>
      <ContractPage lang="ru" id={id} dict={ru} />
    </ToastProvider>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const type = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const attach = (label: RegExp, name: string) =>
  fireEvent.change(screen.getByLabelText(label), {
    target: { files: [new File([new Uint8Array(500)], name, { type: "application/pdf" })] },
  });

/** Walks an application from the first step to the page of the sent application. */
function fillAndSend() {
  type(/^ИИН/, "900101300123");
  type(/^Номер мобильного телефона/, "8 701 123 45 67");
  click("Далее");
  attach(/Документ, удостоверяющий личность/, "id.pdf");
  attach(/Документ на объект/, "deed.pdf");
  click("Далее");
  click("Далее");
  fireEvent.click(screen.getByRole("checkbox", { name: /персональных данных/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: /С условиями договора/ }));
  click("Подписать заявление (демо ЭЦП)");
  click("Отправить поставщику");
}

describe("ContractPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_PROFILES.resident));
    seedDraft();
    download.mockClear();
  });

  describe("the application step", () => {
    it("opens a draft in the wizard with the data the object and the profile gave", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { name: "Заявление на заключение договора" }),
      ).toBeVisible();
      expect(screen.getByLabelText(/^Фамилия/)).toHaveValue("Демо");
      expect(screen.getByLabelText(/^Адрес объекта/)).toHaveValue("Кокшетау, улица Абая, 10");
      expect(screen.getByLabelText(/^Основание пользования/)).toHaveValue("Собственник");
    });

    it("does not go on with a missing IIN or phone, names them and focuses the first", () => {
      renderPage();
      click("Далее");
      expect(screen.getAllByText("Заполните это поле", { selector: "p" })).toHaveLength(2);
      expect(screen.getByLabelText(/^ИИН/)).toHaveFocus();
      expect(
        screen.getByRole("heading", { name: "Заявление на заключение договора" }),
      ).toBeVisible();
    });

    it("saves every change at once, so the person can leave and come back", () => {
      renderPage();
      type(/^ИИН/, "900101300123");
      type(/^Сведения о предыдущем договоре/, "договор 7");
      expect(stored().applicant.iin).toBe("900101300123");
      expect(stored().previousContract).toBe("договор 7");
      expect(stored().status).toBe("draft");
    });

    it("asks for the meter number only when there is a meter and for an email when notices go by mail", () => {
      renderPage();
      expect(screen.queryByLabelText(/^Заводской номер прибора/)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("checkbox", { name: "На объекте есть прибор учёта" }));
      expect(screen.getByLabelText(/^Заводской номер прибора/)).toBeRequired();

      type(/^ИИН/, "900101300123");
      type(/^Номер мобильного телефона/, "+7 701 123 45 67");
      fireEvent.change(screen.getByLabelText(/^Способ получения уведомлений/), {
        target: { value: "email" },
      });
      click("Далее");
      expect(screen.getByText("Для уведомлений по почте укажите адрес")).toBeVisible();
      expect(screen.getByText("Заполните это поле", { selector: "p" })).toBeVisible();
    });
  });

  describe("the documents step", () => {
    function toDocuments() {
      renderPage();
      type(/^ИИН/, "900101300123");
      type(/^Номер мобильного телефона/, "+7 701 123 45 67");
      click("Далее");
    }

    it("lists the documents an owner must attach and nothing more", () => {
      toDocuments();
      expect(screen.getByLabelText(/Документ, удостоверяющий личность/)).toBeRequired();
      expect(screen.getByLabelText(/Документ на объект/)).toBeRequired();
      expect(screen.queryByLabelText(/Договор аренды/)).not.toBeInTheDocument();
    });

    it("does not go on without them and says which one is missing", () => {
      toDocuments();
      click("Далее");
      expect(screen.getByText("Приложите: Документ, удостоверяющий личность")).toBeVisible();
      expect(screen.getByText("Приложите: Документ на объект: выписка или договор")).toBeVisible();
      expect(screen.getByRole("heading", { name: "Документы" })).toBeVisible();
    });

    it("refuses a file that is not allowed, and lets it be removed", () => {
      toDocuments();
      attach(/Документ, удостоверяющий личность/, "virus.exe");
      expect(screen.getByText("virus.exe: допустимы только PDF, JPG, JPEG и PNG")).toBeVisible();
      fireEvent.click(screen.getByRole("button", { name: "Убрать файл: virus.exe" }));
      expect(screen.queryByText(/virus.exe/)).not.toBeInTheDocument();
    });

    it("lets the person go back and keeps what they had entered", () => {
      toDocuments();
      attach(/Документ, удостоверяющий личность/, "id.pdf");
      click("Назад");
      expect(screen.getByLabelText(/^ИИН/)).toHaveValue("900101300123");
      click("Далее");
      expect(screen.getByText(/Приложен: id.pdf/)).toBeVisible();
    });
  });

  describe("review, signing and sending", () => {
    function toReview() {
      renderPage();
      type(/^ИИН/, "900101300123");
      type(/^Номер мобильного телефона/, "8 701 123 45 67");
      click("Далее");
      attach(/Документ, удостоверяющий личность/, "id.pdf");
      attach(/Документ на объект/, "deed.pdf");
      click("Далее");
    }

    it("shows everything entered, hides most of the IIN and lets a step be changed", () => {
      toReview();
      expect(screen.getByRole("heading", { name: "Проверьте заявление" })).toBeVisible();
      expect(screen.getByText("900101••••23")).toBeVisible();
      expect(screen.getByText("+7 701 123 45 67")).toBeVisible();
      expect(screen.getByText(/id.pdf/)).toBeVisible();
      const change = screen.getAllByRole("button", { name: /^Изменить/ });
      fireEvent.click(change.find((button) => button.textContent?.includes("Документы"))!);
      expect(screen.getByRole("heading", { name: "Документы" })).toBeVisible();
    });

    it("downloads the application as a text", () => {
      toReview();
      click("Скачать заявление");
      expect(download).toHaveBeenCalledWith(
        "zayavlenie.txt",
        expect.stringContaining("ИИН: 900101300123"),
      );
    });

    it("needs both consents before it can be signed, and a signature before it can be sent", () => {
      toReview();
      click("Далее");
      expect(screen.getByRole("button", { name: "Отправить поставщику" })).toBeDisabled();
      click("Подписать заявление (демо ЭЦП)");
      expect(screen.getByText("Нужны оба согласия")).toBeVisible();
      expect(stored().signatures.application).toBeUndefined();
    });

    it("shows the text of the contract to read and download", () => {
      toReview();
      click("Далее");
      const region = screen.getByRole("region", { name: "Текст договора для ознакомления" });
      expect(within(region).getByText(/Водоканал Акмолы \(поставщик\)/)).toBeVisible();
      click("Скачать текст договора");
      expect(download).toHaveBeenCalledWith(
        "dogovor.txt",
        expect.stringContaining("Водоканал Акмолы"),
      );
    });

    it("registers the application with a number, but does not call it a contract", () => {
      renderPage();
      fillAndSend();

      expect(stored()).toMatchObject({
        status: "registered",
        number: expect.stringMatching(/^DEMO-DOG-\d{4}-00001$/),
      });
      expect(screen.getAllByText(/DEMO-DOG-\d{4}-00001/).length).toBeGreaterThan(0);
      expect(
        screen.getAllByText("Заявление зарегистрировано", { selector: "span" }).length,
      ).toBeGreaterThan(0);
      expect(screen.getByText(/Это ещё не договор/)).toBeVisible();
      expect(screen.queryByText("Договор заключён")).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Договор" })).not.toBeInTheDocument();
    });

    it("lets the person download the confirmation of submission", () => {
      renderPage();
      fillAndSend();
      click("Скачать подтверждение подачи");
      expect(download).toHaveBeenCalledWith(
        "podtverzhdenie.txt",
        expect.stringContaining("ПОДТВЕРЖДЕНИЕ ПОДАЧИ ЗАЯВЛЕНИЯ"),
      );
    });
  });

  describe("after sending", () => {
    function sent() {
      renderPage();
      fillAndSend();
    }

    it("goes through the provider's steps and shows the history", () => {
      sent();
      click("Принять в работу");
      expect(screen.getByText("Поставщик рассматривает заявление.")).toBeVisible();
      const section = screen.getByRole("heading", { name: "История" }).closest("section")!;
      expect(within(section).getAllByRole("listitem")).toHaveLength(3);
      expect(stored().history.map((entry) => entry.status)).toEqual([
        "draft",
        "registered",
        "under_review",
      ]);
    });

    it("shows the remarks of a returned application and lets it be corrected and sent again under the same number", () => {
      sent();
      const number = stored().number;
      click("Принять в работу");
      click("Вернуть на доработку");
      expect(screen.getByRole("heading", { name: "Замечания поставщика" })).toBeVisible();
      expect(
        screen.getAllByText("Приложите читаемую копию документа на объект.").length,
      ).toBeGreaterThan(0);

      click("Исправить и отправить повторно");
      expect(
        screen.getByRole("heading", { name: "Заявление на заключение договора" }),
      ).toBeVisible();
      type(/^Сведения о предыдущем договоре/, "договор 9");
      click("Далее");
      click("Далее");
      click("Далее");
      // The old signature no longer covers the new text.
      expect(screen.getByRole("button", { name: "Отправить поставщику" })).toBeDisabled();
      // The consents given the first time are still there; only the signature must be renewed.
      expect(screen.getByRole("checkbox", { name: /персональных данных/ })).toBeChecked();
      click("Подписать заявление (демо ЭЦП)");
      click("Отправить поставщику");

      expect(stored()).toMatchObject({
        status: "registered",
        number,
        previousContract: "договор 9",
      });
      expect(stored().remarks).toBeUndefined();
    });

    it("shows the reason of a refusal and ends there", () => {
      sent();
      click("Принять в работу");
      click("Отказать");
      expect(screen.getAllByText("Не выполнены условия подключения.").length).toBeGreaterThan(0);
      expect(screen.getByText("Больше действий нет.")).toBeVisible();
      expect(
        screen.queryByRole("button", { name: "Исправить и отправить повторно" }),
      ).not.toBeInTheDocument();
    });

    it("asks for the signature of the applicant on a contract and concludes only after the provider signs", () => {
      sent();
      click("Принять в работу");
      click("Согласовать и направить договор на подпись");
      expect(screen.getByRole("heading", { name: "Договор" })).toBeVisible();
      expect(screen.queryByText("Договор заключён.")).not.toBeInTheDocument();

      click("Подписать договор (демо ЭЦП)");
      expect(
        screen.getAllByText("Вы подписали договор. Ждём подпись поставщика.").length,
      ).toBeGreaterThan(0);
      expect(screen.queryByText("Договор заключён.")).not.toBeInTheDocument();

      click("Подписать договор за поставщика");
      expect(screen.getAllByText(/Договор заключён\./, { selector: "p" }).length).toBeGreaterThan(
        0,
      );
      expect(screen.getByText(/Подписал: Демо Житель/)).toBeVisible();

      click("Ввести договор в действие");
      expect(screen.getByText(/Действует с/)).toBeVisible();
      expect(stored().status).toBe("active");
    });

    it("sends an inspection back to review without concluding anything", () => {
      sent();
      click("Принять в работу");
      click("Назначить осмотр объекта");
      expect(screen.getByText("Нужен осмотр объекта. Поставщик свяжется с вами.")).toBeVisible();
      expect(screen.queryByRole("heading", { name: "Договор" })).not.toBeInTheDocument();
      click("Принять в работу");
      expect(stored().status).toBe("under_review");
    });
  });

  describe("access", () => {
    it("does not show an application of someone else or an unknown one", () => {
      renderPage("nope");
      expect(
        screen.getByRole("heading", { name: "Такого заявления нет в этом браузере" }),
      ).toBeVisible();
    });

    it("asks a guest to sign in and brings them back to the application", () => {
      window.localStorage.removeItem(SESSION_KEY);
      renderPage();
      expect(screen.getByRole("link", { name: "Войти" })).toHaveAttribute(
        "href",
        "/ru/sign-in?next=%2Fru%2Fcontracts%2Fc-1",
      );
    });
  });
});
