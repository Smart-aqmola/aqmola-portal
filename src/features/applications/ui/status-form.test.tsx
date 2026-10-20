import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import ru from "@/shared/i18n/dictionaries/ru.json";
import { createApplication } from "../domain/application";
import { APPLICATIONS_KEY, parseApplications } from "../domain/storage";
import { StatusForm } from "./status-form";

const application = createApplication({
  serviceSlug: "gas-contract",
  serviceTitle: "Договор на газ",
  organizationId: "org-1",
  ownerRole: "resident",
  ownerName: "Демо Житель",
  form: {
    territoryId: "kokshetau",
    address: "ул. Тестовая, 1",
    attached: [],
    comment: "",
    consent: true,
  },
  number: "DEMO-2026-00001",
  now: new Date("2026-10-20T09:00:00Z"),
});

const labels = ru.operator.change;

describe("StatusForm", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(APPLICATIONS_KEY, JSON.stringify([application]));
  });

  it("offers only the moves the rules allow", () => {
    render(<StatusForm application={application} labels={labels} />);
    expect(screen.getByRole("button", { name: "Взять в работу" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Отклонить" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Отметить исполненной" })).toBeNull();
  });

  it("saves the new status with the note", () => {
    render(<StatusForm application={application} labels={labels} />);
    fireEvent.change(screen.getByLabelText(/Комментарий для заявителя/), {
      target: { value: "Принято" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Взять в работу" }));

    const [saved] = parseApplications(window.localStorage.getItem(APPLICATIONS_KEY));
    expect(saved.status).toBe("in_progress");
    expect(saved.version).toBe(2);
    expect(saved.history.at(-1)).toMatchObject({ status: "in_progress", note: "Принято" });
    expect(screen.getByRole("status")).toHaveTextContent("Статус изменён");
  });

  it("says a closed application cannot change", () => {
    render(<StatusForm application={{ ...application, status: "done" }} labels={labels} />);
    expect(screen.getByText(/Заявка закрыта/)).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
