import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createProperty,
  requestVerification,
  type Property,
} from "@/features/account/domain/property";
import { PROPERTIES_KEY } from "@/features/account/domain/storage";
import { DEMO_PROFILES, SESSION_KEY, operatorSession } from "@/features/session/domain/session";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { READ_KEY } from "../domain/read-state";
import type { AppNotification } from "../domain/notifications";
import { NotificationBell } from "./notification-bell";
import { notificationText } from "./notification-text";
import { NotificationsPage } from "./notifications-page";

const now = new Date();

function property(): Property {
  const made = createProperty(
    {
      territoryId: "atbasar",
      locality: "Мариновка",
      street: "улица Центральная",
      house: "1",
      flat: "",
      type: "house",
      relation: "owner",
      personalAccount: "",
      ownerInfo: "Демо Житель",
    },
    "p-1",
    "demo-resident",
    now,
  );
  const result = requestVerification(made, { method: "state_integration" }, now);
  if (!result.ok) throw new Error("setup failed");
  return result.property;
}

const signIn = () =>
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_PROFILES.resident));
const seedProperty = () =>
  window.localStorage.setItem(PROPERTIES_KEY, JSON.stringify([property()]));
const bellLabels = ru.notifications.bell;

beforeEach(() => {
  window.localStorage.clear();
});

describe("notificationText", () => {
  const item = (patch: Partial<AppNotification>): AppNotification => ({
    id: "x",
    event: "reading_rejected",
    at: "2026-10-21T06:00:00.000Z",
    path: "/meters/history",
    refs: {},
    channel: "cabinet",
    delivery: "delivered",
    ...patch,
  });

  it("writes the note after the sentence and leaves no gap when there is none", () => {
    expect(
      notificationText(item({ number: "DEMO-POK-2026-00001", note: "Фото нечёткое" }), ru, "ru"),
    ).toBe("Показания DEMO-POK-2026-00001 отклонены. Фото нечёткое");
    expect(notificationText(item({ number: "DEMO-POK-2026-00001" }), ru, "ru")).toBe(
      "Показания DEMO-POK-2026-00001 отклонены.",
    );
  });

  it("names a status in the dictionary of the thing it belongs to", () => {
    const text = notificationText(
      item({
        event: "payment_status",
        number: "DEMO-PAY-2026-00001",
        refs: { scope: "payment", status: "declined" },
      }),
      ru,
      "ru",
    );
    expect(text).toBe("Статус платежа DEMO-PAY-2026-00001: Отклонён.");
  });

  it("writes the kind of a request, the time of a visit and a meter in words", () => {
    expect(
      notificationText(
        item({
          event: "meter_request_scheduled",
          number: "DEMO-ZPR-2026-00001",
          title: "replacement",
          assignee: "Сергеев А.",
          refs: { slot: { date: "2026-10-25", time: "morning" } },
        }),
        ru,
        "ru",
      ),
    ).toBe(
      "По заявке DEMO-ZPR-2026-00001 назначено время: 25 октября 2026, Утро, 9:00–12:00. Специалист: Сергеев А.",
    );
    expect(
      notificationText(
        item({ event: "reading_due", refs: { resource: "gas", serial: "GZ-1" } }),
        ru,
        "ru",
      ),
    ).toBe("Пора передать показания: Газ, № GZ-1.");
  });

  it("writes the same event in Kazakh", () => {
    expect(
      notificationText(
        item({ event: "reading_registered", number: "X-1" }),
        {
          ...ru,
          notifications: {
            ...ru.notifications,
            events: {
              ...ru.notifications.events,
              reading_registered: "{number} көрсеткіші тіркелді.",
            },
          },
        },
        "kk",
      ),
    ).toBe("X-1 көрсеткіші тіркелді.");
  });
});

describe("NotificationBell", () => {
  it("is not there for a guest or for an operator", () => {
    const { container, rerender } = render(<NotificationBell lang="ru" labels={bellLabels} />);
    expect(container).toBeEmptyDOMElement();
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(operatorSession("akmola-gas")));
    rerender(<NotificationBell lang="ru" labels={bellLabels} />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("shows how many notices are new and leads to the page", () => {
    signIn();
    seedProperty();
    render(<NotificationBell lang="ru" labels={bellLabels} />);
    const link = screen.getByRole("link", { name: "Уведомления, непрочитанных: 2" });
    expect(link).toHaveAttribute("href", "/ru/notifications");
    expect(link).toHaveTextContent("2");
  });

  it("has no number once everything is read", () => {
    signIn();
    seedProperty();
    window.localStorage.setItem(
      READ_KEY,
      JSON.stringify({ "demo-resident": new Date(Date.now() + 60_000).toISOString() }),
    );
    render(<NotificationBell lang="ru" labels={bellLabels} />);
    expect(screen.getByRole("link", { name: "Уведомления" })).not.toHaveTextContent(/\d/);
  });
});

describe("NotificationsPage", () => {
  const page = () => render(<NotificationsPage lang="ru" dict={ru} />);

  it("asks a guest to sign in and brings them back", () => {
    page();
    expect(screen.getByRole("link", { name: "Войти" })).toHaveAttribute(
      "href",
      "/ru/sign-in?next=%2Fru%2Fnotifications",
    );
  });

  it("says there is nothing yet", () => {
    signIn();
    page();
    expect(
      screen.getByRole("heading", {
        name: "Уведомления пока нет".replace("Уведомления пока нет", "Уведомлений пока нет"),
      }),
    ).toBeVisible();
  });

  it("lists what happened with the date, the channel and the result of delivery (16.3)", () => {
    signIn();
    seedProperty();
    page();
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(2);
    expect(
      within(cards[0]).getByText(/Объект подтверждён: Мариновка, улица Центральная, 1/),
    ).toBeVisible();
    expect(within(cards[0]).getByText(/Способ: В кабинете/)).toBeVisible();
    expect(within(cards[0]).getByText(/Доставка: Доставлено/)).toBeVisible();
    expect(within(cards[0]).getByRole("link", { name: /Открыть/ })).toHaveAttribute(
      "href",
      "/ru/properties/p-1",
    );
    expect(within(cards[0]).getByText("Новое")).toBeVisible();
  });

  it("marks everything as read, and the filter keeps only the new ones", () => {
    signIn();
    seedProperty();
    page();
    expect(screen.getByLabelText(/^Показать/).querySelectorAll("option")[1]).toHaveTextContent(
      "Непрочитанные (2)",
    );
    fireEvent.click(screen.getByRole("button", { name: "Отметить все прочитанными" }));
    expect(screen.queryByText("Новое")).toBeNull();
    expect(screen.getByRole("button", { name: "Отметить все прочитанными" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/^Показать/), { target: { value: "unread" } });
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.getByText("Найдено: 0")).toBeVisible();
  });

  it("does not show the notices of someone else", () => {
    signIn();
    window.localStorage.setItem(
      PROPERTIES_KEY,
      JSON.stringify([{ ...property(), ownerId: "someone-else" }]),
    );
    page();
    expect(screen.getByRole("heading", { name: "Уведомлений пока нет" })).toBeVisible();
  });
});
