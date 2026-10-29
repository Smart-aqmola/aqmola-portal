import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProperty,
  requestVerification,
  type Property,
} from "@/features/account/domain/property";
import { PROPERTIES_KEY } from "@/features/account/domain/storage";
import { DEMO_PROFILES, SESSION_KEY } from "@/features/session/domain/session";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { createMeter, emptyMeterInput, type Meter } from "../domain/meter";
import {
  createRequest,
  emptyRequestInput,
  requestProviderChange,
  type MeterRequest,
} from "../domain/meter-request";
import { submitReading } from "../domain/reading";
import {
  METERS_KEY,
  METER_REQUESTS_KEY,
  READINGS_KEY,
  parseMeterRequests,
  parseMeters,
  parseReadings,
} from "../domain/storage";
import { MyMeters } from "./my-meters";
import { ReadingForm } from "./reading-form";
import { ReadingsHistory } from "./readings-history";
import { RequestDetail } from "./request-detail";
import { RequestForm } from "./request-form";
import { RequestsList } from "./requests-list";

// The cabinet carries the sign-out bar, which needs the app router.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const territories = [{ id: "atbasar", name: "Атбасарский район" }];
const now = new Date();
const base = { lang: "ru", dict: ru, territories } as const;

function property(confirmed = true): Property {
  const made = createProperty(
    {
      territoryId: "atbasar",
      locality: "Мариновка",
      street: "улица Центральная",
      house: "1",
      flat: "",
      type: "house",
      relation: "owner",
      personalAccount: "12345678",
      ownerInfo: "Демо Житель",
    },
    "p-1",
    "demo-resident",
    now,
  );
  if (!confirmed) return made;
  const result = requestVerification(made, { method: "state_integration" }, now);
  if (!result.ok) throw new Error("setup failed");
  return result.property;
}

function meter(patch: Partial<Meter> = {}): Meter {
  return {
    ...createMeter(
      {
        ...emptyMeterInput("12345678"),
        resource: "cold_water",
        type: "mechanical",
        serial: "SN-77",
        installedAt: "2024-05-01",
        initialReading: "120",
        sealedAt: "2024-05-02",
        sealNumber: "P-1",
      },
      {
        id: "m-1",
        ownerId: "demo-resident",
        propertyId: "p-1",
        address: "Мариновка, ул. Центральная, 1",
      },
      now,
    ),
    ...patch,
  };
}

const signIn = () =>
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_PROFILES.resident));
const seedProperties = (...items: Property[]) =>
  window.localStorage.setItem(PROPERTIES_KEY, JSON.stringify(items));
const seedMeters = (...items: Meter[]) =>
  window.localStorage.setItem(METERS_KEY, JSON.stringify(items));
const storedMeters = () => parseMeters(window.localStorage.getItem(METERS_KEY));
const storedReadings = () => parseReadings(window.localStorage.getItem(READINGS_KEY));
const storedRequests = () => parseMeterRequests(window.localStorage.getItem(METER_REQUESTS_KEY));
const choose = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

beforeEach(() => {
  window.localStorage.clear();
  signIn();
  seedProperties(property());
});

