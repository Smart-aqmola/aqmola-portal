import { describe, expect, it } from "vitest";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { createDraft, type ContractApplication } from "../domain/contract";
import {
  applicationFileText,
  contractFileText,
  fileSize,
  formatStamp,
  receiptText,
} from "./contract-texts";

const base: ContractApplication = {
  ...createDraft(
    {
      propertyId: "p-1",
      sector: "heat",
      serviceSlug: "heat-contract",
      serviceTitle: "Заключение договора на теплоснабжение",
      providerId: "akmola-heat",
      providerName: "Теплосети Акмолы",
      applicant: {
        lastName: "Иванов",
        firstName: "Иван",
        middleName: "Иванович",
        iin: "900101300123",
        phone: "+77011234567",
        email: "",
      },
      address: "Кокшетау, улица Абая, 10, кв. 5",
      propertyType: "apartment",
      basis: "owner",
      personalAccount: "12345678",
    },
    "c-1",
    "u-1",
    new Date("2026-10-21T06:00:00Z"),
  ),
  number: "DEMO-DOG-2026-00001",
  submittedAt: "2026-10-21T06:05:00.000Z",
  attachments: [{ key: "identity", name: "id.pdf", size: 1000 }],
};

describe("formatStamp and fileSize", () => {
  it("writes the time in UTC so the day does not shift", () => {
    expect(formatStamp("2026-10-21T06:05:00.000Z", "ru")).toBe("21 октября 2026, 06:05 UTC");
  });

  it("writes sizes with the unit of the dictionary", () => {
    expect(fileSize(2048, ru)).toBe("2 КБ");
    expect(fileSize(3 * 1024 * 1024, ru)).toBe("3 МБ");
  });
});

describe("applicationFileText", () => {
  it("lists the fields of the application the way the specification names them (4.5)", () => {
    const text = applicationFileText(base, ru, "ru");
    for (const expected of [
      "ЗАЯВЛЕНИЕ НА ЗАКЛЮЧЕНИЕ ДОГОВОРА",
      "Номер заявления: DEMO-DOG-2026-00001",
      "Фамилия: Иванов",
      "Отчество (если есть): Иванович",
      "ИИН: 900101300123",
      "Адрес объекта: Кокшетау, улица Абая, 10, кв. 5",
      "Тип объекта: Квартира",
      "Основание пользования: Собственник",
      "Лицевой счёт (если есть): 12345678",
      "Прибор учёта: Нет",
      "Способ получения уведомлений: В личном кабинете",
      "- Документ, удостоверяющий личность: id.pdf",
    ]) {
      expect(text, expected).toContain(expected);
    }
  });

  it("says a draft has no number yet and marks empty fields", () => {
    const { number: _number, ...draft } = base;
    void _number;
    const text = applicationFileText({ ...draft, attachments: [] }, ru, "ru");
    expect(text).toContain("Номер заявления: черновик");
    expect(text).toContain("Электронная почта: не указано");
    expect(text).toContain("- не указано");
  });

  it("writes the meter when there is one", () => {
    const text = applicationFileText(
      { ...base, meter: { has: true, serial: "SN-1", reading: "120" } },
      ru,
      "ru",
    );
    expect(text).toContain("Прибор учёта: SN-1, 120");
  });
});

describe("receiptText", () => {
  it("gives the number and the time of registration and warns that this is not a contract", () => {
    const text = receiptText(base, ru, "ru");
    expect(text).toContain("ПОДТВЕРЖДЕНИЕ ПОДАЧИ ЗАЯВЛЕНИЯ");
    expect(text).toContain("Номер заявления: DEMO-DOG-2026-00001");
    expect(text).toContain("Зарегистрировано: 21 октября 2026, 06:05 UTC");
    expect(text).toContain("не считается заключённым");
  });
});

describe("contractFileText", () => {
  it("fills the template and adds the signatures that exist", () => {
    const unsigned = contractFileText(base, ru, "ru");
    expect(unsigned).toContain("ДОГОВОР № DEMO-DOG-2026-00001");
    expect(unsigned).toContain("Теплосети Акмолы (поставщик) и Иванов Иван Иванович (абонент)");
    expect(unsigned).not.toContain("Подписал:");

    const signed = contractFileText(
      {
        ...base,
        signatures: {
          contractApplicant: {
            name: "Иванов Иван",
            at: "2026-10-22T07:00:00.000Z",
            method: "demo_ecp",
          },
        },
      },
      ru,
      "ru",
    );
    expect(signed).toContain("Подписал: Иванов Иван, 22 октября 2026, 07:00 UTC");
  });
});
