import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_PROFILES, SESSION_KEY } from "@/features/session/domain/session";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { ToastProvider } from "@/shared/ui/toast/toast-provider";
import { createProperty, type Property } from "../domain/property";
import { PROPERTIES_KEY, parseProperties } from "../domain/storage";
import { PropertyDetail } from "./property-detail";

const territories = [{ id: "kokshetau", name: "Кокшетау" }];
const providers = [
  {
    id: "akmola-water",
    name: "Водоканал Акмолы",
    sector: "water" as const,
    territories: "all" as const,
  },
];

function seed(ownerId = "demo-resident"): Property {
  const property = createProperty(
    {
      territoryId: "kokshetau",
      locality: "Кокшетау",
      street: "улица Абая",
      house: "10",
      flat: "5",
      type: "apartment",
      relation: "owner",
      personalAccount: "12345678",
      ownerInfo: "Демо Житель",
    },
    "p-1",
    ownerId,
    new Date("2026-10-21T06:00:00Z"),
  );
  window.localStorage.setItem(PROPERTIES_KEY, JSON.stringify([property]));
  return property;
}

const stored = () => parseProperties(window.localStorage.getItem(PROPERTIES_KEY))[0];

function renderDetail(id = "p-1") {
  return render(
    <ToastProvider>
      <PropertyDetail
        lang="ru"
        id={id}
        labels={ru.properties}
        territories={territories}
        providers={providers}
        missing={{}}
      />
    </ToastProvider>,
  );
}

const pick = (...files: File[]) =>
  fireEvent.change(screen.getByLabelText(/Выбрать файлы/), { target: { files } });
const pdf = (name = "deed.pdf", size = 1000) =>
  new File([new Uint8Array(size)], name, { type: "application/pdf" });

describe("PropertyDetail", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_PROFILES.resident));
  });

  it("shows the object with its address and status", () => {
    seed();
    renderDetail();
    expect(
      screen.getByRole("heading", { level: 1, name: "Кокшетау, улица Абая, 10, кв. 5" }),
    ).toBeVisible();
    expect(screen.getAllByText("Не подтверждён").length).toBeGreaterThan(0);
    expect(screen.getByText("12345678")).toBeVisible();
  });

  it("confirms through the state service at once", () => {
    seed();
    renderDetail();
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить через госсервис" }));
    expect(stored().verification).toMatchObject({
      status: "confirmed",
      method: "state_integration",
    });
    expect(screen.getByRole("heading", { name: "Объект подтверждён" })).toBeVisible();
  });

  it("does not send without a document and says so", () => {
    seed();
    renderDetail();
    fireEvent.click(screen.getByRole("button", { name: "Отправить на проверку" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Добавьте хотя бы один документ");
    expect(stored().verification.status).toBe("unverified");
  });

  it("names a file that is not allowed and does not send it", () => {
    seed();
    renderDetail();
    pick(new File(["x"], "virus.exe"));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "virus.exe: допустимы только PDF, JPG, JPEG и PNG",
    );
    fireEvent.click(screen.getByRole("button", { name: "Отправить на проверку" }));
    expect(stored().verification.status).toBe("unverified");
  });

  it("refuses a file over the limit and an empty file", () => {
    seed();
    renderDetail();
    pick(pdf("big.pdf", 5 * 1024 * 1024 + 1), new File([], "empty.pdf"));
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("big.pdf: файл больше 5 МБ");
    expect(alert).toHaveTextContent("empty.pdf: файл пустой");
  });

  it("lets a wrong file be removed and then sends the rest for checking", () => {
    seed();
    renderDetail();
    pick(pdf("deed.pdf"), new File(["x"], "virus.exe"));
    fireEvent.click(screen.getByRole("button", { name: "Убрать virus.exe" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Отправить на проверку" }));
    expect(stored().verification).toMatchObject({
      status: "pending_check",
      documents: [{ name: "deed.pdf", size: 1000 }],
    });
    expect(screen.getByRole("heading", { name: "Документы на проверке" })).toBeVisible();
    expect(screen.getByText("deed.pdf")).toBeVisible();
  });

  it("allows no more than five files", () => {
    seed();
    renderDetail();
    pick(...Array.from({ length: 6 }, (_, index) => pdf(`${index}.pdf`)));
    expect(screen.getByRole("alert")).toHaveTextContent("Не больше 5 файлов");
  });

  it("lets the demo employee confirm what waits for a decision", () => {
    seed();
    renderDetail();
    pick(pdf());
    fireEvent.click(screen.getByRole("button", { name: "Отправить на проверку" }));
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить объект" }));
    expect(stored().verification.status).toBe("confirmed");
  });

  it("shows the reason of a rejection and offers to try again", () => {
    seed();
    renderDetail();
    pick(pdf());
    fireEvent.click(screen.getByRole("button", { name: "Отправить на проверку" }));
    fireEvent.click(screen.getByRole("button", { name: "Отклонить объект" }));

    expect(screen.getByRole("heading", { name: "Объект отклонён" })).toBeVisible();
    expect(screen.getByText(/Документы не читаются/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Подтвердить через госсервис" })).toBeVisible();
  });

  it("does not show an object of someone else", () => {
    seed("another-user");
    renderDetail();
    expect(
      screen.getByRole("heading", { name: "Такого объекта нет в этом браузере" }),
    ).toBeVisible();
  });

  it("does not show an unknown object", () => {
    renderDetail("nope");
    expect(
      screen.getByRole("heading", { name: "Такого объекта нет в этом браузере" }),
    ).toBeVisible();
  });

  it("asks a guest to sign in and brings them back to the object", () => {
    seed();
    window.localStorage.removeItem(SESSION_KEY);
    renderDetail();
    expect(screen.getByRole("link", { name: "Войти" })).toHaveAttribute(
      "href",
      "/ru/sign-in?next=%2Fru%2Fproperties%2Fp-1",
    );
  });
});