describe("MyMeters", () => {
  it("asks a guest to sign in and brings them back", () => {
    window.localStorage.removeItem(SESSION_KEY);
    render(<MyMeters {...base} />);
    expect(screen.getByRole("link", { name: "Войти" })).toHaveAttribute(
      "href",
      "/ru/sign-in?next=%2Fru%2Fmeters",
    );
  });

  it("sends someone without a confirmed object to add one", () => {
    seedProperties(property(false));
    render(<MyMeters {...base} />);
    expect(screen.getByRole("heading", { name: "Нужен подтверждённый объект" })).toBeVisible();
  });

  it("shows ten parts in the menu of the section", () => {
    render(<MyMeters {...base} />);
    const nav = screen.getByRole("navigation", { name: "Разделы счётчиков" });
    expect(within(nav).getAllByRole("link")).toHaveLength(10);
    expect(within(nav).getByRole("link", { name: "Мои счётчики" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Замена счётчика" })).toHaveAttribute(
      "href",
      "/ru/meters/order/replacement",
    );
  });

  it("adds a meter through the form and shows its card", () => {
    render(<MyMeters {...base} />);
    expect(screen.getByRole("heading", { name: "Приборов пока нет" })).toBeVisible();
    click("Добавить прибор");
    choose(/^Вид ресурса/, "cold_water");
    choose(/^Тип прибора/, "mechanical");
    choose(/^Заводской номер/, "SN-77");
    choose(/^Дата установки/, "2024-05-01");
    choose(/^Показания на сегодня/, "120");
    click("Добавить прибор");

    expect(storedMeters()).toHaveLength(1);
    expect(storedMeters()[0]).toMatchObject({
      serial: "SN-77",
      propertyId: "p-1",
      ownerId: "demo-resident",
      personalAccount: "12345678",
      state: "working",
    });
    const card = screen.getByRole("article", { name: "Холодная вода, № SN-77" });
    // The reading typed "for today" belongs to the day the meter was added, not to its installation.
    const today = new Date().toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    expect(within(card).getByText("Предыдущие показания").nextElementSibling).toHaveTextContent(
      `120 · ${today.replace(" г.", "")}`,
    );
  });

  it("explains what is missing and stores nothing", () => {
    render(<MyMeters {...base} />);
    click("Добавить прибор");
    click("Добавить прибор");
    expect(screen.getAllByText("Заполните поле").length).toBeGreaterThanOrEqual(3);
    expect(storedMeters()).toEqual([]);
  });

  it("writes a dash or a note where the card has nothing to say", () => {
    seedMeters(meter({ sealNumber: "", sealedAt: "" }));
    render(<MyMeters {...base} />);
    const card = screen.getByRole("article", { name: /SN-77/ });
    expect(within(card).getByText("Пломба").nextElementSibling).toHaveTextContent("Нет пломбы");
    expect(
      within(card).getByText("Последняя передача показаний").nextElementSibling,
    ).toHaveTextContent("Показаний ещё не было");
    expect(
      within(card).getByText("Дата ввода в эксплуатацию").nextElementSibling,
    ).toHaveTextContent("—");
  });

  it("does not offer readings for a meter that was replaced", () => {
    seedMeters(meter({ state: "replaced" }));
    render(<MyMeters {...base} />);
    expect(
      screen.getByText("Прибор снят с учёта: показания по нему не принимаются."),
    ).toBeVisible();
    const card = screen.getByRole("article", { name: /SN-77/ });
    expect(within(card).queryByRole("link")).toBeNull();
  });

  it("does not show the meters of someone else", () => {
    seedMeters({ ...meter(), ownerId: "someone-else" });
    render(<MyMeters {...base} />);
    expect(screen.getByRole("heading", { name: "Приборов пока нет" })).toBeVisible();
  });
});

describe("ReadingForm", () => {
  const form = (id = "m-1") => render(<ReadingForm {...base} preset={{ meter: id }} />);
  const fill = (value: string) => {
    choose(/^Текущие показания/, value);
    fireEvent.click(screen.getByLabelText(/достоверны/));
  };

  it("starts with the object, the service and the meter already chosen when it knows the meter", () => {
    seedMeters(meter());
    form();
    expect(screen.getByLabelText(/^Объект/)).toHaveValue("p-1");
    expect(screen.getByLabelText(/^Коммунальная услуга/)).toHaveValue("cold_water");
    expect(screen.getByLabelText(/^Прибор учёта/)).toHaveValue("m-1");
    expect(screen.getByText("Предыдущие показания").nextElementSibling).toHaveTextContent("120");
  });

  it("sends a reading, gives it a number and says it is not counted yet", () => {
    seedMeters(meter());
    form();
    fill("130");
    click("Отправить показания");

    expect(screen.getByRole("heading", { name: "Показания отправлены" })).toBeVisible();
    const [reading] = storedReadings();
    expect(reading).toMatchObject({ value: 130, previousValue: 120, status: "registered" });
    expect(reading.number).toMatch(/^DEMO-POK-\d{4}-00001$/);
    expect(screen.getByText(`Номер: ${reading.number}`)).toBeVisible();
  });

  it("explains a wrong value and does not send it", () => {
    seedMeters(meter());
    form();
    fill("12a");
    click("Отправить показания");
    expect(screen.getByText("Введите число, например 1234 или 1234,5")).toBeVisible();
    expect(storedReadings()).toEqual([]);
  });

  it("asks for confirmation when the reading went down and sends it for a check", () => {
    seedMeters(meter());
    form();
    fill("90");
    click("Отправить показания");
    expect(screen.getByRole("heading", { name: "Показания меньше предыдущих" })).toBeVisible();
    expect(storedReadings()).toEqual([]);

    fireEvent.click(screen.getByLabelText(/Подтверждаю: показания уменьшились/));
    click("Отправить показания");
    expect(storedReadings()[0].status).toBe("awaiting_check");
    expect(screen.getByText("Показания уменьшились, поставщик проверит их вручную.")).toBeVisible();
  });

  it("asks for a photo where the provider wants one and takes only a picture", () => {
    seedMeters(meter({ resource: "gas" }));
    form();
    fill("130");
    click("Отправить показания");
    expect(screen.getByText("Приложите фото прибора")).toBeVisible();

    const gallery = screen.getByLabelText("Выбрать из галереи", { selector: "input" });
    fireEvent.change(gallery, { target: { files: [new File(["x"], "doc.pdf")] } });
    expect(screen.getByText(/Файл «doc.pdf» не подходит/)).toBeVisible();

    fireEvent.change(gallery, { target: { files: [new File(["xx"], "meter.jpg")] } });
    expect(screen.getByText(/Фото: meter.jpg/)).toBeVisible();
    click("Отправить показания");
    expect(storedReadings()[0].photo).toEqual({ name: "meter.jpg", size: 2 });
  });

  it("offers a value read from the photo and takes it only when told to (demo)", () => {
    seedMeters(meter({ decimals: 1 }));
    form();
    fireEvent.change(screen.getByLabelText("Сфотографировать", { selector: "input" }), {
      target: { files: [new File(["x"], "meter.jpg")] },
    });
    expect(screen.getByText(/На фото распознано значение 132,5/)).toBeVisible();
    expect(screen.getByLabelText(/^Текущие показания/)).toHaveValue("");
    click("Подставить значение");
    expect(screen.getByLabelText(/^Текущие показания/)).toHaveValue("132,5");
  });

  it("wants the confirmation that the data is true", () => {
    seedMeters(meter());
    form();
    choose(/^Текущие показания/, "130");
    click("Отправить показания");
    expect(screen.getByText("Подтвердите достоверность сведений")).toBeVisible();
    expect(storedReadings()).toEqual([]);
  });

  it("lets only the services of the chosen object be chosen", () => {
    seedMeters(meter(), meter({ id: "m-2", serial: "SN-88", resource: "gas" }));
    render(<ReadingForm {...base} preset={{}} />);
    expect(screen.getByLabelText(/^Объект/)).toHaveValue("p-1");
    const services = Array.from(
      screen.getByLabelText(/^Коммунальная услуга/).querySelectorAll("option"),
    ).map((option) => option.textContent);
    expect(services).toEqual(["Выберите услугу", "Холодная вода", "Газ"]);
  });
});

describe("history of readings", () => {
  function reading() {
    const result = submitReading(
      meter(),
      [],
      {
        valueText: "130",
        readingDate: now.toISOString().slice(0, 10),
        authentic: true,
        decreaseConfirmed: false,
      },
      { id: "r-1", ownerId: "demo-resident" },
      now,
    );
    if (!result.ok) throw new Error("setup failed");
    return result.reading;
  }

  it("says that a sent reading is not counted yet and lets the provider decide (demo)", () => {
    seedMeters(meter());
    window.localStorage.setItem(READINGS_KEY, JSON.stringify([reading()]));
    render(<ReadingsHistory {...base} />);
    const card = screen.getByRole("article", { name: /DEMO-POK/ });
    expect(within(card).getByText("Отправлено, но пока не принято поставщиком")).toBeVisible();

    fireEvent.change(within(card).getByLabelText("Действие"), { target: { value: "accepted" } });
    fireEvent.click(within(card).getByRole("button", { name: "Применить" }));
    expect(storedReadings()[0].status).toBe("accepted");
    expect(
      within(card).getByText("Принято поставщиком, ещё не учтено в начислениях"),
    ).toBeVisible();
  });

  it("needs a reason from the provider to reject and shows it to the person", () => {
    seedMeters(meter());
    window.localStorage.setItem(READINGS_KEY, JSON.stringify([reading()]));
    render(<ReadingsHistory {...base} />);
    const card = screen.getByRole("article", { name: /DEMO-POK/ });
    fireEvent.change(within(card).getByLabelText("Действие"), { target: { value: "rejected" } });
    fireEvent.change(within(card).getByLabelText(/^Комментарий поставщика/), {
      target: { value: "" },
    });
    fireEvent.click(within(card).getByRole("button", { name: "Применить" }));
    // The panel is a closed <details> until someone opens it, so only its presence is checked.
    expect(
      within(card).getByText("Укажите комментарий: человек должен знать причину"),
    ).toBeInTheDocument();
    expect(storedReadings()[0].status).toBe("registered");

    fireEvent.change(within(card).getByLabelText(/^Комментарий поставщика/), {
      target: { value: "Фото нечёткое" },
    });
    fireEvent.click(within(card).getByRole("button", { name: "Применить" }));
    expect(storedReadings()[0]).toMatchObject({
      status: "rejected",
      providerNote: "Фото нечёткое",
    });
  });

  it("invites to send the first reading when there is none", () => {
    render(<ReadingsHistory {...base} />);
    expect(screen.getByRole("heading", { name: "Показаний пока нет" })).toBeVisible();
  });
});

describe("RequestForm", () => {
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  it("asks for what is special to this kind and sends the request", () => {
    seedMeters(meter());
    render(<RequestForm {...base} kind="fault" preset={{ meter: "m-1" }} />);
    expect(screen.getByRole("heading", { name: "Неисправность счётчика" })).toBeVisible();

    choose(/^Причина/, "no_display");
    choose(/^Сведения о неисправности/, "Нет изображения");
    choose(/^Дата 1/, tomorrow);
    choose(/^Контактный телефон/, "+7 701 123 45 67");
    click("Отправить заявку");

    expect(screen.getByRole("heading", { name: "Заявка отправлена" })).toBeVisible();
    const [request] = storedRequests();
    expect(request).toMatchObject({
      kind: "fault",
      meterId: "m-1",
      reason: "no_display",
      status: "registered",
      contactPhone: "+77011234567",
    });
    expect(request.number).toMatch(/^DEMO-ZPR-\d{4}-00001$/);
    expect(request.slots).toEqual([{ date: tomorrow, time: "morning" }]);
  });

  it("points at every missing field and stores nothing", () => {
    seedMeters(meter());
    render(<RequestForm {...base} kind="replacement" preset={{ meter: "m-1" }} />);
    click("Отправить заявку");
    expect(screen.getByText("Укажите причину")).toBeVisible();
    expect(screen.getByText("Укажите хотя бы одну дату визита")).toBeVisible();
    expect(screen.getByText("Укажите контактный телефон")).toBeVisible();
    expect(screen.getByText("Введите показания")).toBeVisible();
    expect(storedRequests()).toEqual([]);
  });

  it("fills in the dates the card of the meter already knows", () => {
    seedMeters(meter({ lastVerifiedAt: "2023-01-10", nextVerificationAt: "2029-01-10" }));
    render(<RequestForm {...base} kind="verification" preset={{}} />);
    choose(/^Коммунальная услуга/, "cold_water");
    choose(/^Прибор учёта/, "m-1");
    expect(screen.getByLabelText(/^Дата предыдущей поверки/)).toHaveValue("2023-01-10");
    expect(screen.getByLabelText(/^Срок следующей поверки/)).toHaveValue("2029-01-10");
  });

  it("allows a new meter to be ordered where there is none", () => {
    render(<RequestForm {...base} kind="installation" preset={{}} />);
    const services = screen.getByLabelText(/^Коммунальная услуга/);
    expect(within(services).getByRole("option", { name: "Газ" })).toBeInTheDocument();
  });

  it("adds variants of the visit up to three", () => {
    seedMeters(meter());
    render(<RequestForm {...base} kind="fault" preset={{ meter: "m-1" }} />);
    click("Добавить ещё вариант");
    click("Добавить ещё вариант");
    expect(screen.getByLabelText(/^Дата 3/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Добавить ещё вариант" })).toBeNull();
    click("Убрать вариант 3");
    expect(screen.queryByLabelText(/^Дата 3/)).toBeNull();
  });
});

describe("requests and their page", () => {
  function request(kind: "fault" | "replacement" = "fault"): MeterRequest {
    return createRequest(
      {
        ...emptyRequestInput(kind, "+77011234567"),
        propertyId: "p-1",
        resource: "cold_water",
        meterId: "m-1",
        reason: kind === "fault" ? "no_display" : "broken",
        details: { faultInfo: "Нет изображения" },
        currentReading: "150",
        slots: [{ date: "2099-01-05", time: "day" }],
      },
      { id: "q-1", ownerId: "demo-resident", address: "Мариновка, ул. Центральная, 1" },
      [],
      now,
    );
  }
  const seedRequests = (...items: MeterRequest[]) =>
    window.localStorage.setItem(METER_REQUESTS_KEY, JSON.stringify(items));

  it("lists the requests with their status and filters them", () => {
    seedMeters(meter());
    seedRequests(request(), {
      ...request("replacement"),
      id: "q-2",
      number: "DEMO-ZPR-2026-00002",
    });
    render(<RequestsList {...base} />);
    expect(screen.getAllByRole("article")).toHaveLength(2);
    choose(/^Вид заявки/, "fault");
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("Найдено: 1")).toBeVisible();
  });

  it("says when the request is not found", () => {
    seedMeters(meter());
    render(<RequestDetail {...base} id="nope" />);
    expect(screen.getByRole("heading", { name: "Заявка не найдена" })).toBeVisible();
  });

  it("walks a request through the provider steps and keeps the history", () => {
    seedMeters(meter());
    seedRequests(request());
    render(<RequestDetail {...base} id="q-1" />);
    expect(screen.getByText("Заявка зарегистрирована и передана поставщику.")).toBeVisible();

    choose(/^Действие/, "in_progress");
    click("Применить");
    expect(storedRequests()[0].status).toBe("in_progress");

    choose(/^Действие/, "scheduled");
    click("Применить");
    const planned = storedRequests()[0];
    expect(planned).toMatchObject({
      status: "scheduled",
      scheduled: { date: "2099-01-05", time: "day" },
    });
    expect(planned.assignee).toBe("Сергеев А. К.");
    expect(screen.getByText("Назначены дата и специалист.")).toBeVisible();
  });

  it("needs a reason to reject", () => {
    seedMeters(meter());
    seedRequests(request());
    render(<RequestDetail {...base} id="q-1" />);
    choose(/^Действие/, "rejected");
    fireEvent.change(screen.getByLabelText(/^Комментарий или причина/), { target: { value: " " } });
    click("Применить");
    expect(screen.getByText("Укажите причину или комментарий")).toBeVisible();
    expect(storedRequests()[0].status).toBe("registered");
  });

  it("closes a replacement: the old meter is history and a new one starts, and the act can be downloaded", () => {
    seedMeters(meter());
    let current = request("replacement");
    for (const [to, extra] of [
      ["in_progress", {}],
      ["scheduled", { slot: { date: "2099-01-05", time: "day" as const }, assignee: "Сергеев А." }],
    ] as const) {
      const step = requestProviderChange(current, to, now, extra);
      if (!step.ok) throw new Error(step.reason);
      current = step.request;
    }
    seedRequests(current);
    render(<RequestDetail {...base} id="q-1" />);

    choose(/^Действие/, "done");
    click("Применить");

    const meters = storedMeters();
    expect(meters).toHaveLength(2);
    expect(meters.find((item) => item.id === "m-1")?.state).toBe("replaced");
    const fresh = meters.find((item) => item.id !== "m-1");
    expect(fresh).toMatchObject({
      state: "working",
      personalAccount: "12345678",
      initialReading: 0,
    });
    expect(storedRequests()[0].status).toBe("done");
    expect(screen.getByText("Работы выполнены, заявка закрыта. Акт можно скачать.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Скачать акт" })).toBeVisible();
    expect(screen.getByText("Заявка закрыта, действий больше нет.")).toBeVisible();
  });
});
